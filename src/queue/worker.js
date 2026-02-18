'use strict';

require('dotenv').config();

const { Worker } = require('bullmq');
const config = require('../config');
const { runResearchPipeline } = require('../services/researchService');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// BullMQ Worker — standalone process
// Run with: node src/queue/worker.js
// ─────────────────────────────────────────────

const worker = new Worker(
    config.queue.name,
    async (job) => {
        const { problemStatement, metadata } = job.data;

        logger.info('Processing research job', {
            jobId: job.id,
            problemLength: problemStatement?.length,
        });

        // Report progress: 10% — job started
        await job.updateProgress(10);

        const result = await runResearchPipeline(problemStatement, {
            ...metadata,
            jobId: job.id,
            source: 'queue',
        });

        // Report progress: 100% — done
        await job.updateProgress(100);

        logger.info('Research job completed', {
            jobId: job.id,
            sessionId: result.sessionId,
            uniqueIdeas: result.summary?.uniqueIdeasReturned,
        });

        return result;
    },
    {
        connection: {
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            tls: config.redis.tls,
        },
        concurrency: config.queue.concurrency,
        // Stalled job detection: if a job doesn't heartbeat within 30s, mark as stalled
        stalledInterval: 30000,
        maxStalledCount: 1,
    }
);

// ─────────────────────────────────────────────
// Worker event handlers
// ─────────────────────────────────────────────
worker.on('completed', (job, result) => {
    logger.info('Job completed', {
        jobId: job.id,
        sessionId: result?.sessionId,
    });
});

worker.on('failed', (job, err) => {
    logger.error('Job failed', {
        jobId: job?.id,
        error: err.message,
        attempts: job?.attemptsMade,
    });
});

worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
});

worker.on('stalled', (jobId) => {
    logger.warn('Job stalled', { jobId });
});

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────
async function shutdown(signal) {
    logger.info(`Worker received ${signal}, shutting down gracefully...`);
    await worker.close();
    logger.info('Worker closed');
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info('Research queue worker started', {
    queue: config.queue.name,
    concurrency: config.queue.concurrency,
});
