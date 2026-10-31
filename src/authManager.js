/**
 * Dashboard Authentication & Session Manager
 * Handles admin credential hashing, Redis session storage, and password lifecycle.
 */

const crypto = require('crypto');
const Redis = require('ioredis');
const config = require('./config');

const REDIS_AUTH_KEY = 'playwright:admin_auth';
const SESSION_PREFIX = 'playwright:session:';

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
    redisClient.connect().catch((err) => {
      console.warn('[AuthManager] Redis connection warning:', err.message);
    });
  }
  return redisClient;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Get or initialize admin credentials in Redis
 */
async function getAdminCredentials() {
  const client = getClient();
  const raw = await client.get(REDIS_AUTH_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  // Seed with default credentials
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(config.auth.adminPass, salt);
  const initial = {
    username: config.auth.adminUser,
    passwordHash,
    salt,
    isCustom: config.auth.adminPass !== 'admin',
    updatedAt: new Date().toISOString(),
  };

  await client.set(REDIS_AUTH_KEY, JSON.stringify(initial));
  return initial;
}

/**
 * Check if the current password is still the default 'admin'
 */
async function isDefaultPassword() {
  const creds = await getAdminCredentials();
  return !creds.isCustom;
}

/**
 * Verify username and password
 */
async function verifyCredentials(username, password) {
  if (!username || !password) return null;
  const creds = await getAdminCredentials();

  if (username.trim() !== creds.username) {
    return null;
  }

  const computedHash = hashPassword(password, creds.salt);
  if (computedHash !== creds.passwordHash) {
    return null;
  }

  return {
    username: creds.username,
    isDefault: !creds.isCustom,
  };
}

/**
 * Create a new dashboard session token
 */
async function createSession(username) {
  const client = getClient();
  const token = `dsh_${crypto.randomBytes(32).toString('hex')}`;
  const ttl = config.auth.sessionTTL || 604800; // 7 days

  const sessionData = {
    username,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  };

  await client.set(`${SESSION_PREFIX}${token}`, JSON.stringify(sessionData), 'EX', ttl);
  return {
    token,
    ...sessionData,
  };
}

/**
 * Validate session token and refresh expiration
 */
async function validateSession(token) {
  if (!token || typeof token !== 'string') return null;
  const client = getClient();
  const raw = await client.get(`${SESSION_PREFIX}${token}`);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    // Sliding window: refresh TTL on activity
    const ttl = config.auth.sessionTTL || 604800;
    await client.expire(`${SESSION_PREFIX}${token}`, ttl);
    return session;
  } catch {
    return null;
  }
}

/**
 * Destroy a session (Logout)
 */
async function destroySession(token) {
  if (!token) return false;
  const client = getClient();
  const res = await client.del(`${SESSION_PREFIX}${token}`);
  return res > 0;
}

/**
 * Change admin password
 */
async function changePassword(currentPassword, newPassword, newUsername) {
  if (!newPassword || newPassword.length < 5) {
    throw new Error('New password must be at least 5 characters long.');
  }

  const creds = await getAdminCredentials();
  const currentHash = hashPassword(currentPassword, creds.salt);
  if (currentHash !== creds.passwordHash) {
    throw new Error('Incorrect current password.');
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);

  const updated = {
    username: (newUsername && newUsername.trim()) ? newUsername.trim() : creds.username,
    passwordHash: newHash,
    salt: newSalt,
    isCustom: true,
    updatedAt: new Date().toISOString(),
  };

  const client = getClient();
  await client.set(REDIS_AUTH_KEY, JSON.stringify(updated));
  return { success: true, username: updated.username };
}

module.exports = {
  verifyCredentials,
  createSession,
  validateSession,
  destroySession,
  changePassword,
  isDefaultPassword,
  _setClient: (mock) => { redisClient = mock; },
};

