'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const {
    listSessions,
    getSession,
    getSessionIdeas,
    deleteSession,
    validateSessionId,
    validateListQuery,
} = require('../controllers/session.controller');

const router = Router();

// All session routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/sessions
 * List sessions with pagination.
 * Query: { limit?, offset?, status? }
 */
router.get('/', validateListQuery, listSessions);

/**
 * GET /api/v1/sessions/:id
 * Get session by ID with unique ideas.
 */
router.get('/:id', validateSessionId, getSession);

/**
 * GET /api/v1/sessions/:id/ideas
 * Get all ideas for a session.
 * Query: { unique?: 'true' }
 */
router.get('/:id/ideas', validateSessionId, getSessionIdeas);

/**
 * DELETE /api/v1/sessions/:id
 * Soft-delete a session.
 */
router.delete('/:id', validateSessionId, deleteSession);

module.exports = router;
