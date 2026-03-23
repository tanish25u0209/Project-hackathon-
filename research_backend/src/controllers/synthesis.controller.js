'use strict';

import { param, query } from 'express-validator';
import { validateRequest } from '../middleware/validate.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import rawOutputRepo from '../services/rawOutputRepository.js';
import SynthesisEngine from '../services/synthesisEngine.js';

/**
 * Validation chain for synthesis endpoint
 */
const validateSynthesisParams = [
    param('sessionId').isUUID().withMessage('sessionId must be a valid UUID'),
    validateRequest,
];

/**
 * POST /api/v1/sessions/:sessionId/synthesize
 * Synthesize raw model outputs into strategic ideas using the advanced research intelligence engine.
 * Requires a sessionId from a prior multimodel request.
 */
async function synthesizeSession(req, res, next) {
    try {
        const { sessionId } = req.params;
        const { includeRaw } = req.query;

        logger.info('Synthesis request received', { sessionId, includeRaw });

        // Step 1: Retrieve stored raw outputs
        const rawOutputs = await rawOutputRepo.getSuccessfulOutputsBySessionId(sessionId);

        if (rawOutputs.length === 0) {
            return next(
                new NotFoundError(
                    `No successful model outputs found for session ${sessionId}. Run multimodel first.`
                )
            );
        }

        logger.debug('Raw outputs retrieved', { sessionId, count: rawOutputs.length });

        // Step 2: Initialize synthesis engine and synthesize
        const engine = new SynthesisEngine();
        const synthesized = engine.synthesize(rawOutputs);

        logger.info('Synthesis complete', {
            sessionId,
            uniqueIdeas: synthesized.uniqueIdeas.length,
        });

        // Step 3: Build response
        const response = {
            sessionId,
            ...synthesized,
        };

        // Optionally include raw outputs
        if (includeRaw === 'true' || includeRaw === '1') {
            response.rawOutputs = rawOutputs.map((output) => ({
                model: output.model,
                output: output.raw_output,
                status: output.status,
                latencyMs: output.latency_ms,
            }));
        }

        return res.status(200).json({
            success: true,
            data: response,
        });
    } catch (err) {
        logger.error('Synthesis failed', { error: err.message });
        return next(new AppError(err.message, 500, 'SYNTHESIS_FAILED'));
    }
}

export { validateSynthesisParams, synthesizeSession };
