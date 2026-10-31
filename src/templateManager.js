/**
 * Template Manager
 * Stores and manages reusable Playwright workflow templates with React Flow graph layouts in Redis.
 */

const crypto = require('crypto');
const Redis = require('ioredis');
const config = require('./config');

const REDIS_TEMPLATES_KEY = 'playwright:templates';
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
      console.warn('[TemplateManager] Redis connection warning:', err.message);
    });
  }
  return redisClient;
}

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_default_scraper',
    name: 'Basic Page Scraper',
    description: 'Navigate to target URL, wait for DOM content, and evaluate page title.',
    tags: ['Scraping', 'Basic', 'Navigation'],
    workflow: [
      { action: 'goto', value: 'https://example.com' },
      { action: 'wait-for', selector: 'h1' },
      { action: 'eval', value: 'return document.querySelector("h1").innerText;' },
    ],
    graph: {
      nodes: [
        { id: '1', type: 'actionNode', position: { x: 100, y: 100 }, data: { action: 'goto', value: 'https://example.com' } },
        { id: '2', type: 'actionNode', position: { x: 100, y: 220 }, data: { action: 'wait-for', selector: 'h1' } },
        { id: '3', type: 'actionNode', position: { x: 100, y: 340 }, data: { action: 'eval', value: 'return document.querySelector("h1").innerText;' } },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
      ],
    },
  },
  {
    id: 'tpl_default_screenshot',
    name: 'Full Page Screenshot with Stealth',
    description: 'Bypass basic anti-bot checks and capture high-resolution full-page screenshot.',
    tags: ['Screenshot', 'Stealth', 'Media'],
    workflow: [
      { action: 'goto', value: 'https://news.ycombinator.com' },
      { action: 'wait', value: 1500 },
      { action: 'screenshot' },
    ],
    graph: {
      nodes: [
        { id: '1', type: 'actionNode', position: { x: 100, y: 100 }, data: { action: 'goto', value: 'https://news.ycombinator.com' } },
        { id: '2', type: 'actionNode', position: { x: 100, y: 220 }, data: { action: 'wait', value: 1500 } },
        { id: '3', type: 'actionNode', position: { x: 100, y: 340 }, data: { action: 'screenshot' } },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
      ],
    },
  },
  {
    id: 'tpl_default_form_submit',
    name: 'Form Fill & Click Submit',
    description: 'Type input fields, select dropdown, and click submission button.',
    tags: ['Form', 'Interaction', 'Automation'],
    workflow: [
      { action: 'goto', value: 'https://httpbin.org/forms/post' },
      { action: 'type', selector: 'input[name="custname"]', value: 'John Doe' },
      { action: 'type', selector: 'input[name="custtel"]', value: '123456789' },
      { action: 'click', selector: 'button' },
    ],
    graph: {
      nodes: [
        { id: '1', type: 'actionNode', position: { x: 100, y: 80 }, data: { action: 'goto', value: 'https://httpbin.org/forms/post' } },
        { id: '2', type: 'actionNode', position: { x: 100, y: 190 }, data: { action: 'type', selector: 'input[name="custname"]', value: 'John Doe' } },
        { id: '3', type: 'actionNode', position: { x: 100, y: 300 }, data: { action: 'type', selector: 'input[name="custtel"]', value: '123456789' } },
        { id: '4', type: 'actionNode', position: { x: 100, y: 410 }, data: { action: 'click', selector: 'button' } },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
      ],
    },
  },
  {
    id: 'tpl_default_loop_elements',
    name: 'DOM Elements Extraction Loop',
    description: 'Iterate over repeating DOM elements and collect text contents into variables.',
    tags: ['Loop', 'Extraction', 'Advanced'],
    workflow: [
      { action: 'goto', value: 'https://news.ycombinator.com' },
      {
        action: 'loop-elements',
        selector: '.titleline > a',
        max: 5,
        workflow: [
          { action: 'eval', selector: '{{_selector}}', value: 'return el.innerText;' },
        ],
      },
    ],
    graph: {
      nodes: [
        { id: '1', type: 'actionNode', position: { x: 100, y: 100 }, data: { action: 'goto', value: 'https://news.ycombinator.com' } },
        { id: '2', type: 'actionNode', position: { x: 100, y: 220 }, data: { action: 'loop-elements', selector: '.titleline > a', max: 5 } },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
      ],
    },
  },
];

async function seedDefaultTemplates() {
  const client = getClient();
  const count = await client.hlen(REDIS_TEMPLATES_KEY);
  if (count === 0) {
    const pipeline = client.pipeline();
    for (const tpl of DEFAULT_TEMPLATES) {
      const now = new Date().toISOString();
      pipeline.hset(REDIS_TEMPLATES_KEY, tpl.id, JSON.stringify({
        ...tpl,
        createdAt: now,
        updatedAt: now,
      }));
    }
    await pipeline.exec();
    console.log('[TemplateManager] Seeded default templates.');
  }
}

async function listTemplates() {
  const client = getClient();
  await seedDefaultTemplates();
  const all = await client.hgetall(REDIS_TEMPLATES_KEY);
  const list = [];
  for (const id in all) {
    try {
      list.push(JSON.parse(all[id]));
    } catch {
      // ignore
    }
  }
  return list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

async function getTemplate(id) {
  const client = getClient();
  const raw = await client.hget(REDIS_TEMPLATES_KEY, id);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveTemplate(payload) {
  const client = getClient();
  const id = payload.id || `tpl_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  let existing = null;
  if (payload.id) {
    existing = await getTemplate(payload.id);
  }

  const record = {
    id,
    name: payload.name || 'Untitled Workflow',
    description: payload.description || '',
    tags: Array.isArray(payload.tags) ? payload.tags : ['Workflow'],
    workflow: payload.workflow || [],
    graph: payload.graph || { nodes: [], edges: [] },
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  await client.hset(REDIS_TEMPLATES_KEY, id, JSON.stringify(record));
  return record;
}

async function deleteTemplate(id) {
  const client = getClient();
  const res = await client.hdel(REDIS_TEMPLATES_KEY, id);
  return res > 0;
}

module.exports = {
  listTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  seedDefaultTemplates,
  _setClient: (mock) => { redisClient = mock; },
};

