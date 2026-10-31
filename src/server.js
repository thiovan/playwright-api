/**
 * Express Web Server
 *
 * Endpoints:
 *   GET  /api/v1/health       — Health check
 *   POST /api/v1/sync         — Synchronous workflow execution (with optional apiKey auth)
 *   POST /api/v1/async        — Asynchronous workflow execution (queue + webhook)
 *   GET  /api/v1/recordings/* — Debug screen recordings (.webm)
 *   GET  /api-docs            — Swagger UI (interactive API documentation)
 *   GET  /dashboard           — Modern Shadcn UI Monitoring & Workflow Builder Dashboard
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const config = require('./config');
const { validatePayload } = require('./validator');
const { executeWorkflow } = require('./executor');
const { addJob } = require('./queue');
const history = require('./history');
const dashboardRouter = require('./dashboard');
const apiKeyManager = require('./apiKeyManager');
const schedulerManager = require('./schedulerManager');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));

// ── Debug Screen Recordings (Static & Auto Cleanup) ──────────────────────────
if (!fs.existsSync(config.recordingsDir)) {
  fs.mkdirSync(config.recordingsDir, { recursive: true });
}
app.use('/api/v1/recordings', express.static(config.recordingsDir));

function cleanupRecordings() {
  try {
    if (!fs.existsSync(config.recordingsDir)) return;
    const now = Date.now();
    const maxAgeMs = (config.recordingsTTL || 86400) * 1000;
    const files = fs.readdirSync(config.recordingsDir);
    let removed = 0;
    for (const file of files) {
      if (!file.endsWith('.webm')) continue;
      const filePath = path.join(config.recordingsDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[Recordings] Purged ${removed} expired video recording(s) (> ${config.recordingsTTL}s)`);
    }
  } catch (err) {
    console.warn(`[Recordings] Cleanup warning: ${err.message}`);
  }
}

cleanupRecordings();
const recordingsTimer = setInterval(cleanupRecordings, 3600000);
if (recordingsTimer.unref) recordingsTimer.unref();

// ── Dashboard & Static Assets ─────────────────────────────────────────────────
app.use('/', dashboardRouter);

// ── Swagger UI ────────────────────────────────────────────────────────────────
try {
  const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
  if (fs.existsSync(openapiPath)) {
    const openapiFile = fs.readFileSync(openapiPath, 'utf8');
    const openapiSpec = YAML.parse(openapiFile);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Playwright API — Docs',
    }));
    console.log('[Server] Swagger UI available at /api-docs');
  }
} catch (err) {
  console.warn('[Server] Could not load OpenAPI spec:', err.message);
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    vncUrl: `http://${config.vnc.host || req.hostname}:${config.vnc.port}/vnc.html?autoconnect=true`,
  });
});

// ── API Key Auth Middleware (Adaptive) ────────────────────────────────────────
async function apiKeyAuth(req, res, next) {
  try {
    const hasKeys = await apiKeyManager.hasAnyActiveKeys();
    if (!hasKeys) {
      // Adaptive: If no API keys registered yet, open access is granted
      return next();
    }

    const authHeader = req.headers['authorization'];
    let token = req.headers['x-api-key'];
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: API Key is required. Send header "x-api-key" or "Authorization: Bearer <key>".',
      });
    }

    const keyRecord = await apiKeyManager.validateApiKey(token);
    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or revoked API Key.',
      });
    }

    req.apiKey = keyRecord;
    next();
  } catch (err) {
    console.error('[Server] API Key check error:', err.message);
    next();
  }
}

// ── Sync Execution ────────────────────────────────────────────────────────────
app.post('/api/v1/sync', apiKeyAuth, async (req, res) => {
  const reqId = history.generateId();
  const startTime = Date.now();
  
  try {
    // Validate
    const validation = validatePayload(req.body, { requireWebhook: false });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    // Record request start
    await history.recordRequest(reqId, req.body, 'sync');

    // Execute workflow (blocking)
    console.log(`[Sync] Executing workflow ${reqId}...`);
    const result = await executeWorkflow(req.body);

    // Record request completion
    const duration = Date.now() - startTime;
    await history.completeRequest(reqId, result, duration);

    const statusCode = result.success ? 200 : 422;
    return res.status(statusCode).json(result);
  } catch (err) {
    console.error(`[Sync] Unhandled error for ${reqId}:`, err);
    
    // Attempt to record failure
    await history.completeRequest(reqId, { success: false, error: err.message }, Date.now() - startTime);
    
    return res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message}`,
    });
  }
});

// ── Async Execution (Queue) ───────────────────────────────────────────────────
app.post('/api/v1/async', apiKeyAuth, async (req, res) => {
  const reqId = history.generateId();
  
  try {
    // Validate (webhook required)
    const validation = validatePayload(req.body, { requireWebhook: true });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    // Record request start
    await history.recordRequest(reqId, req.body, 'async');

    // Add to queue
    const { jobId } = await addJob(reqId, req.body);

    console.log(`[Async] Job ${jobId} (Req: ${reqId}) queued.`);
    return res.status(202).json({
      success: true,
      message: 'Workflow has been queued for execution.',
      jobId,
      reqId,
    });
  } catch (err) {
    console.error(`[Async] Unhandled error for ${reqId}:`, err);
    return res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message}`,
    });
  }
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found.`,
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error(`[Server] JSON Parse Error: ${err.message}`);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format or syntax error detected. Please ensure the payload is valid JSON.',
    });
  }

  console.error('[Server] Global error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
  });
});

// ── Initialize Background Scheduler ──────────────────────────────────────────
schedulerManager.initScheduler().catch(err => {
  console.warn('[Server] Scheduler initialization deferred:', err.message);
});

module.exports = app;
