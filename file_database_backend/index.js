// src/index.js
// ─────────────────────────────────────────────────────────────────────────────
// Application entry point.
//
// Startup order matters:
//   1. Load environment variables (dotenv) BEFORE anything else reads them.
//   2. Validate required env vars so we fail fast with a clear message.
//   3. Register middleware, routes, then the error handler (must be last).
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ── 1. Environment ─────────────────────────────────────────────────────────
require('dotenv').config();

const authMode = (process.env.GOOGLE_AUTH_MODE || 'auto').toLowerCase();

const baseRequiredVars = ['GOOGLE_DRIVE_FOLDER_ID'];
const serviceAccountVars = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'];
const oauthVars = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REFRESH_TOKEN'];

let requiredVars = [...baseRequiredVars];

if (authMode === 'oauth2') {
  requiredVars = requiredVars.concat(oauthVars);
} else if (authMode === 'service_account') {
  requiredVars = requiredVars.concat(serviceAccountVars);
} else {
  const hasOAuth = oauthVars.every((v) => Boolean(process.env[v]));
  if (hasOAuth) {
    requiredVars = requiredVars.concat(oauthVars);
  } else {
    requiredVars = requiredVars.concat(serviceAccountVars);
  }
}

const missingVars = requiredVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `[FATAL] Missing required environment variable(s): ${missingVars.join(', ')}\n` +
    'Copy .env.example to .env and fill in the values.'
  );
  process.exit(1);
}

// ── 2. Imports ─────────────────────────────────────────────────────────────
const express                    = require('express');
const { globalErrorHandler }     = require('./middleware/errorHandler');
const fileRoutes                 = require('./routes/files');

// ── 3. App Configuration ───────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies for non-file endpoints
app.use(express.json());

// ── 4. Health Check ────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'gdrive-large-file-backend',
  });
});

// ── 5. Routes ──────────────────────────────────────────────────────────────
//
// All file-related endpoints (/upload, /file/:fileId, /file/:fileId/meta)
// are grouped under the fileRoutes router.
app.use('/', fileRoutes);

// ── 6. 404 Catch-All ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── 7. Global Error Handler ────────────────────────────────────────────────
// IMPORTANT: Must be registered AFTER all routes and other middleware.
// Express identifies it as an error handler via the 4-argument signature.
app.use(globalErrorHandler);

// ── 8. Start Server ────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────────────────┐
  │  Google Drive File Backend                       │
  │  Listening on http://localhost:${PORT}              │
  │                                                  │
  │  POST /upload           → stream file to Drive   │
  │  GET  /file/:fileId     → stream file from Drive │
  │  GET  /file/:fileId/meta→ fetch file metadata    │
  │  GET  /health           → health check           │
  └──────────────────────────────────────────────────┘
  `);
});

// ── 9. Graceful Shutdown ───────────────────────────────────────────────────
// Allow in-flight streams to complete before closing. This prevents corrupt
// partial uploads/downloads when the process receives SIGTERM (e.g. from
// a container orchestrator like Kubernetes).
function shutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing server gracefully...`);
  server.close(() => {
    console.log('[SHUTDOWN] All connections drained. Exiting.');
    process.exit(0);
  });

  // Force exit after 30s if connections remain open (e.g. a hung stream)
  setTimeout(() => {
    console.error('[SHUTDOWN] Timeout reached. Forcing exit.');
    process.exit(1);
  }, 30_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled rejections that escape async route handlers
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  // In production you may want to trigger an alert here instead of crashing
});

module.exports = app; // Export for testing
