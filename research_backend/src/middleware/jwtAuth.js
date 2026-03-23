'use strict';

import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AuthenticationError } from '../utils/errors.js';

function requireJwtAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
        return next(new AuthenticationError('Missing or invalid Authorization header'));
    }

    const token = authHeader.slice(7).trim();

    try {
        const payload = jwt.verify(token, config.jwtSecret);
        req.user = {
            id: payload.sub,
            username: payload.username,
        };
        return next();
    } catch {
        return next(new AuthenticationError('Invalid or expired token'));
    }
}

export { requireJwtAuth };
