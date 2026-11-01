/**
 * API Key Manager
 * Handles API key generation, SHA-256 hashing, verification, and revocation via Redis.
 */

const crypto = require('crypto');
const Redis = require('ioredis');
const config = require('./config');

const REDIS_KEY_MAP = 'playwright:api_keys'; // hash of keyHash -> metadata JSON
const REDIS_ID_MAP = 'playwright:api_key_ids'; // hash of id -> keyHash

let redisClient = null;

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
    redisClient.on('error', (err) => {
      console.warn('[ApiKeyManager] Redis client error:', err.message);
    });
    redisClient.connect().catch((err) => {
      console.warn('[ApiKeyManager] Redis connection warning:', err.message);
    });
  }
  return redisClient;
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

/**
 * Create a new API Key
 * Returns the rawKey once. Only hash is saved in Redis.
 */
async function createApiKey(name, description = '') {
  const client = getClient();
  const id = `key_${crypto.randomBytes(8).toString('hex')}`;
  const rawKey = `pk_live_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const prefix = rawKey.substring(0, 14) + '...';

  const record = {
    id,
    name: name || 'Default Key',
    description: description || '',
    prefix,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    active: true,
  };

  await client.hset(REDIS_KEY_MAP, keyHash, JSON.stringify(record));
  await client.hset(REDIS_ID_MAP, id, keyHash);

  return {
    ...record,
    rawKey, // Returned ONLY during creation
  };
}

/**
 * List all API Keys (safe view without raw keys)
 */
async function listApiKeys() {
  const client = getClient();
  const all = await client.hgetall(REDIS_KEY_MAP);
  const list = [];
  for (const hash in all) {
    try {
      list.push(JSON.parse(all[hash]));
    } catch {
      // ignore corrupted
    }
  }
  // Sort newest first
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Check if there is at least one active API key registered
 */
async function hasAnyActiveKeys() {
  const keys = await listApiKeys();
  return keys.some(k => k.active === true);
}

/**
 * Validate incoming raw API key
 */
async function validateApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return false;
  const client = getClient();
  const keyHash = hashKey(rawKey);

  const data = await client.hget(REDIS_KEY_MAP, keyHash);
  if (!data) return false;

  try {
    const record = JSON.parse(data);
    if (!record.active) return false;

    // Update lastUsedAt asynchronously
    record.lastUsedAt = new Date().toISOString();
    await client.hset(REDIS_KEY_MAP, keyHash, JSON.stringify(record));

    return record;
  } catch {
    return false;
  }
}

/**
 * Revoke or toggle status of an API Key
 */
async function toggleApiKey(id, active) {
  const client = getClient();
  const keyHash = await client.hget(REDIS_ID_MAP, id);
  if (!keyHash) return null;

  const data = await client.hget(REDIS_KEY_MAP, keyHash);
  if (!data) return null;

  const record = JSON.parse(data);
  record.active = Boolean(active);
  await client.hset(REDIS_KEY_MAP, keyHash, JSON.stringify(record));
  return record;
}

/**
 * Delete an API key permanently
 */
async function deleteApiKey(id) {
  const client = getClient();
  const keyHash = await client.hget(REDIS_ID_MAP, id);
  if (!keyHash) return false;

  await client.hdel(REDIS_KEY_MAP, keyHash);
  await client.hdel(REDIS_ID_MAP, id);
  return true;
}

module.exports = {
  createApiKey,
  listApiKeys,
  hasAnyActiveKeys,
  validateApiKey,
  toggleApiKey,
  deleteApiKey,
  _setClient: (mock) => { redisClient = mock; },
};

