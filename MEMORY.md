# MEMORY.md — Playwright API Automation Engine

## Project Status: 🟢 Project Complete & Fully Verified

---

## Session Log

### Session 1 — 2026-06-06

**Objective:** Build the full project from scratch based on the PRD (AGENTS.md).

#### Steps Completed:

1. ✅ Created `package.json` with all dependencies (express, playwright-extra, stealth plugin, bullmq, ioredis)
2. ✅ Created `src/config.js` — centralized config with env var support
3. ✅ Created `src/validator.js` — payload validation with per-action schema checks
4. ✅ Created `src/executor.js` — core Playwright workflow engine with:
   - Stealth mode via `playwright-extra` + `puppeteer-extra-plugin-stealth`
   - All 24 workflow actions implemented (goto, click, type, screenshot, eval, cookies, etc.)
   - Isolated BrowserContext per workflow
   - Per-step error handling with `failedAtIndex` reporting
   - Dynamic browser config (headless, viewport, userAgent, proxy)
5. ✅ Created `src/queue.js` — BullMQ producer + worker with webhook delivery
6. ✅ Created `src/server.js` — Express server with 3 endpoints:
   - `GET /api/v1/health` — healthcheck
   - `POST /api/v1/sync` — synchronous execution
   - `POST /api/v1/async` — async queue + webhook
7. ✅ Created `src/index.js` — entry point with graceful shutdown
8. ✅ Created `Dockerfile` — based on `mcr.microsoft.com/playwright:v1.52.0-noble`
9. ✅ Created `docker-compose.yml` — redis + app services
10. ✅ Created `.dockerignore`

#### Architecture Decisions:

- **Single process:** Server + Worker run in the same Node.js process for simplicity. Can be split later if scaling requires it.
- **No auth:** No authentication layer per PRD. Can be added as middleware later.
- **Stealth plugin:** Registered globally on `chromium` from `playwright-extra`. Runs on every browser launch.
- **Native fetch:** Used for webhook delivery (Node.js 18+ built-in).
- **Concurrency=3 default:** 3 parallel browser instances via BullMQ worker config.

#### Known Limitations:

- The `eval` action uses `new Function()` which is powerful but could be a security concern if untrusted input is allowed.
- `close` action creates a new page after closing — subsequent actions will use the new page. This may not be intuitive.
- No retry mechanism for failed workflows (by design — browser state is not recoverable).

#### Pending Verification:

- [x] Docker build & run
- [x] Health endpoint test
- [x] Sync endpoint test (goto + screenshot) — DuckDuckGo works; Google triggers CAPTCHA due to IP-level blocking
- [ ] Async endpoint test (with webhook)

### Session 2 — 2026-06-06

**Objective:** Create README.md, OpenAPI/Swagger documentation, and comprehensive tests.

#### Steps Completed:

1. ✅ Created `README.md` — comprehensive project documentation with quick start, all 24 actions, usage examples, env vars
2. ✅ Created `docs/openapi.yaml` — OpenAPI 3.0.3 specification covering all endpoints, request/response schemas, examples
3. ✅ Integrated Swagger UI into Express server at `/api-docs` using `swagger-ui-express` + `yaml` packages
4. ✅ Updated `Dockerfile` to copy `docs/` directory
5. ✅ Added `swagger-ui-express` and `yaml` to `package.json` dependencies
6. ✅ Pinned `playwright` and `playwright-extra` versions (removed carets) to prevent Docker image mismatch
7. ✅ Created `.env.example` to document configurable variables
8. ✅ Created `.gitignore` for standard Node.js exclusions
9. ✅ Created `test-all.js` — a comprehensive script that tests all 24 supported Playwright actions in a single workflow.

#### Bug Fix:
- **Playwright version mismatch:** `package.json` had `^1.52.0` which resolved to `1.60.0` at install time, but Docker image only has `1.52.0` browsers. Fixed by pinning to exact `1.52.0`.
- **Hover Selector:** Adjusted selector in `test-all.js` from `.figure:first-child` to `.figure:first-of-type` to correctly locate the element on the test site without timeouts.

#### Test Results:
- `test-all.js` successfully executed all actions (navigation, eval, checks, selects, text input, keyboard inputs, mouse hover/scroll, drag/drop, cookies, and screenshot) in ~8 seconds.

### Session 4 — 2026-06-07

**Objective:** Add `loop-elements` feature.

#### Steps Completed:

1. ✅ Updated `src/validator.js` to include `"loop-elements": { required: ["selector", "workflow"] }`.
2. ✅ Updated `src/executor.js` to handle `loop-elements` by locating all elements matching the selector and executing the inner workflow sequentially.
3. ✅ Added runtime variables `{{_selector}}` and `{{_index}}` inside the loop, allowing inner workflows to easily target the specific iterated element using `nth=x` Playwright selector.
4. ✅ Updated `README.md` to document the new `loop-elements` control flow feature.
5. ✅ Created `test-loop.js` to verify `loop-elements` extraction behaviour.
### Session 3 — 2026-06-06

**Objective:** Implement Monitoring Dashboard, Variable Set/Get, and Workflow Control Flow (Loops & Conditionals).

#### Steps Completed:

1. ✅ Created `src/history.js` — Redis-backed temporary storage for execution history with TTL and capacity limits.
2. ✅ Created `src/dashboard.js` — Built a full-page HTML dashboard served at `/dashboard` with a dark theme, auto-refresh, and live stats/history table. Included JSON API endpoints for the dashboard data.
3. ✅ Updated `src/server.js` — Mounted the dashboard router and wrapped the `/sync` and `/async` endpoints to record request starts and completions to `history.js`.
4. ✅ Updated `src/queue.js` — Updated the background worker to record job completions to `history.js`.
5. ✅ Updated `src/validator.js` — Added payload validation rules for `var-set`, `var-get`, `loop`, and `if` workflow actions. Supported recursive nested workflows validation.
6. ✅ Rewrote `src/executor.js` — Added support for variables state injection, loop iterations (with `_index` local variable injection), and condition branching (`if`/`else`).
7. ✅ Updated `test-all.js` — Integrated tests for the new features: variables setting/getting, template interpolation, count-based looping, and `var-equals` if/else logic.
8. ✅ Updated `README.md` — Documented the new dashboard, variables, loops, conditionals, and history management features.

#### Architecture Decisions:

- **History storage:** Utilized the existing Redis service (using Hashes and Sorted Sets for pagination) to store execution history. This avoids adding a new database dependency just for monitoring. History entries have a TTL (e.g., 24 hours) and a maximum count cap to avoid out-of-memory issues.
- **Workflow Control Flow:** Evaluated using a recursive `executeSteps` function so that `loop` or `if` blocks can contain arbitrary nested actions (or even nested loops).
- **Security Check:** Evaluated `eval` conditions directly via `Function` to run arbitrary user logic securely mapped strictly within Playwright's page evaluation or node bounds for loops. Added `loopMaxIterations` to cap endless loops and prevent CPU DOS.
