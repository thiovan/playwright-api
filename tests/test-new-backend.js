const assert = require('assert');
const apiKeyManager = require('../src/apiKeyManager');
const templateManager = require('../src/templateManager');
const setupManager = require('../src/setupManager');
const schedulerManager = require('../src/schedulerManager');

async function testAll() {
  console.log('Testing ApiKeyManager...');
  // 1. Create key
  const key = await apiKeyManager.createApiKey('Test External App', 'For integration test');
  assert(key.id.startsWith('key_'), 'ID format matches');
  assert(key.rawKey.startsWith('pk_live_'), 'rawKey starts with pk_live_');
  assert(key.prefix.startsWith('pk_live_'), 'prefix format matches');

  // 2. Validate key
  const valid = await apiKeyManager.validateApiKey(key.rawKey);
  assert(valid !== false, 'Key should be valid');
  assert.strictEqual(valid.id, key.id);
  assert(valid.lastUsedAt !== null, 'lastUsedAt was updated');

  // 3. Test list
  const list = await apiKeyManager.listApiKeys();
  assert(list.some(k => k.id === key.id), 'Key found in list');

  // 4. Toggle active
  await apiKeyManager.toggleApiKey(key.id, false);
  const invalidNow = await apiKeyManager.validateApiKey(key.rawKey);
  assert.strictEqual(invalidNow, false, 'Revoked key should be invalid');

  // 5. Delete key
  await apiKeyManager.deleteApiKey(key.id);
  console.log('ApiKeyManager tests passed!');

  console.log('Testing TemplateManager...');
  // 1. List templates (triggers seed)
  const templates = await templateManager.listTemplates();
  assert(templates.length >= 4, 'Should contain at least 4 seeded templates');

  // 2. Save custom template
  const custom = await templateManager.saveTemplate({
    name: 'Custom E2E Workflow',
    description: 'Automated test suite',
    tags: ['E2E', 'Test'],
    workflow: [{ action: 'goto', value: 'https://example.com' }],
    graph: { nodes: [], edges: [] },
  });
  assert(custom.id.startsWith('tpl_'));

  // 3. Get template
  const fetched = await templateManager.getTemplate(custom.id);
  assert.strictEqual(fetched.name, 'Custom E2E Workflow');

  // 4. Clean up custom template
  await templateManager.deleteTemplate(custom.id);
  console.log('TemplateManager tests passed!');

  console.log('Testing SetupManager...');
  const testConn = await setupManager.testRedisConnection({ host: 'localhost', port: 6379 });
  assert.strictEqual(testConn.success, true);
  console.log('Redis latency:', testConn.latencyMs, 'ms, version:', testConn.version);

  const status = await setupManager.getConfigStatus();
  assert.strictEqual(status.redis.status, 'connected');
  console.log('SetupManager tests passed!');

  console.log('Testing SchedulerManager...');
  const schedule = await schedulerManager.createSchedule({
    name: 'Test Hourly Cron',
    cron: '0 * * * *',
    payload: {
      config: { headless: true },
      workflow: [{ action: 'goto', value: 'https://example.com' }],
    },
    active: true,
  });
  assert(schedule.id.startsWith('sch_'));
  assert.strictEqual(schedule.active, true);

  const schedules = await schedulerManager.listSchedules();
  assert(schedules.some(s => s.id === schedule.id));

  await schedulerManager.deleteSchedule(schedule.id);
  console.log('SchedulerManager tests passed!');

  console.log('\n ALL BACKEND MODULE TESTS PASSED SUCCESSFULLY! \n');
  process.exit(0);
}

testAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
