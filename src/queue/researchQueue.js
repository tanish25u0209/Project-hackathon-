'use strict';

const { Queue } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// BullMQ Queue singleton
// ─────────────────────────────────────────────
const researchQueue = new Queue(config.queue.name, {
    connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        tls: config.redis.tls,
    },
    defaultJobOptions: {
        attempts: config.queue.attempts,
        backoff: {
            type: 'exponential',
            delay: config.queue.backoffMs,
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    },
});

researchQueue.on('error', (err) => {
    logger.error('Research queue error', { error: err.message });
});

/**
 * Add a research job to the queue.
 * @param {string} problemStatement
 * @param {Object} metadata
 * @returns {Promise<{ jobId: string }>}
 */
async function addResearchJob(problemStatement, metadata = {}) {
    const job = await researchQueue.add(
        'run-research',
        { problemStatement, metadata },
        {
            jobId: `research-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }
    );

    logger.info('Research job enqueued', { jobId: job.id });
    return { jobId: job.id };
}

/**
 * Get job status and result.
 * @param {string} jobId
 * @returns {Promise<Object|null>}
 */
async function getJobStatus(jobId) {
    const job = await researchQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress;

    return {
        jobId: job.id,
        state,
        progress,
        data: job.data,
        result: job.returnvalue || null,
        failedReason: job.failedReason || null,
        processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        createdAt: new Date(job.timestamp).toISOString(),
    };
}

module.exports = { researchQueue, addResearchJob, getJobStatus };
