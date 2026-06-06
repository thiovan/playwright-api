/**
 * Monitoring Dashboard
 * Serves a single-page HTML dashboard and JSON API endpoints for queue and history stats.
 */

const express = require('express');
const { Queue } = require('bullmq');
const config = require('./config');
const history = require('./history');

const router = express.Router();
const workflowQueue = new Queue(config.queueName, {
  connection: {
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
  },
});

// ── HTML Dashboard ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playwright API Dashboard</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.7);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --success: #10b981;
      --error: #ef4444;
      --border: rgba(255, 255, 255, 0.1);
    }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-top: 0; display: flex; align-items: center; gap: 1rem; }
    .live-dot {
      width: 10px; height: 10px; background: var(--success);
      border-radius: 50%; box-shadow: 0 0 10px var(--success);
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }
    .card h3 { margin: 0 0 0.5rem 0; color: var(--text-muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
    .card .value { font-size: 2rem; font-weight: bold; color: var(--accent); margin: 0; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { color: var(--text-muted); font-weight: 500; }
    tr:hover { background: rgba(255, 255, 255, 0.05); cursor: pointer; }
    
    .badge {
      padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
    }
    .badge.success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    .badge.failed { background: rgba(239, 68, 68, 0.2); color: var(--error); }
    .badge.running { background: rgba(56, 189, 248, 0.2); color: var(--accent); }
    
    .detail-view {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8);
      backdrop-filter: blur(5px); z-index: 50; padding: 2rem; overflow-y: auto;
    }
    .detail-content {
      background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
      max-width: 800px; margin: 0 auto; padding: 2rem; position: relative;
    }
    .close-btn {
      position: absolute; top: 1rem; right: 1rem; background: none; border: none;
      color: var(--text); font-size: 1.5rem; cursor: pointer;
    }
    pre { background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; overflow-x: auto; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Playwright API Dashboard <span class="live-dot" title="Live Updates Active"></span></h1>
    
    <div class="grid" id="stats">
      <div class="card"><h3>Active Queue</h3><p class="value" id="stat-active">-</p></div>
      <div class="card"><h3>Waiting Queue</h3><p class="value" id="stat-waiting">-</p></div>
      <div class="card"><h3>Total Requests</h3><p class="value" id="stat-total">-</p></div>
      <div class="card"><h3>Success Rate</h3><p class="value" id="stat-rate">-%</p></div>
      <div class="card"><h3>Avg Duration</h3><p class="value" id="stat-duration">-</p></div>
    </div>

    <div class="card">
      <h3 style="color: var(--text); font-size: 1.2rem; margin-bottom: 1rem;">Recent Executions</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Steps</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody id="history-body">
          <tr><td colspan="6" style="text-align: center;">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div id="detail" class="detail-view">
    <div class="detail-content">
      <button class="close-btn" onclick="closeDetail()">&times;</button>
      <h2 id="det-id">Request Detail</h2>
      <div class="grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 1rem;">
        <div><strong>Status:</strong> <span id="det-status"></span></div>
        <div><strong>Type:</strong> <span id="det-type"></span></div>
        <div><strong>Duration:</strong> <span id="det-duration"></span></div>
        <div><strong>Steps:</strong> <span id="det-steps"></span></div>
      </div>
      <div id="det-error" style="color: var(--error); margin-bottom: 1rem; display: none;"></div>
      
      <h3>Variables</h3>
      <pre id="det-vars"></pre>
      
      <h3>Workflow Summary</h3>
      <pre id="det-workflow"></pre>
      
      <h3>Results Summary</h3>
      <pre id="det-results"></pre>
    </div>
  </div>

  <script>
    async function fetchData() {
      try {
        const [statsRes, histRes] = await Promise.all([
          fetch('/api/v1/dashboard/stats'),
          fetch('/api/v1/dashboard/history?limit=20')
        ]);
        
        const stats = await statsRes.json();
        const hist = await histRes.json();
        
        // Update stats
        document.getElementById('stat-active').textContent = stats.queue.active;
        document.getElementById('stat-waiting').textContent = stats.queue.waiting;
        document.getElementById('stat-total').textContent = stats.history.totalRequests;
        document.getElementById('stat-rate').textContent = stats.history.successRate + '%';
        document.getElementById('stat-duration').textContent = (stats.history.avgDuration / 1000).toFixed(1) + 's';
        
        // Update table
        const tbody = document.getElementById('history-body');
        tbody.innerHTML = '';
        hist.items.forEach(req => {
          const tr = document.createElement('tr');
          tr.onclick = () => showDetail(req.id);
          
          const dur = req.duration ? (req.duration / 1000).toFixed(1) + 's' : '-';
          const time = new Date(req.startedAt).toLocaleTimeString();
          
          tr.innerHTML = \`
            <td style="font-family: monospace; font-size: 0.9em;">\${req.id}</td>
            <td><span class="badge" style="background: rgba(255,255,255,0.1)">\${req.type.toUpperCase()}</span></td>
            <td><span class="badge \${req.status}">\${req.status.toUpperCase()}</span></td>
            <td>\${dur}</td>
            <td>\${req.stepsCompleted} / \${req.stepsTotal}</td>
            <td style="color: var(--text-muted)">\${time}</td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    async function showDetail(id) {
      document.getElementById('detail').style.display = 'block';
      document.getElementById('det-id').textContent = 'Loading...';
      
      try {
        const res = await fetch('/api/v1/dashboard/history/' + id);
        const req = await res.json();
        
        document.getElementById('det-id').textContent = 'Request ' + req.id;
        document.getElementById('det-status').innerHTML = \`<span class="badge \${req.status}">\${req.status.toUpperCase()}</span>\`;
        document.getElementById('det-type').textContent = req.type.toUpperCase();
        document.getElementById('det-duration').textContent = req.duration ? (req.duration / 1000).toFixed(1) + 's' : '-';
        document.getElementById('det-steps').textContent = req.stepsCompleted + ' / ' + req.stepsTotal;
        
        const errEl = document.getElementById('det-error');
        if (req.error) {
          errEl.textContent = req.error;
          errEl.style.display = 'block';
        } else {
          errEl.style.display = 'none';
        }
        
        document.getElementById('det-vars').textContent = JSON.stringify(req.variables, null, 2);
        document.getElementById('det-workflow').textContent = JSON.stringify(req.workflow, null, 2);
        document.getElementById('det-results').textContent = JSON.stringify(req.results, null, 2);
      } catch (err) {
        document.getElementById('det-id').textContent = 'Error loading details';
      }
    }

    function closeDetail() {
      document.getElementById('detail').style.display = 'none';
    }

    // Initial fetch and poll
    fetchData();
    setInterval(fetchData, 5000);
  </script>
</body>
</html>
  `);
});

// ── JSON APIs ─────────────────────────────────────────────────────────────────

router.get('/api/v1/dashboard/stats', async (req, res) => {
  try {
    const counts = await workflowQueue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed');
    const histStats = await history.getStats();
    
    res.json({
      success: true,
      queue: {
        waiting: counts.wait,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed
      },
      history: histStats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/v1/dashboard/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await history.getHistory(page, limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/v1/dashboard/history/:id', async (req, res) => {
  try {
    const data = await history.getRequestDetail(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Request not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
