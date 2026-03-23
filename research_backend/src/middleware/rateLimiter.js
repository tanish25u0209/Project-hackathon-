'use strict';

import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { RateLimitError } from '../utils/errors.js';

/**
 * Create a rate limiter with a custom error handler.
 * @param {number} max - Max requests per window
 * @param {string} [message] - Custom error message
 */
function createLimiter(max, message = 'Too many requests, please try again later') {
    return rateLimit({
        windowMs: config.rateLimit.windowMs,
        max,
        standardHeaders: true,  // Return rate limit info in RateLimit-* headers
        legacyHeaders: false,
        handler: (req, res, next) => {
            next(new RateLimitError(message));
        },
        // Use IP + API key as the key to allow higher limits per authenticated client
        keyGenerator: (req) => {
            const apiKey = req.headers['x-api-key'];
            return apiKey ? `${req.ip}:${apiKey}` : req.ip;
        },
    });
}

// Global limiter: 100 requests per 15 minutes
const globalLimiter = createLimiter(
    config.rateLimit.globalMax,
    'Global rate limit exceeded. Please slow down.'
);

// Research limiter: 20 requests per 15 minutes (expensive endpoint)
const researchLimiter = createLimiter(
    config.rateLimit.researchMax,
    'Research rate limit exceeded. Each research call is expensive — please wait before retrying.'
);

export { globalLimiter, researchLimiter };
