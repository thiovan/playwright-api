# 🎭 Playwright API Automation Engine & Modern Dashboard

Node.js REST API and interactive automation workspace powered by Playwright and BullMQ. Features a modern Shadcn UI dashboard, visual drag-and-drop workflow builder, API key management, workflow templates, cron scheduler, debugging screen recordings (.webm), remote browser visual inspection via noVNC, and advanced anti-bot stealth evasions (WebGL GPU spoofing & human cursor physics).

---

## ✨ Features

- **Modern Shadcn UI Dashboard** — Web console accessible at `/dashboard` with dark-mode aesthetic, metrics, BullMQ telemetry, and real-time execution inspect modal.
- **Visual Drag-and-Drop Workflow Builder** — Canvas powered by `@xyflow/react` with visual nodes, edge routing, runtime configuration modal, template saving, and JSON import/export.
- **Advanced Anti-Bot Evasions & Stealth**:
  - **WebGL & GPU Spoofing** — Eliminates Docker `llvmpipe` / `SwiftShader` signatures by spoofing `UNMASKED_VENDOR_WEBGL` (NVIDIA) and `UNMASKED_RENDERER_WEBGL` (GeForce RTX 3060) with valid `[native code]` extension descriptors.
  - **Ghost Cursor Simulation** — Moves cursor using randomized Cubic Bézier curves, natural hand arcs, non-linear velocity easing, and human reaction dwell times (40–100ms).
  - **Human Typing Jitter** — Types keystroke-by-keystroke with randomized 50–150ms intervals and natural punctuation pauses.
  - **Playwright Stealth Integration** — Evades baseline bot detection checks (`navigator.webdriver`, `chrome.runtime`, permissions).
- **Admin Authentication & Session Security** — Dashboard protected by PBKDF2 hashed credentials and Bearer token sessions (default credentials: `admin` / `admin`).
- **External API Key Management** — Generate, toggle, and revoke `ak_live_*` API keys with SHA-256 validation for third-party application integration.
- **Workflow Template Library** — Save, tag, and reuse battle-tested automation routines directly into the builder with persistent execution parameters.
- **Scheduled Automated Runs** — Set cron expressions (e.g. `0 9 * * 1-5`) or interval timers to execute workflows automatically in the background.
- **Debugging Screen Recordings (.webm)** — Automatically captures video of workflow executions when `headless: false` or `recordVideo: true`, with inline playback and downloads.
- **Live Browser Stream (noVNC)** — Real-time remote Xvfb display mirroring on port `8080` to watch visible browser executions inside Docker, with standby guidance banners and direct toolbar links.
- **Production-Ready Docker Orchestration** — Self-healing Docker Compose stack with native healthchecks, dynamic service resolution, and unhandled Redis crash protection.
- **Sync & Async Execution** — Choose between immediate synchronous responses (`/api/v1/sync`) or asynchronous BullMQ queues with webhook callbacks (`/api/v1/async`).
- **30 Workflow Actions** — Navigation, form filling, keystrokes, mouse events, cookies, DOM queries, JS evaluations, runtime variables, and control flow loops/conditions.

---

## 🚀 Quick Start

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose
- Alternatively, Node.js 18+ and Redis for local host development.

### 2. Run with Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/thiovan/playwright-api.git
cd playwright-api

# Start Redis and Playwright API + Dashboard
docker compose up --build -d
```

Once running:
- **Web Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard) (Login: `admin` / `admin`)
- **Interactive Swagger Docs**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Live noVNC Stream**: [http://localhost:8080/vnc.html?autoconnect=true](http://localhost:8080/vnc.html?autoconnect=true)
- **Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

### 3. Local Development (Windows / Linux / macOS)

```bash
# Install dependencies
npm install
npm --prefix web install

# Build web frontend
npm run build:web

# Start local server and worker
npm run dev
```

> **Note on VNC during local development:**
> When running `npm run dev` directly on your host OS, workflows executed with `headless: false` will open a visible Chromium window directly on your desktop. Port 8080 noVNC streaming is active inside Docker containers.

---

## 📡 API Endpoints

### Core Automation & Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health status and uptime |
| `POST` | `/api/v1/sync` | Execute browser workflow synchronously |
| `POST` | `/api/v1/async` | Queue workflow for background execution + webhook |
| `GET` | `/api/v1/recordings/:file` | Download or stream WebM screen recording |
| `GET` | `/api-docs` | Interactive OpenAPI Swagger UI |
| `GET` | `/dashboard` | Modern Vite + Shadcn UI Single-Page Dashboard |

### Dashboard & Management APIs (Protected)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/dashboard/auth/login` | Authenticate admin credentials |
| `GET` | `/api/v1/dashboard/auth/status` | Check current session validity |
| `POST` | `/api/v1/dashboard/auth/change-password` | Update admin password |
| `GET` | `/api/v1/dashboard/stats` | Telemetry, concurrency, and queue counts |
| `GET` | `/api/v1/dashboard/history` | Paginated execution logs |
| `GET` | `/api/v1/dashboard/history/:id` | Full execution trace, variables, and video URL |
| `GET / POST` | `/api/v1/dashboard/keys` | List or generate external integration API keys |
| `PATCH / DELETE`| `/api/v1/dashboard/keys/:id` | Toggle active status or delete API key |
| `GET / POST` | `/api/v1/dashboard/templates` | Manage visual workflow templates |
| `GET / POST` | `/api/v1/dashboard/schedules` | Manage cron-based scheduled workflows |
| `GET / POST` | `/api/v1/dashboard/setup/*` | Test Redis connection and update parameters |
| `GET` | `/api/v1/dashboard/vnc` | Probe noVNC reachability and return stream URL |

---

## 📦 JSON Payload Specification

```json
{
  "config": {
    "headless": true,
    "recordVideo": false,
    "noMedia": false,
    "debug": true,
    "humanize": true,
    "workflowTimeout": 300000,
    "gpuVendor": "Google Inc. (NVIDIA)",
    "gpuRenderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "viewport": { "width": 1280, "height": 720 },
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "proxy": {
      "server": "http://proxy.example.com:8000",
      "username": "user",
      "password": "pwd"
    }
  },
  "workflow": [
    { "action": "goto", "value": "https://example.com" },
    { "action": "type", "selector": "#search", "value": "Playwright Automation" },
    { "action": "click", "selector": "button[type='submit']" },
    { "action": "screenshot" }
  ]
}
```

### Configuration Options (`config`)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `headless` | `boolean` | `true` | When `false`, displays browser in noVNC (Docker) or desktop (local). |
| `recordVideo` | `boolean` | `false` | Captures WebM video of entire run (auto-enabled when `headless: false`). |
| `noMedia` | `boolean` | `false` | Blocks images, fonts, and media streams to boost scraping speed 3-5x. |
| `debug` | `boolean` | `true` | Includes individual step traces and internal variables (`_`) in output. |
| `humanize` | `boolean` | `true` | Enables Bézier mouse curves and 50–150ms human typing jitter. |
| `gpuVendor` | `string` | `"Google Inc. (NVIDIA)"` | Spoofed WebGL `UNMASKED_VENDOR_WEBGL` string. |
| `gpuRenderer`| `string` | `"ANGLE (NVIDIA, ... RTX 3060 ...)"` | Spoofed WebGL `UNMASKED_RENDERER_WEBGL` string. |
| `viewport` | `object` | `1280x720` | Viewport dimensions (`width`, `height`). |
| `userAgent` | `string` | Playwright default | Custom HTTP User-Agent header. |
| `proxy` | `object` | `null` | Proxy configuration (`server`, `username`, `password`). |

> **Tip for Step-Level Instant Speed:**
> If you need specific steps to run with instant zero-delay execution while keeping `humanize: true` globally, add `"instant": true` to the step (e.g. `{"action": "type", "selector": "#token", "value": "12345", "instant": true}`).

---

## ⚡ 30 Supported Workflow Actions

### Navigation & Page
- `goto` (`value: url`) — Navigate to URL.
- `close` — Close current page.
- `wait` (`value: ms`) — Pause execution for specified milliseconds.
- `wait-for` (`selector`) — Wait for selector to be attached to DOM.

### Form & User Interaction (Human Physics Enabled)
- `click` (`selector`, `instant`) — Smooth Bézier curve mouse travel and natural click dwell.
- `dblclick` (`selector`, `instant`) — Humanized double-click sequence.
- `type` (`selector`, `value`, `instant`) — Randomized 50–150ms keystroke jitter with punctuation pauses.
- `select` (`selector`, `value`) — Choose option from dropdown.
- `check` (`selector`) — Check checkbox or radio.
- `uncheck` (`selector`) — Uncheck checkbox.
- `hover` (`selector`, `instant`) — Move cursor smoothly along Bézier curve to target element.
- `drag` (`selector`, `value: targetSelector`) — Drag source element onto target.
- `upload` (`selector`, `value: filePath`) — Attach file to file input.

### Keyboard & Mouse
- `press` (`value: key`) — Press keyboard key (e.g. `Enter`, `Tab`).
- `keydown` (`value: key`) — Keydown event.
- `keyup` (`value: key`) — Keyup event.
- `mousewheel` (`dx`, `dy`) — Scroll page horizontally or vertically.

### Data Extraction & State
- `get-text` (`selector`, `name`, `push`) — Extract element text content to variable.
- `get-attribute` (`selector`, `value: attr`, `name`, `push`) — Extract attribute value.
- `var-set` (`name`, `value`, `push`) — Assign static or evaluated value to variable.
- `var-get` (`name`) — Retrieve value of runtime variable.
- `eval` (`value: jsCode`, `selector`) — Evaluate custom JavaScript expression in page context.
- `screenshot` (`selector`) — Capture full-page or element PNG screenshot (base64).

### Cookies & Dialogs
- `cookie-set` (`name`, `value`) — Set browser cookie.
- `cookie-get` (`name`) — Read browser cookie by name.
- `dialog-accept` (`value`) — Accept JavaScript alerts, confirms, or prompts.
- `dialog-dismiss` — Automatically dismiss incoming JavaScript dialogs.

### Control Flow
- `if` (`condition`, `selector`/`name`/`value`, `workflow`, `else`) — Branching logic.
- `loop` (`count` or `condition`, `workflow`) — Repeat workflow steps.
- `loop-elements` (`selector`, `workflow`, `max`) — Iterate over elements with `{{_selector}}` and `{{_index}}`.

---

## 🔐 Authentication & API Keys

### 1. Dashboard Login
The dashboard requires authentication. Access `/dashboard` and enter your admin credentials:
- **Default Username**: `admin`
- **Default Password**: `admin`
*(You will be prompted to change default credentials via the User Profile dropdown).*

### 2. External Integration via API Keys
If API keys have been created in the Dashboard, all external requests to `/api/v1/sync` and `/api/v1/async` require the `x-api-key` header:

```bash
curl -X POST http://localhost:3000/api/v1/sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: ak_live_your_generated_token_here" \
  -d '{"workflow": [{"action": "goto", "value": "https://example.com"}]}'
```

---

## 🛠️ Environment Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Express server port |
| `NODE_ENV` | `production` | Node environment |
| `REDIS_HOST` | `redis` (docker) / `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | *(empty)* | Redis password authentication |
| `REDIS_TLS` | `false` | Enable TLS/SSL connection to Redis |
| `CONCURRENCY` | `3` | Number of simultaneous BullMQ browser workers |
| `ACTION_TIMEOUT` | `60000` | Default timeout for individual Playwright actions (ms) |
| `WORKFLOW_TIMEOUT`| `300000` | Max total duration for a workflow execution (ms) |
| `RECORDINGS_DIR` | `/app/recordings` | Directory storing screen recording files (.webm) |
| `RECORDINGS_TTL` | `86400` | Time to keep recordings before cleanup (seconds) |
| `VNC_HOST` | `localhost` | noVNC host interface |
| `VNC_PORT` | `8080` | noVNC web streaming port |
| `DASHBOARD_DEFAULT_USERNAME` | `admin` | Initial admin username |
| `DASHBOARD_DEFAULT_PASSWORD` | `admin` | Initial admin password |

---

## 📁 Repository Structure

```
playwright-api/
├── src/
│   ├── index.js             # Application entrypoint (server + BullMQ worker)
│   ├── server.js            # Express routes, Swagger UI, and static hosting
│   ├── executor.js          # Playwright action runner and WebGL spoofer
│   ├── humanCursor.js       # Bézier curve trajectory & randomized typing jitter
│   ├── queue.js             # BullMQ queue producer and consumer
│   ├── history.js           # Redis execution telemetry & trace storage
│   ├── apiKeyManager.js     # API Key generation, hashing, and authorization
│   ├── authManager.js       # Dashboard admin sessions and PBKDF2 auth
│   ├── templateManager.js   # Workflow template persistence with config
│   ├── schedulerManager.js  # Recurring cron job execution engine
│   ├── setupManager.js      # Onboarding and environment editor
│   ├── validator.js         # JSON payload validation rules
│   ├── config.js            # Central configuration loader
│   └── dashboard.js         # Dashboard REST APIs and VNC connectivity probe
├── web/                     # Modern React + Vite + Shadcn UI Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── builder/     # ActionPalette, CustomNode, Drawer, RunnerModal, WorkflowConfigModal
│   │   │   ├── ui/          # Button, Input, Switch, Dialog, Card, Badge
│   │   │   └── Layout.tsx   # Dashboard layout, navigation bar, VNC status
│   │   ├── pages/           # Overview, Builder, Queue, Keys, Schedules, Templates, Vnc, Settings
│   │   └── lib/             # API client and utility helpers
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   └── openapi.yaml         # OpenAPI 3.0 specification
├── recordings/              # WebM execution recordings
├── Dockerfile               # Multi-stage image build (Vite + Noble + Playwright + Xvfb)
├── docker-compose.yml       # Production stack orchestrator with healthchecks
└── entrypoint.sh            # Container init script (Xvfb + x11vnc + noVNC)
```

---

## 🧪 Automated Testing

Run the automated test suite covering API keys, templates, scheduler, setup manager, admin auth, server integration, and stealth evasions:

```bash
# Full test suite
npm test

# Stealth & human physics verification test
node tests/test-stealth.js
```

---

## 📄 License

MIT © [Thiovan](https://github.com/thiovan)
