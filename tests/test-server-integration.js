const assert = require('assert');
const http = require('http');
const app = require('../src/server');

async function run() {
  console.log('Starting Express server for integration verification...');
  const server = http.createServer(app);
  
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Server listening on temporary port ${port}`);

  const fetchUrl = (path, opts = {}) => {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:${port}${path}`, opts, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', reject);
      if (opts.body) req.write(opts.body);
      req.end();
    });
  };

  try {
    // 1. Health check
    const health = await fetchUrl('/api/v1/health');
    assert.strictEqual(health.status, 200);
    const healthJson = JSON.parse(health.body);
    assert.strictEqual(healthJson.status, 'ok');
    console.log('Health check endpoint: OK');

    // 2. Root redirect
    const root = await fetchUrl('/');
    assert.strictEqual(root.status, 302);
    assert.strictEqual(root.headers.location, '/dashboard');
    console.log('Root redirect to /dashboard: OK');

    // 3. Dashboard HTML
    const dash = await fetchUrl('/dashboard/');
    assert.strictEqual(dash.status, 200);
    assert(dash.body.includes('id="root"'), 'Dashboard HTML contains root div');
    assert(dash.body.includes('/dashboard/assets/'), 'Dashboard HTML references asset files');
    console.log('Dashboard SPA HTML: OK');

    // 4. Dashboard Login to obtain session token
    const loginRes = await fetchUrl('/api/v1/dashboard/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    assert.strictEqual(loginRes.status, 200);
    const dashToken = JSON.parse(loginRes.body).token;
    const authHeaders = { Authorization: `Bearer ${dashToken}` };
    console.log('Dashboard login token acquired: OK');

    // 5. Dashboard Stats API
    const stats = await fetchUrl('/api/v1/dashboard/stats', { headers: authHeaders });
    assert.strictEqual(stats.status, 200);
    const statsJson = JSON.parse(stats.body);
    assert(statsJson.queue !== undefined, 'Stats has queue object');
    assert(statsJson.history !== undefined, 'Stats has history object');
    console.log('Dashboard Stats API: OK');

    // 6. Dashboard Keys API
    const keys = await fetchUrl('/api/v1/dashboard/keys', { headers: authHeaders });
    assert.strictEqual(keys.status, 200);
    const keysJson = JSON.parse(keys.body);
    assert.strictEqual(keysJson.success, true);
    console.log('Dashboard Keys API: OK');

    // 7. Dashboard Templates API
    const templates = await fetchUrl('/api/v1/dashboard/templates', { headers: authHeaders });
    assert.strictEqual(templates.status, 200);
    const templatesJson = JSON.parse(templates.body);
    assert.strictEqual(templatesJson.success, true);
    assert(templatesJson.templates.length >= 4, 'Has seeded templates');
    console.log('Dashboard Templates API: OK');

    // 8. Dashboard Schedules API
    const schedules = await fetchUrl('/api/v1/dashboard/schedules', { headers: authHeaders });
    assert.strictEqual(schedules.status, 200);
    const schedulesJson = JSON.parse(schedules.body);
    assert.strictEqual(schedulesJson.success, true);
    console.log('Dashboard Schedules API: OK');

    // 9. Dashboard Setup Status API
    const setup = await fetchUrl('/api/v1/dashboard/setup/status', { headers: authHeaders });
    assert.strictEqual(setup.status, 200);
    const setupJson = JSON.parse(setup.body);
    assert.strictEqual(setupJson.success, true);
    assert(setupJson.redis !== undefined, 'Setup has redis status');
    console.log('Dashboard Setup Status API: OK');

    // 10. Adaptive API Key Enforcement Test
    // Create an API key
    const createKeyRes = await fetchUrl('/api/v1/dashboard/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ name: 'Integration Test Key' }),
    });
    assert.strictEqual(createKeyRes.status, 201);
    const newKey = JSON.parse(createKeyRes.body).key;

    // Now POST /api/v1/sync without key should return 401
    const unauthSync = await fetchUrl('/api/v1/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow: [{ action: 'wait', value: 10 }] }),
    });
    assert.strictEqual(unauthSync.status, 401, 'Request without key rejected with 401');
    console.log('Adaptive Auth: Unauthenticated request rejected (401): OK');

    // POST /api/v1/sync WITH key should be accepted (not 401)
    const authSync = await fetchUrl('/api/v1/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': newKey.rawKey,
      },
      body: JSON.stringify({ workflow: [{ action: 'wait', value: 10 }] }),
    });
    assert.notStrictEqual(authSync.status, 401, 'Request with valid key accepted');
    console.log('Adaptive Auth: Authenticated request accepted: OK');

    // Cleanup key
    await fetchUrl(`/api/v1/dashboard/keys/${newKey.id}`, { method: 'DELETE', headers: authHeaders });
    console.log('Key cleanup: OK');

    console.log('\n ALL INTEGRATION VERIFICATION TESTS PASSED SUCCESSFULLY! \n');
    server.close(() => process.exit(0));
  } finally {
    server.close();
  }
}

run().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
