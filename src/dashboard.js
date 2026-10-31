/**
 * Monitoring & Management Dashboard Router
 * Serves SPA frontend and JSON REST APIs for stats, history, API keys, templates, schedules, setup, and auth.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const express = require('express');
const { Queue } = require('bullmq');
const config = require('./config');
const history = require('./history');
const apiKeyManager = require('./apiKeyManager');
const templateManager = require('./templateManager');
const schedulerManager = require('./schedulerManager');
const setupManager = require('./setupManager');
const authManager = require('./authManager');

const router = express.Router();
let workflowQueue = null;

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

const WEB_DIST_PATH = path.resolve(__dirname, '..', 'web', 'dist');

// ── Public Auth Endpoints ─────────────────────────────────────────────────────

router.post('/api/v1/dashboard/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await authManager.verifyCredentials(username, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    const session = await authManager.createSession(user.username);
    res.json({
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        username: user.username,
        isDefault: user.isDefault,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/v1/dashboard/auth/status', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      return res.json({ authenticated: false });
    }

    const session = await authManager.validateSession(token);
    if (!session) {
      return res.json({ authenticated: false });
    }

    const isDefault = await authManager.isDefaultPassword();
    res.json({
      authenticated: true,
      user: {
        username: session.username,
        isDefault,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Dashboard Auth Middleware ─────────────────────────────────────────────────

async function dashboardAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Dashboard session token required. Please login.',
    });
  }

  const session = await authManager.validateSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Dashboard session expired or invalid. Please login again.',
    });
  }

  req.session = session;
  next();
}

// ── Protected Auth Endpoints ──────────────────────────────────────────────────

router.post('/api/v1/dashboard/auth/logout', dashboardAuth, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader.slice(7).trim();
    await authManager.destroySession(token);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/v1/dashboard/auth/change-password', dashboardAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, newUsername } = req.body || {};
    const result = await authManager.changePassword(currentPassword, newPassword, newUsername);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Protected Metrics & Queue APIs ────────────────────────────────────────────

router.get('/api/v1/dashboard/stats', dashboardAuth, async (req, res) => {
  try {
    const queue = getQueue();
    const counts = await queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed');
    const histStats = await history.getStats();

    res.json({
      success: true,
      queue: {
        waiting: counts.wait || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
      },
      history: histStats,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/v1/dashboard/history', dashboardAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await history.getHistory(page, limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/v1/dashboard/history/:id', dashboardAuth, async (req, res) => {
  try {
    const data = await history.getRequestDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Request not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Protected API Key Management ──────────────────────────────────────────────

router.get('/api/v1/dashboard/keys', dashboardAuth, async (req, res) => {
  try {
    const keys = await apiKeyManager.listApiKeys();
    res.json({ success: true, keys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/v1/dashboard/keys', dashboardAuth, async (req, res) => {
  try {
    const { name, description } = req.body || {};
    const created = await apiKeyManager.createApiKey(name, description);
    res.status(201).json({ success: true, key: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/api/v1/dashboard/keys/:id', dashboardAuth, async (req, res) => {
  try {
    const { active } = req.body;
    const updated = await apiKeyManager.toggleApiKey(req.params.id, active);
    if (!updated) return res.status(404).json({ success: false, error: 'Key not found' });
    res.json({ success: true, key: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/v1/dashboard/keys/:id', dashboardAuth, async (req, res) => {
  try {
    const ok = await apiKeyManager.deleteApiKey(req.params.id);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Protected Template Library ────────────────────────────────────────────────

router.get('/api/v1/dashboard/templates', dashboardAuth, async (req, res) => {
  try {
    const templates = await templateManager.listTemplates();
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/v1/dashboard/templates/:id', dashboardAuth, async (req, res) => {
  try {
    const tpl = await templateManager.getTemplate(req.params.id);
    if (!tpl) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, template: tpl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/v1/dashboard/templates', dashboardAuth, async (req, res) => {
  try {
    const saved = await templateManager.saveTemplate(req.body);
    res.status(201).json({ success: true, template: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/v1/dashboard/templates/:id', dashboardAuth, async (req, res) => {
  try {
    const ok = await templateManager.deleteTemplate(req.params.id);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Protected Scheduled Run Management ────────────────────────────────────────

router.get('/api/v1/dashboard/schedules', dashboardAuth, async (req, res) => {
  try {
    const schedules = await schedulerManager.listSchedules();
    res.json({ success: true, schedules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/v1/dashboard/schedules', dashboardAuth, async (req, res) => {
  try {
    const created = await schedulerManager.createSchedule(req.body);
    res.status(201).json({ success: true, schedule: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/api/v1/dashboard/schedules/:id', dashboardAuth, async (req, res) => {
  try {
    const { active } = req.body;
    const updated = await schedulerManager.toggleSchedule(req.params.id, active);
    if (!updated) return res.status(404).json({ success: false, error: 'Schedule not found' });
    res.json({ success: true, schedule: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/v1/dashboard/schedules/:id/run', dashboardAuth, async (req, res) => {
  try {
    const result = await schedulerManager.triggerScheduleNow(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/v1/dashboard/schedules/:id', dashboardAuth, async (req, res) => {
  try {
    const ok = await schedulerManager.deleteSchedule(req.params.id);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Protected Onboarding & Quick Setup ────────────────────────────────────────

router.get('/api/v1/dashboard/setup/status', dashboardAuth, async (req, res) => {
  try {
    const status = await setupManager.getConfigStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/v1/dashboard/setup/test-redis', dashboardAuth, async (req, res) => {
  try {
    const testResult = await setupManager.testRedisConnection(req.body || {});
    res.json(testResult);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/v1/dashboard/setup/save', dashboardAuth, async (req, res) => {
  try {
    const saveResult = await setupManager.saveEnvironmentConfig(req.body || {});
    workflowQueue = null;
    res.json(saveResult);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Protected VNC Info ────────────────────────────────────────────────────────

router.get('/api/v1/dashboard/vnc', dashboardAuth, async (req, res) => {
  const host = config.vnc.host || req.hostname || 'localhost';
  const port = config.vnc.port || 8080;

  // Probe whether noVNC port is actively listening (e.g. Docker container vs host npm run dev)
  const active = await new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host === 'localhost' ? '127.0.0.1' : host);
  });

  res.json({
    success: true,
    active,
    host,
    port,
    vncUrl: `http://${host}:${port}/vnc.html?autoconnect=true`,
    note: active
      ? 'noVNC remote service connected.'
      : 'noVNC port 8080 unreachable. In local dev (npm run dev), headless=false opens a visible window on your desktop.',
  });
});

// ── Frontend SPA Static Hosting ───────────────────────────────────────────────

if (fs.existsSync(WEB_DIST_PATH)) {
  // Serve static build from web/dist
  router.use('/dashboard', express.static(WEB_DIST_PATH));
  
  // SPA fallback for /dashboard/*
  router.get(['/dashboard', '/dashboard/*'], (req, res) => {
    res.sendFile(path.join(WEB_DIST_PATH, 'index.html'));
  });

  // Redirect root / to /dashboard
  router.get('/', (req, res) => {
    res.redirect('/dashboard');
  });
} else {
  // Fallback if frontend is not built yet
  router.get(['/', '/dashboard', '/dashboard/*'], (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Playwright API Automation Engine</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #131b2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 2rem; max-width: 500px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          h2 { margin-top: 0; color: #38bdf8; }
          p { color: #94a3b8; line-height: 1.5; }
          code { background: #1e293b; padding: 0.2rem 0.4rem; border-radius: 4px; color: #f1f5f9; font-size: 0.9em; }
          a { color: #38bdf8; text-decoration: none; font-weight: 500; }
          a:hover { text-decoration: underline; }
          .badge { display: inline-block; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Playwright API v1.0</div>
          <h2>Modern Dashboard Initializing</h2>
          <p>The modern Vite + Shadcn UI dashboard is being prepared. Build static assets via:</p>
          <p><code>npm run build:web</code></p>
          <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
            <a href="/api-docs">Interactive API Docs</a>
            <span style="color: #475569;">|</span>
            <a href="/api/v1/health">Health Check</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

module.exports = router;
