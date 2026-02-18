'use strict';

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * 404 handler — must be registered after all routes.
 */
function notFoundHandler(req, res, next) {
    next(new AppError(`Route ${req.method} ${req.path} not found`, 404, 'NOT_FOUND'));
}

/**
 * Global error handler — must be the last middleware registered.
 * Maps AppError subclasses to structured HTTP responses.
 * Sanitizes stack traces in production.
 */
function globalErrorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
    const isProduction = process.env.NODE_ENV === 'production';

    // Default to 500 for non-operational errors
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const isOperational = err.isOperational === true;

    // Log all errors — include stack for non-operational (programming bugs)
    if (isOperational) {
        logger.warn('Operational error', {
            code,
            statusCode,
            message: err.message,
            path: req.path,
            method: req.method,
        });
    } else {
        logger.error('Unexpected error', {
            code,
            statusCode,
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        });
    }

    // Build response body
    const body = {
        success: false,
        error: {
            code,
            message: isProduction && !isOperational ? 'An unexpected error occurred' : err.message,
        },
    };

    // Include details only for operational errors (validation, provider errors, etc.)
    if (err.details && isOperational) {
        body.error.details = err.details;
    }

    // Include stack trace in development
    if (!isProduction && err.stack) {
        body.error.stack = err.stack;
    }

    res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, globalErrorHandler };
