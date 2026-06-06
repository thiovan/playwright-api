# 🎭 Playwright API Automation Engine

A Node.js web server that accepts JSON workflow payloads to execute browser automation via Playwright. Supports synchronous and asynchronous (queue/webhook) execution, multi-instance concurrency, dynamic browser configuration, and stealth mode to bypass bot detection.

---

## ✨ Features

- **JSON-Driven Workflows** — Define browser automation as a simple JSON array of actions
- **Sync & Async Execution** — Choose between blocking responses or queue-based webhook delivery
- **24 Workflow Actions** — Navigation, form filling, keyboard/mouse, cookies, screenshots, JS evaluation
- **Stealth Mode** — Built-in `puppeteer-extra-plugin-stealth` to bypass bot detection (Cloudflare, Datadome, etc.)
- **Multi-Instance Concurrency** — BullMQ workers process multiple browser instances in parallel
- **Dynamic Browser Config** — Customize viewport, user agent, proxy per request
- **Docker-Ready** — One command to build and run with Docker Compose
- **Swagger/OpenAPI Docs** — Interactive API documentation at `/api-docs`

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run with Docker Compose

```bash
# Clone or navigate to the project directory
cd playwright-api

# Build and start containers
docker-compose up --build -d

# Verify containers are running
docker-compose ps

# Check health
curl http://localhost:3000/api/v1/health
```

The API will be available at `http://localhost:3000`.
Swagger docs will be available at `http://localhost:3000/api-docs`.

### Stop

```bash
docker-compose down
```

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/sync` | Synchronous workflow execution |
| `POST` | `/api/v1/async` | Asynchronous execution via queue + webhook |
| `GET` | `/api-docs` | Interactive Swagger UI documentation |

---

## 📦 JSON Payload Schema

```json
{
  "config": {
    "headless": true,
    "viewport": { "width": 1280, "height": 720 },
    "userAgent": "custom-user-agent-string",
    "proxy": {
      "server": "http://proxy.example.com:8000"
    }
  },
  "webhook_url": "https://your-domain.com/callback",
  "workflow": [
    { "action": "goto", "value": "https://example.com" },
    { "action": "type", "selector": "input#search", "value": "Playwright" },
    { "action": "click", "selector": "button#submit" },
    { "action": "screenshot" }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `config` | No | Browser launch configuration |
| `config.headless` | No | Run in headless mode (default: `true`) |
| `config.viewport` | No | Browser viewport size (default: `1280x720`) |
| `config.userAgent` | No | Custom User-Agent string |
| `config.proxy` | No | Proxy server configuration |
| `webhook_url` | `/async` only | URL to receive execution results |
| `workflow` | Yes | Array of sequential action steps |

---

## 🎬 Supported Actions

### Navigation

| Action | Fields | Description |
|--------|--------|-------------|
| `goto` | `value` (URL) | Navigate to a URL |
| `close` | — | Close the current page |

### Form Interaction

| Action | Fields | Description |
|--------|--------|-------------|
| `click` | `selector` | Click an element |
| `dblclick` | `selector` | Double-click an element |
| `type` | `selector`, `value` | Fill a text input |
| `select` | `selector`, `value` | Select a dropdown option |
| `check` | `selector` | Check a checkbox |
| `uncheck` | `selector` | Uncheck a checkbox |
| `hover` | `selector` | Hover over an element |
| `drag` | `selector` (source), `value` (target) | Drag and drop |
| `upload` | `selector`, `value` (filepath) | Upload a file |

### Output

| Action | Fields | Description |
|--------|--------|-------------|
| `screenshot` | `selector` (optional) | Capture screenshot as base64 |
| `eval` | `value` (JS code), `selector` (optional) | Execute JavaScript |

### Keyboard

| Action | Fields | Description |
|--------|--------|-------------|
| `press` | `value` (key) | Press a keyboard key |
| `keydown` | `value` (key) | Key down event |
| `keyup` | `value` (key) | Key up event |

### Mouse

| Action | Fields | Description |
|--------|--------|-------------|
| `mousewheel` | `dx`, `dy` | Scroll the mouse wheel |

### Cookies

| Action | Fields | Description |
|--------|--------|-------------|
| `cookie-set` | `name`, `value` | Set a cookie |
| `cookie-get` | `name` | Get a cookie by name |

### Wait

| Action | Fields | Description |
|--------|--------|-------------|
| `wait` | `value` (ms) | Wait for a fixed duration |
| `wait-for` | `selector` | Wait for an element to appear |

---

## 📋 Usage Examples

### Sync: Screenshot a Website

```bash
curl -X POST http://localhost:3000/api/v1/sync \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": [
      {"action": "goto", "value": "https://example.com"},
      {"action": "screenshot"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "action": "goto", "index": 0, "data": { "url": "https://example.com/" } },
    { "action": "screenshot", "index": 1, "data": { "screenshot": "iVBORw0KGgo..." } }
  ]
}
```

### Sync: Search DuckDuckGo

```bash
curl -X POST http://localhost:3000/api/v1/sync \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "viewport": { "width": 1280, "height": 800 },
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    },
    "workflow": [
      {"action": "goto", "value": "https://duckduckgo.com"},
      {"action": "type", "selector": "#searchbox_input", "value": "ferrari"},
      {"action": "press", "value": "Enter"},
      {"action": "wait", "value": 3000},
      {"action": "screenshot"}
    ]
  }'
```

### Async: Queue with Webhook

```bash
curl -X POST http://localhost:3000/api/v1/async \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://webhook.site/your-unique-id",
    "workflow": [
      {"action": "goto", "value": "https://example.com"},
      {"action": "eval", "value": "return document.title"},
      {"action": "screenshot"}
    ]
  }'
```

**Response (immediate):**
```json
{
  "success": true,
  "message": "Workflow has been queued for execution.",
  "jobId": "1"
}
```

**Webhook Callback (POST to your webhook_url):**
```json
{
  "jobId": "1",
  "success": true,
  "results": [
    { "action": "goto", "index": 0, "data": { "url": "https://example.com/" } },
    { "action": "eval", "index": 1, "data": { "result": "Example Domain" } },
    { "action": "screenshot", "index": 2, "data": { "screenshot": "iVBORw0KGgo..." } }
  ]
}
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `CONCURRENCY` | `3` | Max parallel browser instances |
| `ACTION_TIMEOUT` | `60000` | Timeout per action (ms) |
| `WORKFLOW_TIMEOUT` | `300000` | Timeout per workflow (ms) |
| `WEBHOOK_TIMEOUT` | `30000` | Timeout for webhook delivery (ms) |

---

## 🏗️ Project Structure

```
playwright-api/
├── src/
│   ├── index.js          # Entry point (server + worker)
│   ├── server.js         # Express routes & Swagger UI
│   ├── executor.js       # Playwright workflow engine
│   ├── queue.js          # BullMQ producer & worker
│   ├── validator.js      # Payload validation
│   └── config.js         # Centralized configuration
├── docs/
│   └── openapi.yaml      # OpenAPI 3.0 specification
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── AGENTS.md             # Product Requirements Document
└── MEMORY.md             # AI development journal
```

---

## 🐛 Error Handling

When a workflow step fails, the engine stops execution and returns:

```json
{
  "success": false,
  "results": [
    { "action": "goto", "index": 0, "data": { "url": "https://example.com/" } }
  ],
  "error": "Action \"click\" failed at step 1: locator.click: Timeout 60000ms exceeded.",
  "failedAtIndex": 1
}
```

- `failedAtIndex` indicates which step (0-indexed) caused the failure
- All successfully completed steps before the failure are included in `results`
- The browser context is always cleaned up, even on errors

---

## 📄 License

MIT
