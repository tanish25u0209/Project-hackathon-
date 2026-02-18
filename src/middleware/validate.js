'use strict';

const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Middleware to run after express-validator chains.
 * Collects all validation errors and throws a ValidationError if any exist.
 */
function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const details = errors.array().map((e) => ({
            field: e.path || e.param,
            message: e.msg,
            value: e.value,
        }));
        return next(new ValidationError('Request validation failed', details));
    }
    next();
}

module.exports = { validateRequest };
