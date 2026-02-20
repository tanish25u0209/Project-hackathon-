'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { researchLimiter } = require('../middleware/rateLimiter');
const {
    runResearch,
    runResearchAsync,
    getResearchJobStatus,
    getSessionStatus,
    deepenResearchIdea,
    validateResearchBody,
    validateDeepenParams,
    validateJobParam,
    validateSessionParam,
} = require('../controllers/research.controller');

const router = Router();

// All research routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/research
 * Synchronous research pipeline.
 * Body: { problemStatement: string, metadata?: object }
 */
router.post('/', researchLimiter, validateResearchBody, runResearch);

/**
 * GET /api/v1/research/:sessionId
 * Poll session status by sessionId (returns session + latest LLM response when available)
 */
router.get('/:sessionId', validateSessionParam, getSessionStatus);

/**
 * POST /api/v1/research/async
 * Async research pipeline — returns jobId immediately.
 * Body: { problemStatement: string, metadata?: object }
 */
router.post('/async', researchLimiter, validateResearchBody, runResearchAsync);

/**
 * GET /api/v1/research/job/:jobId
 * Poll async job status.
 */
router.get('/job/:jobId', validateJobParam, getResearchJobStatus);

/**
 * POST /api/v1/research/:sessionId/deepen/:ideaId
 * Deepen a specific idea.
 * Body: { provider?: string, depthLevel?: number }
 */
router.post('/:sessionId/deepen/:ideaId', validateDeepenParams, deepenResearchIdea);

module.exports = router;
