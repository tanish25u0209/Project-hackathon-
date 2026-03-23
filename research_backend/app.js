'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const hpp = require('hpp');

const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ─────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────

// Helmet: sets security headers (HSTS, CSP, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false,
}));

// CORS: configure allowed origins
app.use(cors({
  origin: config.isProduction ? process.env.ALLOWED_ORIGINS?.split(',') || false : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
}));

// HPP: prevents HTTP parameter pollution
app.use(hpp());

// ─────────────────────────────────────────────
// Performance Middleware
// ─────────────────────────────────────────────
app.use(compression());

// ─────────────────────────────────────────────
// Body Parsing — strict size limits
// ─────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// ─────────────────────────────────────────────
// Request Logging
// ─────────────────────────────────────────────
const morganFormat = config.isProduction
  ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
  : 'dev';

app.use(morgan(morganFormat, {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ─────────────────────────────────────────────
// Trust proxy (for accurate IPs behind load balancer)
// ─────────────────────────────────────────────
if (config.isProduction) {
  app.set('trust proxy', 1);
}

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use('/api/v1', routes);

// ─────────────────────────────────────────────
// Error Handlers (must be last)
// ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const server = app.listen(config.port, () => {
  logger.info(`Research Engine API started`, {
    port: config.port,
    env: config.env,
    nodeVersion: process.version,
  });
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      const { pool } = require('./db/pool');
      await pool.end();
      logger.info('Database pool closed');
    } catch (err) {
      logger.error('Error closing DB pool', { error: err.message });
    }

    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled errors — log and exit to let process manager restart
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
  // In production, restart the process rather than continuing in broken state
  if (config.isProduction) process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = app;
