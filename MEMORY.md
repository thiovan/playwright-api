# MEMORY.md — Playwright API Automation Engine

## Project Status: 🟢 Initial Build Complete

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

**Objective:** Create README.md and OpenAPI/Swagger documentation.

#### Steps Completed:

1. ✅ Created `README.md` — comprehensive project documentation with quick start, all 24 actions, usage examples, env vars
2. ✅ Created `docs/openapi.yaml` — OpenAPI 3.0.3 specification covering all endpoints, request/response schemas, examples
3. ✅ Integrated Swagger UI into Express server at `/api-docs` using `swagger-ui-express` + `yaml` packages
4. ✅ Updated `Dockerfile` to copy `docs/` directory
5. ✅ Added `swagger-ui-express` and `yaml` to `package.json` dependencies
6. ✅ Pinned `playwright` and `playwright-extra` versions (removed carets) to prevent Docker image mismatch

#### Bug Fix:
- **Playwright version mismatch:** `package.json` had `^1.52.0` which resolved to `1.60.0` at install time, but Docker image only has `1.52.0` browsers. Fixed by pinning to exact `1.52.0`.
