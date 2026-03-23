'use strict';

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { synthesizeSession, validateSynthesisParams } from '../controllers/synthesis.controller.js';

const router = Router();

// All synthesis routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/sessions/:sessionId/synthesize
 * Synthesize stored raw model outputs into strategic ideas
 * Query param: includeRaw=true (optional) - Include raw model outputs in response
 */
router.post('/:sessionId/synthesize', validateSynthesisParams, synthesizeSession);

export default router;
