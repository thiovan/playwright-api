/**
 * BullMQ Queue System
 *
 * Producer: adds workflow jobs to the queue
 * Worker: processes jobs, runs executor, and delivers results via webhook
 */

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const config = require('./config');
const { executeWorkflow } = require('./executor');
const history = require('./history');

// ── Redis connection options ──────────────────────────────────────────────────
const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  tls: config.redis.tls,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
};

// ── Producer ──────────────────────────────────────────────────────────────────
const workflowQueue = new Queue(config.queueName, { connection });

/**
 * Add a workflow job to the queue.
 * @param {string} reqId - The request ID for tracking
 * @param {object} payload - The full validated JSON payload
 * @returns {Promise<object>} - { jobId }
 */
async function addJob(reqId, payload) {
  const job = await workflowQueue.add('execute-workflow', { reqId, payload }, {
    attempts: 1,            // No auto-retry for browser workflows
    removeOnComplete: 100,  // Keep last 100 completed jobs
    removeOnFail: 200,      // Keep last 200 failed jobs
  });
  return { jobId: job.id };
}

/**
 * Start the BullMQ worker.
 * Processes jobs concurrently, executes workflows, and sends results to webhook_url.
 * @returns {Worker} - The worker instance (for graceful shutdown)
 */
function startWorker() {
  const worker = new Worker(
    config.queueName,
    async (job) => {
      const { reqId, payload, isScheduled, scheduleId } = job.data;
      const webhookUrl = payload ? payload.webhook_url : null;
      const startTime = Date.now();

      console.log(`[Worker] Processing job ${job.id} (Req: ${reqId})...`);

      if (isScheduled) {
        await history.recordRequest(reqId, payload, 'scheduled').catch(() => {});
      }

      // Execute the workflow
      const result = await executeWorkflow(payload);
      
      // Record result in history
      const duration = Date.now() - startTime;
      await history.completeRequest(reqId, result, duration);

      // Update schedule status if applicable
      if (scheduleId) {
        try {
          const client = new Redis(connection);
          const raw = await client.hget('playwright:schedules', scheduleId);
          if (raw) {
            const sch = JSON.parse(raw);
            sch.lastRunAt = new Date().toISOString();
            sch.lastStatus = result.success ? 'success' : 'failed';
            await client.hset('playwright:schedules', scheduleId, JSON.stringify(sch));
          }
          await client.quit();
        } catch {
          // ignore schedule update error
        }
      }

      // Deliver result to webhook
      if (webhookUrl) {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: job.id,
              reqId,
              ...result,
            }),
            signal: AbortSignal.timeout(config.webhookTimeout),
          });

          if (!response.ok) {
            console.error(
              `[Worker] Webhook delivery failed for job ${job.id}: HTTP ${response.status}`
            );
          } else {
            console.log(`[Worker] Webhook delivered for job ${job.id}`);
          }
        } catch (err) {
          console.error(
            `[Worker] Webhook delivery error for job ${job.id}: ${err.message}`
          );
        }
      }

      return result;
    },
    {
      connection,
      concurrency: config.concurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
    if (job?.data?.reqId) {
      history.completeRequest(job.data.reqId, { success: false, error: err.message }, 0).catch(() => {});
    }
  });

  worker.on('error', (err) => {
    console.error(`[Worker] Worker error: ${err.message}`);
  });

  console.log(
    `[Worker] Started with concurrency=${config.concurrency}, queue="${config.queueName}"`
  );

  return worker;
}

module.exports = { workflowQueue, addJob, startWorker };
