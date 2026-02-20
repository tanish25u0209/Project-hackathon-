'use strict';

const { body, param, query } = require('express-validator');
const { runResearchPipeline, deepenIdea } = require('../services/researchService');
const { addResearchJob, getJobStatus } = require('../queue/researchQueue');
const repo = require('../services/sessionRepository');
const { validateRequest } = require('../middleware/validate');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// Validation chains
// ─────────────────────────────────────────────
const validateResearchBody = [
    body('problemStatement')
        .isString()
        .withMessage('problemStatement must be a string')
        .trim()
        .isLength({ min: 20, max: 5000 })
        .withMessage('problemStatement must be between 20 and 5000 characters'),
    body('metadata')
        .optional()
        .isObject()
        .withMessage('metadata must be an object'),
    validateRequest,
];

const validateDeepenParams = [
    param('sessionId').isUUID().withMessage('sessionId must be a valid UUID'),
    param('ideaId').isUUID().withMessage('ideaId must be a valid UUID'),
    body('provider')
        .optional()
        .isString()
        .withMessage('provider must be a valid OpenRouter model ID (e.g. "anthropic/claude-3-opus")'),
    body('depthLevel')
        .optional()
        .isInt({ min: 1, max: 3 })
        .withMessage('depthLevel must be 1, 2, or 3'),
    validateRequest,
];

const validateJobParam = [
    param('jobId').isString().notEmpty().withMessage('jobId is required'),
    validateRequest,
];

const validateSessionParam = [
    param('sessionId').isUUID().withMessage('sessionId must be a valid UUID'),
    validateRequest,
];

// ─────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────

/**
 * POST /api/v1/research
 * Synchronous research pipeline — waits for full result.
 * Use for development/testing or when response time is acceptable.
 */
async function runResearch(req, res, next) {
    try {
        const { problemStatement, metadata = {} } = req.body;
        // Option B: create a session and enqueue work — return sessionId immediately
        logger.info('Creating session and enqueuing research job', {
            problemLength: problemStatement.length,
            ip: req.ip,
        });

        const session = await repo.createSession(problemStatement, {
            ...metadata,
            source: 'api-queued',
            requestIp: req.ip,
        });

        // mark as queued
        await repo.updateSessionStatus(session.id, 'pending');

        const { jobId } = await addResearchJob(problemStatement, {
            ...metadata,
            sessionId: session.id,
            source: 'api-queue',
            requestIp: req.ip,
        });

        res.status(202).json({
            success: true,
            data: {
                sessionId: session.id,
                jobId,
                message: 'Session created and research job enqueued. Poll GET /api/v1/research/:sessionId for status.',
                pollUrl: `/api/v1/research/${session.id}`,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/research/:sessionId
 * Return session status and (when available) the latest LLM response / ideas.
 */
async function getSessionStatus(req, res, next) {
    try {
        const { sessionId } = req.params;
        const session = await repo.getSessionById(sessionId);

        // If session is completed, try to include latest LLM response (fast-path friendly)
        let latestResponse = null;
        if (session.status === 'completed' || session.status === 'failed' || session.status === 'processing') {
            try {
                latestResponse = await repo.getLatestLlmResponse(sessionId);
            } catch (e) {
                // non-fatal
            }
        }

        res.status(200).json({
            success: true,
            data: {
                session,
                latestLlmResponse: latestResponse || null,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/research/async
 * Async research pipeline — enqueues job and returns jobId immediately.
 * Poll GET /api/v1/research/job/:jobId for status.
 */
async function runResearchAsync(req, res, next) {
    try {
        const { problemStatement, metadata = {} } = req.body;

        const { jobId } = await addResearchJob(problemStatement, {
            ...metadata,
            source: 'api-async',
            requestIp: req.ip,
        });

        res.status(202).json({
            success: true,
            data: {
                jobId,
                message: 'Research job enqueued. Poll /api/v1/research/job/:jobId for status.',
                pollUrl: `/api/v1/research/job/${jobId}`,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/research/job/:jobId
 * Poll job status for async research requests.
 */
async function getResearchJobStatus(req, res, next) {
    try {
        const { jobId } = req.params;
        const status = await getJobStatus(jobId);

        if (!status) {
            return next(new NotFoundError(`Job ${jobId} not found`));
        }

        res.status(200).json({
            success: true,
            data: status,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/research/:sessionId/deepen/:ideaId
 * Deepen a specific idea from a completed research session.
 */
async function deepenResearchIdea(req, res, next) {
    try {
        const { sessionId, ideaId } = req.params;
        const { provider = 'openai', depthLevel = 1 } = req.body;

        const result = await deepenIdea(sessionId, ideaId, provider, parseInt(depthLevel, 10));

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    runResearch,
    runResearchAsync,
    getResearchJobStatus,
    getSessionStatus,
    deepenResearchIdea,
    validateResearchBody,
    validateDeepenParams,
    validateJobParam,
    validateSessionParam,
};
