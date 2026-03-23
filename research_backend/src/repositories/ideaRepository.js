'use strict';

import { pool } from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Save a new idea
 */
export async function create(userId, ideaData) {
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
    } = ideaData;

    const id = uuidv4();
    const now = new Date();

    const query = `
        INSERT INTO saved_ideas (
            id, user_id, session_id, idea_id, title, description, 
            strategic_thesis, mechanism, implementation_framework, 
            idea_type, derived_from_models, support_count, confidence, saved_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
    `;

    const result = await pool.query(query, [
        id,
        userId,
        sessionId,
        ideaId,
        title,
        description,
        strategicThesis,
        mechanism,
        JSON.stringify(implementationFramework),
        ideaType,
        JSON.stringify(derivedFromModels),
        supportCount,
        confidence,
        now,
        now,
    ]);

    return result.rows[0];
}

/**
 * Get a saved idea by ID
 */
export async function findById(ideaId) {
    const query = `SELECT * FROM saved_ideas WHERE id = $1;`;
    const result = await pool.query(query, [ideaId]);
    return result.rows[0] || null;
}

/**
 * Check if idea is already saved by user
 */
export async function findBySavedIdea(userId, ideaIdValue) {
    const query = `SELECT * FROM saved_ideas WHERE user_id = $1 AND idea_id = $2;`;
    const result = await pool.query(query, [userId, ideaIdValue]);
    return result.rows[0] || null;
}

/**
 * Get all saved ideas for a user with filtering, searching, sorting, and pagination
 * @param {string} userId 
 * @param {object} options - { page, limit, sortBy, order, filter, search }
 */
export async function findByUser(userId, options = {}) {
    const {
        page = 1,
        limit = 10,
        sortBy = 'saved_at',
        order = 'DESC',
        filter = 'all', // all, rated, tagged
        search = '',
    } = options;

    const offset = (page - 1) * limit;
    const validSortBy = ['saved_at', 'updated_at', 'rating', 'title'];
    const validOrder = ['ASC', 'DESC'];
    const sortColumn = validSortBy.includes(sortBy) ? sortBy : 'saved_at';
    const orderDir = validOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    let whereConditions = ['user_id = $1'];
    let paramIndex = 2;
    const params = [userId];

    // Filter by rating or tags
    if (filter === 'rated') {
        whereConditions.push(`rating > 0`);
    } else if (filter === 'tagged') {
        whereConditions.push(`tags IS NOT NULL AND jsonb_array_length(tags) > 0`);
    }

    // Search in title and description
    if (search && search.trim()) {
        whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Total count query
    const countQuery = `SELECT COUNT(*) FROM saved_ideas WHERE ${whereClause};`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
        SELECT * FROM saved_ideas 
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${orderDir}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataParams = [...params, limit, offset];
    const result = await pool.query(dataQuery, dataParams);

    return {
        data: result.rows,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
}

/**
 * Count total saved ideas for a user
 */
export async function countByUser(userId) {
    const query = `SELECT COUNT(*) FROM saved_ideas WHERE user_id = $1;`;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
}

/**
 * Update idea (notes and tags)
 */
export async function update(ideaId, updateData) {
    const { notes, tags } = updateData;
    const now = new Date();

    const query = `
        UPDATE saved_ideas 
        SET notes = $1, tags = $2, updated_at = $3
        WHERE id = $4
        RETURNING *;
    `;

    const result = await pool.query(query, [
        notes,
        tags ? JSON.stringify(tags) : null,
        now,
        ideaId,
    ]);

    return result.rows[0] || null;
}

/**
 * Delete a saved idea
 */
export async function deleteIdea(ideaId) {
    const query = `DELETE FROM saved_ideas WHERE id = $1 RETURNING *;`;
    const result = await pool.query(query, [ideaId]);
    return result.rows[0] || null;
}

/**
 * Rate an idea (1-5 stars)
 */
export async function rateIdea(ideaId, rating) {
    const now = new Date();

    const query = `
        UPDATE saved_ideas 
        SET rating = $1, updated_at = $2
        WHERE id = $3
        RETURNING *;
    `;

    const result = await pool.query(query, [rating, now, ideaId]);
    return result.rows[0] || null;
}

/**
 * Find related ideas (same type + matching tags)
 */
export async function findRelated(userId, ideaId, limit = 5) {
    const query = `
        SELECT * FROM saved_ideas 
        WHERE user_id = $1 
        AND id != $2 
        AND idea_type = (SELECT idea_type FROM saved_ideas WHERE id = $2)
        AND (tags @> (SELECT tags FROM saved_ideas WHERE id = $2) OR tags IS NULL)
        ORDER BY rating DESC, updated_at DESC
        LIMIT $3;
    `;

    const result = await pool.query(query, [userId, ideaId, limit]);
    return result.rows;
}

/**
 * Find all ideas from a synthesis session
 */
export async function findBySession(sessionId) {
    const query = `SELECT * FROM saved_ideas WHERE session_id = $1 ORDER BY saved_at DESC;`;
    const result = await pool.query(query, [sessionId]);
    return result.rows;
}
