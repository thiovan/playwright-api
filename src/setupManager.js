/**
 * Setup Manager (Onboarding & Quick Setup)
 * Allows testing and updating Redis parameters & environment variables dynamically.
 */

const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const config = require('./config');

const ENV_PATH = path.resolve(__dirname, '..', '.env');

/**
 * Ping test to target Redis server
 */
async function testRedisConnection({ host, port, password, tls }) {
  const start = Date.now();
  const testClient = new Redis({
    host: host || config.redis.host,
    port: parseInt(port, 10) || config.redis.port,
    password: password || undefined,
    tls: tls ? {} : undefined,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  try {
    await testClient.connect();
    const pong = await testClient.ping();
    const latencyMs = Date.now() - start;
    const info = await testClient.info('server').catch(() => '');
    
    // Parse version if available
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    await testClient.quit();
    return {
      success: true,
      latencyMs,
      response: pong,
      version,
    };
  } catch (err) {
    try { testClient.disconnect(); } catch {}
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Read current config status
 */
async function getConfigStatus() {
  const redisTest = await testRedisConnection(config.redis);
  return {
    server: {
      port: config.port,
      nodeEnv: config.nodeEnv,
      uptime: process.uptime(),
    },
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      hasPassword: Boolean(config.redis.password),
      tls: Boolean(config.redis.tls),
      status: redisTest.success ? 'connected' : 'error',
      latencyMs: redisTest.latencyMs || null,
      error: redisTest.error || null,
      version: redisTest.version || null,
    },
    vnc: {
      host: config.vnc.host,
      port: config.vnc.port,
    },
    worker: {
      concurrency: config.concurrency,
      actionTimeout: config.actionTimeout,
      workflowTimeout: config.workflowTimeout,
    },
  };
}

/**
 * Save configuration to .env file and update in-memory config
 */
async function saveEnvironmentConfig(updates) {
  let envContent = '';
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
  } else {
    // Copy from .env.example if .env doesn't exist yet
    const examplePath = path.resolve(__dirname, '..', '.env.example');
    if (fs.existsSync(examplePath)) {
      envContent = fs.readFileSync(examplePath, 'utf8');
    }
  }

  // Helper to replace or append env line
  const lines = envContent.split(/\r?\n/);
  const updatedKeys = new Set();

  const mapping = {
    REDIS_HOST: updates.redisHost,
    REDIS_PORT: updates.redisPort,
    REDIS_PASSWORD: updates.redisPassword,
    REDIS_TLS: updates.redisTls !== undefined ? String(updates.redisTls) : undefined,
    CONCURRENCY: updates.concurrency,
    VNC_HOST: updates.vncHost,
    VNC_PORT: updates.vncPort,
  };

  const newLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return line;
    const key = line.slice(0, eqIdx).trim();

    if (mapping[key] !== undefined) {
      updatedKeys.add(key);
      return `${key}=${mapping[key]}`;
    }
    return line;
  });

  // Append any keys not found
  for (const [key, val] of Object.entries(mapping)) {
    if (val !== undefined && !updatedKeys.has(key)) {
      newLines.push(`${key}=${val}`);
    }
  }

  fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf8');

  // Update in-memory config object
  if (updates.redisHost) config.redis.host = updates.redisHost;
  if (updates.redisPort) config.redis.port = parseInt(updates.redisPort, 10);
  if (updates.redisPassword !== undefined) config.redis.password = updates.redisPassword || undefined;
  if (updates.redisTls !== undefined) config.redis.tls = updates.redisTls ? {} : undefined;
  if (updates.concurrency) config.concurrency = parseInt(updates.concurrency, 10);
  if (updates.vncHost) config.vnc.host = updates.vncHost;
  if (updates.vncPort) config.vnc.port = parseInt(updates.vncPort, 10);

  return { success: true, message: 'Configuration saved to .env and memory updated.' };
}

module.exports = {
  testRedisConnection,
  getConfigStatus,
  saveEnvironmentConfig,
};

