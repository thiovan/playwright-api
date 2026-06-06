/**
 * Entry Point
 *
 * Starts the Express HTTP server and BullMQ worker in a single process.
 * Handles graceful shutdown on SIGTERM / SIGINT.
 */

const app = require('./server');
const { startWorker } = require('./queue');
const config = require('./config');

// ── Start HTTP server ─────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`[Server] Playwright API running on port ${config.port}`);
  console.log(`[Server] Endpoints:`);
  console.log(`  GET  /api/v1/health`);
  console.log(`  POST /api/v1/sync`);
  console.log(`  POST /api/v1/async`);
});

// ── Start BullMQ worker ───────────────────────────────────────────────────────
let worker;
try {
  worker = startWorker();
} catch (err) {
  console.warn(`[Worker] Failed to start worker (Redis may be unavailable): ${err.message}`);
  console.warn(`[Worker] Async endpoint will queue jobs but they won't be processed until Redis is available.`);
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new HTTP connections
  server.close(() => {
    console.log('[Shutdown] HTTP server closed.');
  });

  // Close the BullMQ worker
  if (worker) {
    try {
      await worker.close();
      console.log('[Shutdown] Worker closed.');
    } catch (err) {
      console.error('[Shutdown] Error closing worker:', err.message);
    }
  }

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[Shutdown] Forced exit after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
