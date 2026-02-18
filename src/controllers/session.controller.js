'use strict';

const { param, query } = require('express-validator');
const repo = require('../services/sessionRepository');
const { validateRequest } = require('../middleware/validate');
const { NotFoundError } = require('../utils/errors');

// ─────────────────────────────────────────────
// Validation chains
// ─────────────────────────────────────────────
const validateSessionId = [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    validateRequest,
];

const validateListQuery = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit must be between 1 and 100'),
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('offset must be a non-negative integer'),
    query('status')
        .optional()
        .isIn(['pending', 'processing', 'completed', 'failed'])
        .withMessage('status must be one of: pending, processing, completed, failed'),
    validateRequest,
];

// ─────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────

/**
 * GET /api/v1/sessions
 * List sessions with pagination.
 */
async function listSessions(req, res, next) {
    try {
        const limit = parseInt(req.query.limit || '20', 10);
        const offset = parseInt(req.query.offset || '0', 10);
        const { status } = req.query;

        const { sessions, total } = await repo.listSessions({ limit, offset, status });

        res.status(200).json({
            success: true,
            data: {
                sessions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total,
                },
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/sessions/:id
 * Get a session by ID with its unique ideas.
 */
async function getSession(req, res, next) {
    try {
        const { id } = req.params;
        const [session, ideas] = await Promise.all([
            repo.getSessionById(id),
            repo.getSessionIdeas(id, true), // unique only
        ]);

        res.status(200).json({
            success: true,
            data: { session, uniqueIdeas: ideas },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/sessions/:id/ideas
 * Get all ideas for a session (including duplicates).
 */
async function getSessionIdeas(req, res, next) {
    try {
        const { id } = req.params;
        const uniqueOnly = req.query.unique === 'true';

        // Verify session exists first
        await repo.getSessionById(id);
        const ideas = await repo.getSessionIdeas(id, uniqueOnly);

        res.status(200).json({
            success: true,
            data: { ideas, count: ideas.length },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/v1/sessions/:id
 * Soft-delete a session.
 */
async function deleteSession(req, res, next) {
    try {
        const { id } = req.params;
        await repo.deleteSession(id);

        res.status(200).json({
            success: true,
            data: { message: `Session ${id} deleted successfully` },
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listSessions,
    getSession,
    getSessionIdeas,
    deleteSession,
    validateSessionId,
    validateListQuery,
};
