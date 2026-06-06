/**
 * Centralized Configuration
 * All settings are read from environment variables with sensible defaults.
 */

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    maxRetriesPerRequest: null, // Required by BullMQ
  },

  // Worker
  concurrency: parseInt(process.env.CONCURRENCY, 10) || 3,

  // Timeouts (milliseconds)
  actionTimeout: parseInt(process.env.ACTION_TIMEOUT, 10) || 60_000, // 60s per action
  workflowTimeout: parseInt(process.env.WORKFLOW_TIMEOUT, 10) || 300_000, // 5 min per workflow

  // Queue
  queueName: "playwright-workflows",

  // Webhook
  webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT, 10) || 30_000, // 30s for webhook delivery
};

module.exports = config;
