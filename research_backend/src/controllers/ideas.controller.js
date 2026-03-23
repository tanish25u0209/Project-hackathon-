'use strict';

import * as ideaRepository from '../repositories/ideaRepository.js';
import * as sessionRepository from '../services/sessionRepository.js';
import { AppError } from '../utils/errors.js';

/**
 * Save an idea (like/bookmark)
 */
export async function saveIdea(req, res, next) {
    try {
        const userId = req.user?.id || req.userId;
        const {
            sessionId,
            ideaId,
            title,
            description,
            strategicThesis,
            mechanism,
            implementationFramework,
            ideaType,
            derivedFromModels,
            supportCount,
            confidence,
        } = req.body;

        // Validate required fields
        if (!sessionId || !ideaId || !title || !ideaType) {
            throw new AppError('Missing required fields: sessionId, ideaId, title, ideaType', 400);
        }

        // Verify session exists and belongs to user
        const session = await sessionRepository.getSessionById(sessionId);
        if (!session) {
            throw new AppError('Session not found', 404);
        }
        if (session.user_id && session.user_id !== userId) {
            throw new AppError('Unauthorized access to session', 403);
        }

        // Check if idea already saved
        const existing = await ideaRepository.findBySavedIdea(userId, ideaId);
        if (existing) {
            throw new AppError('Idea already saved', 409);
        }

        // Save the idea
        const saved = await ideaRepository.create(userId, {
            sessionId,
            ideaId,
            title,
            description: description || '',
            strategicThesis: strategicThesis || '',
            mechanism: mechanism || '',
            implementationFramework: implementationFramework || {},
            ideaType,
            derivedFromModels: derivedFromModels || [],
            supportCount: supportCount || 0,
            confidence: confidence || 0,
        });

        res.status(201).json({
            success: true,
            data: {
                id: saved.id,
                ideaId: saved.idea_id,
                title: saved.title,
                savedAt: saved.saved_at,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all saved ideas for user with filters
 */
export async function getSavedIdeas(req, res, next) {
    try {
        const userId = req.user?.id || req.userId;
        const {
            page = 1,
            limit = 10,
            sortBy = 'saved_at',
            order = 'DESC',
            filter = 'all',
            search = '',
        } = req.query;

        const result = await ideaRepository.findByUser(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            order,
            filter, // all, rated, tagged
            search,
        });

        res.status(200).json({
            success: true,
            data: result.data.map((idea) => ({
                id: idea.id,
                ideaId: idea.idea_id,
                title: idea.title,
                description: idea.description,
                ideaType: idea.idea_type,
                rating: idea.rating,
                notes: idea.notes,
                tags: idea.tags,
                savedAt: idea.saved_at,
                updatedAt: idea.updated_at,
            })),
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get a single idea by ID
 */
export async function getIdeaById(req, res, next) {
    try {
        const userId = req.user?.id || req.userId;
        const { ideaId } = req.params;

        const idea = await ideaRepository.findById(ideaId);
        if (!idea) {
            throw new AppError('Idea not found', 404);
        }

        // Verify ownership
        if (idea.user_id !== userId) {
            throw new AppError('Unauthorized access to idea', 403);
        }

        res.status(200).json({
            success: true,
            data: {
                id: idea.id,
                ideaId: idea.idea_id,
                title: idea.title,
                description: idea.description,
                strategicThesis: idea.strategic_thesis,
                mechanism: idea.mechanism,
                implementationFramework: idea.implementation_framework,
                ideaType: idea.idea_type,
                derivedFromModels: idea.derived_from_models,
                supportCount: idea.support_count,
                confidence: idea.confidence,
                rating: idea.rating,
                notes: idea.notes,
                tags: idea.tags,
                savedAt: idea.saved_at,
                updatedAt: idea.updated_at,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update idea (notes and tags)
 */
export async function updateIdea(req, res, next) {
    try {
        const userId = req.user?.id || req.userId;
        const { ideaId } = req.params;
        const { notes, tags } = req.body;

        const idea = await ideaRepository.findById(ideaId);
        if (!idea) {
            throw new AppError('Idea not found', 404);
        }

        if (idea.user_id !== userId) {
            throw new AppError('Unauthorized access to idea', 403);
        }

        const updated = await ideaRepository.update(ideaId, { notes, tags });

        res.status(200).json({
            success: true,
            data: {
                id: updated.id,
                title: updated.title,
                notes: updated.notes,
                tags: updated.tags,
                updatedAt: updated.updated_at,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete a saved idea
 */
export async function deleteIdea(req, res, next) {
    try {
        const userId = req.user?.id || req.userId;
        const { ideaId } = req.params;

        const idea = await ideaRepository.findById(ideaId);
        if (!idea) {
            throw new AppError('Idea not found', 404);
        }

        if (idea.user_id !== userId) {
            throw new AppError('Unauthorized access to idea', 403);
        }

        await ideaRepository.deleteIdea(ideaId);

        res.status(200).json({
            success: true,
            data: { id: ideaId, deleted: true },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Rate an idea (1-5 stars)
 */
export async function rateIdea(req, res, next) {
    try {
        const userId = req.user?.id || req.userId;
        const { ideaId } = req.params;
        const { rating } = req.body;

        // Validate rating
        if (typeof rating !== 'number' || rating < 0 || rating > 5) {
            throw new AppError('Rating must be between 0 and 5', 400);
        }

        const idea = await ideaRepository.findById(ideaId);
        if (!idea) {
            throw new AppError('Idea not found', 404);
        }

        if (idea.user_id !== userId) {
            throw new AppError('Unauthorized access to idea', 403);
        }

        const updated = await ideaRepository.rateIdea(ideaId, rating);

        res.status(200).json({
            success: true,
            data: {
                id: updated.id,
                title: updated.title,
                rating: updated.rating,
                updatedAt: updated.updated_at,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get related ideas (same type, matching tags)
 */
export async function getRelatedIdeas(req, res, next) {
    try {
        const userId = req.user?.id || req.userId;
        const { ideaId } = req.params;
        const { limit = 5 } = req.query;

        const idea = await ideaRepository.findById(ideaId);
        if (!idea) {
            throw new AppError('Idea not found', 404);
        }

        if (idea.user_id !== userId) {
            throw new AppError('Unauthorized access to idea', 403);
        }

        const related = await ideaRepository.findRelated(userId, ideaId, parseInt(limit));

        res.status(200).json({
            success: true,
            data: related.map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                ideaType: r.idea_type,
                rating: r.rating,
                tags: r.tags,
                updatedAt: r.updated_at,
            })),
        });
    } catch (error) {
        next(error);
    }
}
