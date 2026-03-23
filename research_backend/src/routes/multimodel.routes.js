'use strict';

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { globalLimiter } from '../middleware/rateLimiter.js';
import { executeMultiModel, validateMultiModelBody } from '../controllers/multimodel.controller.js';

const router = Router();

// All endpoints require authentication
router.use(authenticate);

/**
 * POST /api/v1/multimodel
 * Execute all configured models in parallel and return raw outputs.
 * Body: { input: string }
 * Response: { input, results: [ { model, output } | { model, error } ] }
 */
router.post('/', globalLimiter, validateMultiModelBody, executeMultiModel);

export default router;
