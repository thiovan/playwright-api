/**
 * Express Web Server
 *
 * Endpoints:
 *   GET  /api/v1/health  — Health check
 *   POST /api/v1/sync    — Synchronous workflow execution
 *   POST /api/v1/async   — Asynchronous workflow execution (queue + webhook)
 *   GET  /api-docs       — Swagger UI (interactive API documentation)
 *   GET  /dashboard      — Monitoring dashboard
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const { validatePayload } = require('./validator');
const { executeWorkflow } = require('./executor');
const { addJob } = require('./queue');
const history = require('./history');
const dashboardRouter = require('./dashboard');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Dashboard ─────────────────────────────────────────────────────────────────
app.use('/', dashboardRouter);

// ── Swagger UI ────────────────────────────────────────────────────────────────
try {
  const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
  const openapiFile = fs.readFileSync(openapiPath, 'utf8');
  const openapiSpec = YAML.parse(openapiFile);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Playwright API — Docs',
  }));
  console.log('[Server] Swagger UI available at /api-docs');
} catch (err) {
  console.warn('[Server] Could not load OpenAPI spec:', err.message);
  console.warn('[Server] Swagger UI will not be available.');
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Sync Execution ────────────────────────────────────────────────────────────
app.post('/api/v1/sync', async (req, res) => {
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
app.post('/api/v1/async', async (req, res) => {
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
  // Catch JSON parsing errors from express.json()
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

module.exports = app;
