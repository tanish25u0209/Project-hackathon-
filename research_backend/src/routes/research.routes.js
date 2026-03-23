'use strict';

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { researchLimiter } from '../middleware/rateLimiter.js';
import {
    runResearch,
    runResearchAsync,
    getResearchJobStatus,
    getSessionStatus,
    deepenResearchIdea,
    validateResearchBody,
    validateDeepenParams,
    validateJobParam,
    validateSessionParam,
} from '../controllers/research.controller.js';

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

export default router;
