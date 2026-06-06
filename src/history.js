/**
 * Request History — Redis-backed temporary storage
 *
 * Stores request metadata, results, and timing in Redis with configurable TTL.
 * Used by the monitoring dashboard to display execution history and stats.
 */

const Redis = require('ioredis');
const config = require('./config');

// ── Redis connection (reusable) ─────────────────────────────────────────────
let redis = null;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    redis.connect().catch((err) => {
      console.warn(`[History] Redis connection failed: ${err.message}`);
    });
  }
  return redis;
}

// ── Key prefixes ────────────────────────────────────────────────────────────
const PREFIX = 'pw:history:';
const INDEX_KEY = 'pw:history:index';
const STATS_KEY = 'pw:stats';

/**
 * Generate a short unique request ID.
 * @returns {string}
 */
function generateId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}-${rand}`;
}

/**
 * Record an incoming request (before execution).
 *
 * @param {string} id - Request ID
 * @param {object} payload - The original request payload
 * @param {'sync'|'async'} type - Execution type
 * @returns {Promise<void>}
 */
async function recordRequest(id, payload, type) {
  try {
    const r = getRedis();
    const now = Date.now();

    // Store request metadata (exclude screenshot data from workflow for storage efficiency)
    const workflowSummary = (payload.workflow || []).map((step) => {
      const summary = { action: step.action };
      if (step.selector) summary.selector = step.selector;
      if (step.value && typeof step.value === 'string' && step.value.length <= 200) {
        summary.value = step.value;
      }
      if (step.name) summary.name = step.name;
      if (step.count) summary.count = step.count;
      if (step.condition) summary.condition = step.condition;
      if (step.workflow) summary.workflow = `[${step.workflow.length} steps]`;
      if (step.else) summary.else = `[${step.else.length} steps]`;
      return summary;
    });

    const data = {
      id,
      type,
      status: 'running',
      startedAt: now,
      completedAt: '',
      duration: '',
      success: '',
      error: '',
      stepsTotal: payload.workflow.length,
      stepsCompleted: 0,
      workflow: JSON.stringify(workflowSummary),
      webhookUrl: payload.webhook_url || '',
      config: JSON.stringify(payload.config || {}),
      variables: '{}',
      resultSummary: '[]',
    };

    await r.hset(`${PREFIX}${id}`, data);
    await r.zadd(INDEX_KEY, now, id);
    await r.expire(`${PREFIX}${id}`, config.historyTTL);

    // Increment total request counter
    await r.hincrby(STATS_KEY, 'totalRequests', 1);
    const statKeyType = type === 'sync' ? 'total_sync' : 'total_async';
    await r.hincrby(STATS_KEY, statKeyType, 1);

    // Trim old entries if exceeding max
    const count = await r.zcard(INDEX_KEY);
    if (count > config.historyMaxItems) {
      const toRemove = await r.zrange(INDEX_KEY, 0, count - config.historyMaxItems - 1);
      if (toRemove.length > 0) {
        const pipeline = r.pipeline();
        for (const oldId of toRemove) {
          pipeline.del(`${PREFIX}${oldId}`);
        }
        pipeline.zremrangebyrank(INDEX_KEY, 0, count - config.historyMaxItems - 1);
        await pipeline.exec();
      }
    }
  } catch (err) {
    console.warn(`[History] Failed to record request ${id}: ${err.message}`);
  }
}

/**
 * Update request with execution result.
 *
 * @param {string} id - Request ID
 * @param {object} result - The execution result { success, results, variables, error?, failedAtIndex? }
 * @param {number} duration - Execution duration in ms
 * @returns {Promise<void>}
 */
async function completeRequest(id, result, duration) {
  try {
    const r = getRedis();

    // Create a summary of results without large data (screenshots)
    const resultSummary = (result.results || []).map((r) => {
      const summary = { action: r.action, index: r.index };
      if (r.error) summary.error = r.error;
      if (r.data) {
        if (r.data.url) summary.data = { url: r.data.url };
        else if (r.data.result !== undefined) summary.data = { result: r.data.result };
        else if (r.data.cookie) summary.data = { cookie: r.data.cookie };
        else if (r.data.screenshot) summary.data = { screenshot: `[${r.data.screenshot.length} chars]` };
        else if (r.data.name !== undefined) summary.data = { name: r.data.name, value: r.data.value };
        else summary.data = r.data;
      }
      return summary;
    });

    const updates = {
      status: result.success ? 'success' : 'failed',
      completedAt: Date.now(),
      duration: Math.round(duration),
      success: result.success ? '1' : '0',
      error: result.error || '',
      stepsCompleted: result.results ? result.results.length : 0,
      variables: JSON.stringify(result.variables || {}),
      resultSummary: JSON.stringify(resultSummary),
    };

    if (result.failedAtIndex !== undefined) {
      updates.failedAtIndex = result.failedAtIndex;
    }

    await r.hset(`${PREFIX}${id}`, updates);

    // Update stats
    if (result.success) {
      await r.hincrby(STATS_KEY, 'totalSuccess', 1);
    } else {
      await r.hincrby(STATS_KEY, 'totalFailed', 1);
    }

    // Track total duration for average calculation
    await r.hincrby(STATS_KEY, 'totalDuration', Math.round(duration));
    await r.hincrby(STATS_KEY, 'totalCompleted', 1);
  } catch (err) {
    console.warn(`[History] Failed to complete request ${id}: ${err.message}`);
  }
}

/**
 * Get paginated history list.
 *
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Promise<{items: object[], total: number, page: number, totalPages: number}>}
 */
async function getHistory(page = 1, limit = 20) {
  try {
    const r = getRedis();
    const total = await r.zcard(INDEX_KEY);
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;

    // Get IDs in reverse chronological order
    const ids = await r.zrevrange(INDEX_KEY, start, start + limit - 1);

    const items = [];
    for (const id of ids) {
      const data = await r.hgetall(`${PREFIX}${id}`);
      if (data && data.id) {
        items.push({
          id: data.id,
          type: data.type,
          status: data.status,
          startedAt: parseInt(data.startedAt),
          completedAt: data.completedAt ? parseInt(data.completedAt) : null,
          duration: data.duration ? parseInt(data.duration) : null,
          success: data.success === '1',
          error: data.error || null,
          stepsTotal: parseInt(data.stepsTotal) || 0,
          stepsCompleted: parseInt(data.stepsCompleted) || 0,
          webhookUrl: data.webhookUrl || null,
        });
      }
    }

    return { items, total, page, totalPages };
  } catch (err) {
    console.warn(`[History] Failed to get history: ${err.message}`);
    return { items: [], total: 0, page: 1, totalPages: 1 };
  }
}

/**
 * Get full detail of a single request.
 *
 * @param {string} id - Request ID
 * @returns {Promise<object|null>}
 */
async function getRequestDetail(id) {
  try {
    const r = getRedis();
    const data = await r.hgetall(`${PREFIX}${id}`);
    if (!data || !data.id) return null;

    return {
      id: data.id,
      type: data.type,
      status: data.status,
      startedAt: parseInt(data.startedAt),
      completedAt: data.completedAt ? parseInt(data.completedAt) : null,
      duration: data.duration ? parseInt(data.duration) : null,
      success: data.success === '1',
      error: data.error || null,
      failedAtIndex: data.failedAtIndex !== undefined ? parseInt(data.failedAtIndex) : null,
      stepsTotal: parseInt(data.stepsTotal) || 0,
      stepsCompleted: parseInt(data.stepsCompleted) || 0,
      webhookUrl: data.webhookUrl || null,
      workflow: JSON.parse(data.workflow || '[]'),
      config: JSON.parse(data.config || '{}'),
      variables: JSON.parse(data.variables || '{}'),
      results: JSON.parse(data.resultSummary || '[]'),
    };
  } catch (err) {
    console.warn(`[History] Failed to get request detail: ${err.message}`);
    return null;
  }
}

/**
 * Get aggregate stats.
 *
 * @returns {Promise<object>}
 */
async function getStats() {
  try {
    const r = getRedis();
    const stats = await r.hgetall(STATS_KEY);

    const totalCompleted = parseInt(stats.totalCompleted) || 0;
    const totalDuration = parseInt(stats.totalDuration) || 0;
    const avgDuration = totalCompleted > 0 ? Math.round(totalDuration / totalCompleted) : 0;

    return {
      totalRequests: parseInt(stats.totalRequests) || 0,
      totalSync: parseInt(stats.total_sync) || 0,
      totalAsync: parseInt(stats.total_async) || 0,
      totalSuccess: parseInt(stats.totalSuccess) || 0,
      totalFailed: parseInt(stats.totalFailed) || 0,
      totalCompleted,
      avgDuration,
      successRate: totalCompleted > 0
        ? Math.round((parseInt(stats.totalSuccess) || 0) / totalCompleted * 100)
        : 0,
    };
  } catch (err) {
    console.warn(`[History] Failed to get stats: ${err.message}`);
    return {
      totalRequests: 0, totalSync: 0, totalAsync: 0,
      totalSuccess: 0, totalFailed: 0, totalCompleted: 0,
      avgDuration: 0, successRate: 0,
    };
  }
}

module.exports = {
  generateId,
  recordRequest,
  completeRequest,
  getHistory,
  getRequestDetail,
  getStats,
};
