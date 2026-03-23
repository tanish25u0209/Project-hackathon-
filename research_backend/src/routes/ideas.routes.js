'use strict';

import { Router } from 'express';
import * as ideasController from '../controllers/ideas.controller.js';
import { validateRequest } from '../middleware/validate.js';
import { requireJwtAuth } from '../middleware/jwtAuth.js';

const router = Router();

// Require JWT auth for all idea routes
router.use(requireJwtAuth);

// ─────────────────────────────────────────────
// POST /api/v1/ideas/save - Save/like an idea
// ─────────────────────────────────────────────
router.post('/save', (req, res, next) => {
    validateRequest(req, res, () => ideasController.saveIdea(req, res, next));
});

// ─────────────────────────────────────────────
// GET /api/v1/ideas/saved - Get all saved ideas (with filters)
// ─────────────────────────────────────────────
router.get('/saved', (req, res, next) => {
    ideasController.getSavedIdeas(req, res, next);
});

// ─────────────────────────────────────────────
// GET /api/v1/ideas/:ideaId - Get single idea
// ─────────────────────────────────────────────
router.get('/:ideaId', (req, res, next) => {
    ideasController.getIdeaById(req, res, next);
});

// ─────────────────────────────────────────────
// PATCH /api/v1/ideas/:ideaId - Update idea (notes, tags)
// ─────────────────────────────────────────────
router.patch('/:ideaId', (req, res, next) => {
    ideasController.updateIdea(req, res, next);
});

// ─────────────────────────────────────────────
// DELETE /api/v1/ideas/:ideaId - Delete idea
// ─────────────────────────────────────────────
router.delete('/:ideaId', (req, res, next) => {
    ideasController.deleteIdea(req, res, next);
});

// ─────────────────────────────────────────────
// POST /api/v1/ideas/:ideaId/rate - Rate an idea (1-5)
// ─────────────────────────────────────────────
router.post('/:ideaId/rate', (req, res, next) => {
    ideasController.rateIdea(req, res, next);
});

// ─────────────────────────────────────────────
// GET /api/v1/ideas/:ideaId/related - Get related ideas
// ─────────────────────────────────────────────
router.get('/:ideaId/related', (req, res, next) => {
    ideasController.getRelatedIdeas(req, res, next);
});

export default router;
