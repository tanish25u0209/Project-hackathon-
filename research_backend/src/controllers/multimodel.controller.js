'use strict';

import { body, param } from 'express-validator';
import { runMultiModelResearch } from '../services/researchService.js';
import { validateRequest } from '../middleware/validate.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import repo from '../services/sessionRepository.js';
import rawOutputRepo from '../services/rawOutputRepository.js';

// Validation chain for multi-model research
const validateMultiModelBody = [
    body('input')
        .isString()
        .withMessage('input must be a string')
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('input must be between 10 and 5000 characters'),
    validateRequest,
];

/**
 * POST /api/v1/multimodel
 * Execute all configured models in parallel, store raw outputs, and return structured results.
 * Creates a session to track the research and enables synthesis endpoint to work with stored data.
 */
async function executeMultiModel(req, res, next) {
    try {
        const { input } = req.body;

        logger.info('Multi-model research request received', { inputLength: input.length });

        // Step 1: Create a session to track all outputs
        const session = await repo.createSession(input, { type: 'multimodel' });
        const sessionId = session.id;
        logger.debug('Session created', { sessionId });

        // Step 2: Run all models in parallel
        const startTime = Date.now();
        const result = await runMultiModelResearch(input);
        const duration = Date.now() - startTime;

        // Step 3: Store raw outputs in database
        try {
            for (const resultItem of result.results) {
                const outputData = {
                    output: resultItem.output || null,
                    error: resultItem.error || null,
                    latencyMs: resultItem.latencyMs || 0,
                    promptTokens: resultItem.promptTokens || 0,
                    completionTokens: resultItem.completionTokens || 0,
                };
                await rawOutputRepo.saveRawOutput(sessionId, resultItem.model, outputData);
            }
            logger.debug('Raw outputs stored', { sessionId, count: result.results.length });
        } catch (storageErr) {
            logger.warn('Failed to store raw outputs', { error: storageErr.message });
            // Don't fail the request; just log warning
        }

        logger.info('Multi-model research completed', {
            duration,
            successCount: result.successCount,
            failureCount: result.failureCount,
            sessionId,
        });

        return res.status(200).json({
            success: true,
            data: {
                ...result,
                sessionId, // Return sessionId for synthesis queries
            },
            duration,
        });
    } catch (err) {
        logger.error('Multi-model research failed', { error: err.message });
        return next(new AppError(err.message, 500, 'MULTIMODEL_RESEARCH_FAILED'));
    }
}

export {
    validateMultiModelBody,
    executeMultiModel,
};
