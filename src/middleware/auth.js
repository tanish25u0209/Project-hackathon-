'use strict';

const { timingSafeEqual } = require('crypto');
const { AuthenticationError } = require('../utils/errors');
const config = require('../config');

/**
 * API Key authentication middleware.
 * Reads X-Api-Key header and compares using timing-safe comparison
 * to prevent timing attacks.
 */
function authenticate(req, res, next) {
    const providedKey = req.headers['x-api-key'];

    if (!providedKey) {
        return next(new AuthenticationError('Missing X-Api-Key header'));
    }

    try {
        const expected = Buffer.from(config.apiKey, 'utf8');
        const provided = Buffer.from(providedKey, 'utf8');

        // Buffers must be same length for timingSafeEqual
        if (expected.length !== provided.length) {
            return next(new AuthenticationError('Invalid API key'));
        }

        if (!timingSafeEqual(expected, provided)) {
            return next(new AuthenticationError('Invalid API key'));
        }

        next();
    } catch {
        return next(new AuthenticationError('Invalid API key'));
    }
}

module.exports = { authenticate };
