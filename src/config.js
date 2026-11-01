/**
 * Centralized Configuration
 * All settings are read from environment variables with sensible defaults.
 */

const path = require('path');

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'production',

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
  },

  // Dashboard Authentication
  auth: {
    adminUser: process.env.DASHBOARD_ADMIN_USER || process.env.DASHBOARD_DEFAULT_USERNAME || 'admin',
    adminPass: process.env.DASHBOARD_ADMIN_PASS || process.env.DASHBOARD_DEFAULT_PASSWORD || 'admin',
    sessionTTL: parseInt(process.env.SESSION_TTL, 10) || 604800, // 7 days in seconds
  },

  // Worker
  concurrency: parseInt(process.env.CONCURRENCY, 10) || 3,

  // Timeouts (milliseconds)
  actionTimeout: parseInt(process.env.ACTION_TIMEOUT, 10) || 60_000, // 60s per action
  workflowTimeout: parseInt(process.env.WORKFLOW_TIMEOUT, 10) || 300_000, // 5 min per workflow
  webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT, 10) || 30_000, // 30s for webhook delivery
  loopMaxIterations: parseInt(process.env.LOOP_MAX_ITERATIONS, 10) || 1000,

  // Queue
  queueName: process.env.QUEUE_NAME || "playwright-workflows",
  
  // History (Dashboard Monitoring)
  historyTTL: parseInt(process.env.HISTORY_TTL, 10) || 86400, // 24 hours in seconds
  historyMaxItems: parseInt(process.env.HISTORY_MAX_ITEMS, 10) || 1000, // Max records in history

  // VNC Remote Display
  vnc: {
    host: process.env.VNC_HOST || "localhost",
    port: parseInt(process.env.VNC_PORT, 10) || 8080,
  },

  // Screen Recordings (Debug)
  recordingsDir: path.resolve(process.env.RECORDINGS_DIR || path.join(__dirname, '..', 'recordings')),
  recordingsTTL: parseInt(process.env.RECORDINGS_TTL, 10) || 86400,
};

module.exports = config;
