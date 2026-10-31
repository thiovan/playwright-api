const assert = require('assert');
const http = require('http');
const app = require('../src/server');
const authManager = require('../src/authManager');

async function run() {
  console.log('Testing Dashboard Authentication & Session Security...');
  const server = http.createServer(app);
  
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

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
    // 1. Check unauthenticated status
    const statusRes = await fetchUrl('/api/v1/dashboard/auth/status');
    assert.strictEqual(statusRes.status, 200);
    const statusJson = JSON.parse(statusRes.body);
    assert.strictEqual(statusJson.authenticated, false);
    console.log('Initial auth status unauthenticated: OK');

    // 2. Unprotected access to /api/v1/dashboard/stats should be rejected with 401
    const unauthStats = await fetchUrl('/api/v1/dashboard/stats');
    assert.strictEqual(unauthStats.status, 401, 'Should reject unauthenticated access with 401');
    console.log('Protected endpoint without token returned 401: OK');

    // 3. Login with wrong password
    const wrongLogin = await fetchUrl('/api/v1/dashboard/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
    });
    assert.strictEqual(wrongLogin.status, 401);
    console.log('Login with incorrect password rejected: OK');

    // 4. Login with correct default credentials (admin / admin)
    const validLogin = await fetchUrl('/api/v1/dashboard/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    assert.strictEqual(validLogin.status, 200);
    const loginData = JSON.parse(validLogin.body);
    assert.strictEqual(loginData.success, true);
    assert(loginData.token.startsWith('dsh_'), 'Token starts with dsh_');
    const token = loginData.token;
    console.log('Login with default credentials succeeded: OK');

    // 5. Check auth status WITH valid Bearer token
    const authStatusRes = await fetchUrl('/api/v1/dashboard/auth/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(authStatusRes.status, 200);
    const authStatus = JSON.parse(authStatusRes.body);
    assert.strictEqual(authStatus.authenticated, true);
    assert.strictEqual(authStatus.user.username, 'admin');
    console.log('Session status with Bearer token authenticated: OK');

    // 6. Access protected endpoint with Bearer token
    const authStats = await fetchUrl('/api/v1/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(authStats.status, 200);
    console.log('Protected endpoint with Bearer token returned 200: OK');

    // 7. Change password
    const changeRes = await fetchUrl('/api/v1/dashboard/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword: 'admin', newPassword: 'secretpassword123' }),
    });
    assert.strictEqual(changeRes.status, 200);
    console.log('Password changed successfully: OK');

    // 8. Login with old password should fail
    const oldLogin = await fetchUrl('/api/v1/dashboard/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    assert.strictEqual(oldLogin.status, 401);
    console.log('Login with old password now rejected: OK');

    // 9. Login with new password should succeed
    const newLogin = await fetchUrl('/api/v1/dashboard/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'secretpassword123' }),
    });
    assert.strictEqual(newLogin.status, 200);
    const newToken = JSON.parse(newLogin.body).token;
    console.log('Login with new password succeeded: OK');

    // 10. Logout / destroy session
    const logoutRes = await fetchUrl('/api/v1/dashboard/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newToken}` },
    });
    assert.strictEqual(logoutRes.status, 200);

    const revokedCheck = await fetchUrl('/api/v1/dashboard/stats', {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    assert.strictEqual(revokedCheck.status, 401);
    console.log('Logout revokes session token: OK');

    // Reset password back to default 'admin' for developer convenience
    await authManager.changePassword('secretpassword123', 'admin');
    console.log('Reset test password to default: OK');

    console.log('\n ALL DASHBOARD AUTH SECURITY TESTS PASSED! \n');
    server.close(() => process.exit(0));
  } catch (err) {
    server.close();
    console.error('Auth test failed:', err);
    process.exit(1);
  }
}

run();

