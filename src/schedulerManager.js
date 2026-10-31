/**
 * Scheduler Manager
 * Automates workflow execution using BullMQ repeatable jobs & Cron patterns.
 */

const crypto = require('crypto');
const { Queue } = require('bullmq');
const Redis = require('ioredis');
const config = require('./config');
const templateManager = require('./templateManager');

const REDIS_SCHEDULES_KEY = 'playwright:schedules';
let redisClient = null;
let workflowQueue = null;

function getClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      tls: config.redis.tls,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    redisClient.connect().catch((err) => {
      console.warn('[SchedulerManager] Redis connection warning:', err.message);
    });
  }
  return redisClient;
}

function getQueue() {
  if (!workflowQueue) {
    workflowQueue = new Queue(config.queueName, {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        tls: config.redis.tls,
        maxRetriesPerRequest: null,
      },
    });
  }
  return workflowQueue;
}

/**
 * Register a schedule with BullMQ repeatable job
 */
async function registerRepeatableJob(schedule) {
  const queue = getQueue();
  const jobKey = `schedule:${schedule.id}`;

  // Remove existing repeatable job with this key first
  await unregisterRepeatableJob(schedule.id);

  if (!schedule.active) return;

  const repeatOpts = {};
  if (schedule.cron) {
    repeatOpts.pattern = schedule.cron;
  } else if (schedule.every) {
    repeatOpts.every = parseInt(schedule.every, 10);
  } else {
    repeatOpts.every = 3600000; // default 1 hour
  }

  // BullMQ repeat options
  await queue.add(
    jobKey,
    {
      reqId: `sched_${schedule.id}_${Date.now()}`,
      payload: schedule.payload,
      scheduleId: schedule.id,
      isScheduled: true,
    },
    {
      repeat: repeatOpts,
      jobId: jobKey,
    }
  );
  console.log(`[Scheduler] Registered job ${jobKey} (${schedule.cron || schedule.every + 'ms'})`);
}

async function unregisterRepeatableJob(scheduleId) {
  try {
    const queue = getQueue();
    const repeatableJobs = await queue.getRepeatableJobs();
    const jobKey = `schedule:${scheduleId}`;
    for (const job of repeatableJobs) {
      if (job.name === jobKey || job.id === jobKey || job.key.includes(jobKey)) {
        await queue.removeRepeatableByKey(job.key);
      }
    }
  } catch (err) {
    console.warn(`[Scheduler] Could not remove repeatable job:`, err.message);
  }
}

async function listSchedules() {
  const client = getClient();
  const all = await client.hgetall(REDIS_SCHEDULES_KEY);
  const list = [];
  for (const id in all) {
    try {
      list.push(JSON.parse(all[id]));
    } catch {
      // ignore
    }
  }
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getSchedule(id) {
  const client = getClient();
  const raw = await client.hget(REDIS_SCHEDULES_KEY, id);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function createSchedule(data) {
  const client = getClient();
  const id = data.id || `sch_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  // If templateId is provided and payload has no workflow, resolve template workflow
  let payload = data.payload || {};
  if (data.templateId && (!payload.workflow || payload.workflow.length === 0)) {
    const tpl = await templateManager.getTemplate(data.templateId);
    if (tpl) {
      payload = {
        config: payload.config || { headless: true },
        webhook_url: payload.webhook_url || null,
        workflow: tpl.workflow,
      };
    }
  }

  const record = {
    id,
    name: data.name || 'Untitled Schedule',
    description: data.description || '',
    templateId: data.templateId || null,
    cron: data.cron || null, // e.g. "0 9 * * *"
    every: data.every || null, // in ms, e.g. 60000
    payload,
    active: data.active !== false,
    lastRunAt: null,
    lastStatus: null,
    createdAt: now,
    updatedAt: now,
  };

  await client.hset(REDIS_SCHEDULES_KEY, id, JSON.stringify(record));

  if (record.active) {
    await registerRepeatableJob(record);
  }

  return record;
}

async function toggleSchedule(id, active) {
  const client = getClient();
  const record = await getSchedule(id);
  if (!record) return null;

  record.active = Boolean(active);
  record.updatedAt = new Date().toISOString();

  await client.hset(REDIS_SCHEDULES_KEY, id, JSON.stringify(record));

  if (record.active) {
    await registerRepeatableJob(record);
  } else {
    await unregisterRepeatableJob(id);
  }

  return record;
}

async function triggerScheduleNow(id) {
  const record = await getSchedule(id);
  if (!record) throw new Error('Schedule not found');

  const queue = getQueue();
  const reqId = `manual_sched_${record.id}_${Date.now()}`;
  const job = await queue.add(
    `manual-run:${record.id}`,
    {
      reqId,
      payload: record.payload,
      scheduleId: record.id,
      isScheduled: true,
    }
  );

  record.lastRunAt = new Date().toISOString();
  await clientSetRecord(record);

  return { jobId: job.id, reqId };
}

async function deleteSchedule(id) {
  const client = getClient();
  await unregisterRepeatableJob(id);
  const res = await client.hdel(REDIS_SCHEDULES_KEY, id);
  return res > 0;
}

async function clientSetRecord(record) {
  const client = getClient();
  await client.hset(REDIS_SCHEDULES_KEY, record.id, JSON.stringify(record));
}

/**
 * Initialize all active schedules on server start
 */
async function initScheduler() {
  try {
    const list = await listSchedules();
    console.log(`[Scheduler] Initializing ${list.length} schedule(s)...`);
    for (const item of list) {
      if (item.active) {
        await registerRepeatableJob(item);
      }
    }
  } catch (err) {
    console.warn('[Scheduler] Could not initialize schedules:', err.message);
  }
}

module.exports = {
  listSchedules,
  getSchedule,
  createSchedule,
  toggleSchedule,
  triggerScheduleNow,
  deleteSchedule,
  initScheduler,
  _setClient: (mock) => { redisClient = mock; },
  _setQueue: (mock) => { workflowQueue = mock; },
};

