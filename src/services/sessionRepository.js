'use strict';

const { query, withTransaction } = require('../db/pool');
const { DatabaseError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────

/**
 * Create a new research session.
 * @param {string} problemStatement
 * @param {Object} metadata
 * @returns {Promise<{ id: string, status: string, created_at: Date }>}
 */
async function createSession(problemStatement, metadata = {}) {
    try {
        const { rows } = await query(
            `INSERT INTO research_sessions (problem_statement, metadata, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, status, created_at`,
            [problemStatement, JSON.stringify(metadata)]
        );
        return rows[0];
    } catch (err) {
        throw new DatabaseError(`Failed to create session: ${err.message}`);
    }
}

/**
 * Update session status.
 * @param {string} sessionId
 * @param {'pending'|'processing'|'completed'|'failed'} status
 */
async function updateSessionStatus(sessionId, status) {
    try {
        await query(
            `UPDATE research_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
            [status, sessionId]
        );
    } catch (err) {
        throw new DatabaseError(`Failed to update session status: ${err.message}`);
    }
}

/**
 * Get a session by ID (excludes soft-deleted).
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
async function getSessionById(sessionId) {
    try {
        const { rows } = await query(
            `SELECT id, problem_statement, status, metadata, created_at, updated_at
       FROM research_sessions
       WHERE id = $1 AND deleted_at IS NULL`,
            [sessionId]
        );
        if (rows.length === 0) throw new NotFoundError(`Session ${sessionId} not found`);
        return rows[0];
    } catch (err) {
        if (err instanceof NotFoundError) throw err;
        throw new DatabaseError(`Failed to get session: ${err.message}`);
    }
}

/**
 * List sessions with pagination (excludes soft-deleted).
 * @param {{ limit: number, offset: number, status?: string }} opts
 * @returns {Promise<{ sessions: Array, total: number }>}
 */
async function listSessions({ limit = 20, offset = 0, status } = {}) {
    try {
        const params = [limit, offset];
        let whereClause = 'WHERE deleted_at IS NULL';
        if (status) {
            params.push(status);
            whereClause += ` AND status = $${params.length}`;
        }

        const [dataResult, countResult] = await Promise.all([
            query(
                `SELECT id, problem_statement, status, metadata, created_at, updated_at
         FROM research_sessions
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
                params
            ),
            query(
                `SELECT COUNT(*) AS total FROM research_sessions ${whereClause}`,
                status ? [status] : []
            ),
        ]);

        return {
            sessions: dataResult.rows,
            total: parseInt(countResult.rows[0].total, 10),
        };
    } catch (err) {
        throw new DatabaseError(`Failed to list sessions: ${err.message}`);
    }
}

/**
 * Soft-delete a session.
 * @param {string} sessionId
 */
async function deleteSession(sessionId) {
    try {
        const { rowCount } = await query(
            `UPDATE research_sessions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
            [sessionId]
        );
        if (rowCount === 0) throw new NotFoundError(`Session ${sessionId} not found`);
    } catch (err) {
        if (err instanceof NotFoundError) throw err;
        throw new DatabaseError(`Failed to delete session: ${err.message}`);
    }
}

// ─────────────────────────────────────────────
// LLM Responses
// ─────────────────────────────────────────────

/**
 * Save a successful LLM response.
 * @param {string} sessionId
 * @param {Object} provResult - { provider, model, rawResponse, promptTokens, completionTokens, latencyMs }
 * @returns {Promise<string>} llmResponseId
 */
async function saveLlmResponse(sessionId, provResult) {
    try {
        const { rows } = await query(
            `INSERT INTO llm_responses
         (session_id, provider, model, status, raw_response, prompt_tokens, completion_tokens, latency_ms)
       VALUES ($1, $2, $3, 'success', $4, $5, $6, $7)
       RETURNING id`,
            [
                sessionId,
                provResult.provider,
                provResult.model || null,
                provResult.rawResponse || null,
                provResult.promptTokens || null,
                provResult.completionTokens || null,
                provResult.latencyMs || null,
            ]
        );
        return rows[0].id;
    } catch (err) {
        throw new DatabaseError(`Failed to save LLM response: ${err.message}`);
    }
}

/**
 * Save a failed LLM provider attempt.
 * @param {string} sessionId
 * @param {string} provider
 * @param {string} errorMessage
 */
async function saveLlmFailure(sessionId, provider, errorMessage) {
    try {
        await query(
            `INSERT INTO llm_responses (session_id, provider, status, error_message)
       VALUES ($1, $2, 'failed', $3)`,
            [sessionId, provider, errorMessage]
        );
    } catch (err) {
        // Non-fatal — log and continue
        logger.error('Failed to save LLM failure record', { sessionId, provider, error: err.message });
    }
}

// ─────────────────────────────────────────────
// Ideas
// ─────────────────────────────────────────────

/**
 * Bulk-insert ideas for a given LLM response.
 * Returns the inserted UUIDs in the same order as the input array.
 *
 * @param {string} sessionId
 * @param {string} llmResponseId
 * @param {string} provider
 * @param {Array<Object>} ideas
 * @param {number[]} clusterIds - cluster assignment per idea (same index order)
 * @returns {Promise<string[]>} - Array of inserted idea UUIDs
 */
async function saveIdeas(sessionId, llmResponseId, provider, ideas, clusterIds) {
    if (ideas.length === 0) return [];

    return withTransaction(async (client) => {
        const insertedIds = [];

        for (let i = 0; i < ideas.length; i++) {
            const idea = ideas[i];
            const clusterId = clusterIds[i];

            // Build embedding array literal for pgvector if present
            const embeddingValue = idea.embedding
                ? `[${idea.embedding.join(',')}]`
                : null;

            const { rows } = await client.query(
                `INSERT INTO ideas
           (session_id, llm_response_id, provider, title, description, rationale,
            category, confidence_score, novelty_score, tags, cluster_id,
            is_duplicate, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13::vector)
         RETURNING id`,
                [
                    sessionId,
                    llmResponseId,
                    provider,
                    idea.title,
                    idea.description,
                    idea.rationale,
                    idea.category,
                    idea.confidence_score,
                    idea.novelty_score,
                    idea.tags,
                    clusterId,
                    idea._isDuplicate || false,
                    embeddingValue,
                ]
            );

            insertedIds.push(rows[0].id);
        }

        return insertedIds;
    });
}

/**
 * Update duplicate_of and similarity_to_dup for flagged ideas.
 * @param {Array<{ dbId: string, duplicateOfDbId: string, similarityToDuplicate: number }>} updates
 */
async function updateDuplicateReferences(updates) {
    if (updates.length === 0) return;

    try {
        await withTransaction(async (client) => {
            for (const upd of updates) {
                await client.query(
                    `UPDATE ideas
           SET duplicate_of = $1, similarity_to_dup = $2
           WHERE id = $3`,
                    [upd.duplicateOfDbId, upd.similarityToDuplicate, upd.dbId]
                );
            }
        });
    } catch (err) {
        throw new DatabaseError(`Failed to update duplicate references: ${err.message}`);
    }
}

/**
 * Get ideas for a session, optionally filtering to unique only.
 * @param {string} sessionId
 * @param {boolean} uniqueOnly
 * @returns {Promise<Array>}
 */
async function getSessionIdeas(sessionId, uniqueOnly = false) {
    try {
        const { rows } = await query(
            `SELECT id, provider, title, description, rationale, category,
              confidence_score, novelty_score, tags, cluster_id,
              is_duplicate, duplicate_of, similarity_to_dup, created_at
       FROM ideas
       WHERE session_id = $1
         ${uniqueOnly ? 'AND is_duplicate = FALSE' : ''}
       ORDER BY confidence_score DESC, novelty_score DESC`,
            [sessionId]
        );
        return rows;
    } catch (err) {
        throw new DatabaseError(`Failed to get session ideas: ${err.message}`);
    }
}

/**
 * Get a single idea by ID.
 * @param {string} ideaId
 * @returns {Promise<Object>}
 */
async function getIdeaById(ideaId) {
    try {
        const { rows } = await query(
            `SELECT id, session_id, provider, title, description, rationale,
              category, confidence_score, novelty_score, tags, cluster_id,
              is_duplicate, created_at
       FROM ideas WHERE id = $1`,
            [ideaId]
        );
        if (rows.length === 0) throw new NotFoundError(`Idea ${ideaId} not found`);
        return rows[0];
    } catch (err) {
        if (err instanceof NotFoundError) throw err;
        throw new DatabaseError(`Failed to get idea: ${err.message}`);
    }
}

// ─────────────────────────────────────────────
// Deepening Sessions
// ─────────────────────────────────────────────

/**
 * Save a deepening session result.
 * @param {string} sessionId
 * @param {string} ideaId
 * @param {Object} data
 * @returns {Promise<string>} deepeningSessionId
 */
async function saveDeepeningSession(sessionId, ideaId, data) {
    try {
        const { rows } = await query(
            `INSERT INTO deepening_sessions
         (session_id, idea_id, provider, depth_level, prompt_used, result,
          status, prompt_tokens, completion_tokens, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
            [
                sessionId,
                ideaId,
                data.provider,
                data.depthLevel,
                data.promptUsed || null,
                data.result ? JSON.stringify(data.result) : null,
                data.status || 'success',
                data.promptTokens || null,
                data.completionTokens || null,
                data.latencyMs || null,
            ]
        );
        return rows[0].id;
    } catch (err) {
        throw new DatabaseError(`Failed to save deepening session: ${err.message}`);
    }
}

/**
 * Get the latest LLM response row for a session.
 * @param {string} sessionId
 * @returns {Promise<Object|null>} row or null
 */
async function getLatestLlmResponse(sessionId) {
    try {
        const { rows } = await query(
            `SELECT id, provider, model, status, raw_response, prompt_tokens, completion_tokens, latency_ms, created_at
         FROM llm_responses
         WHERE session_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
            [sessionId]
        );
        return rows.length === 0 ? null : rows[0];
    } catch (err) {
        throw new DatabaseError(`Failed to get latest LLM response: ${err.message}`);
    }
}

module.exports = {
    createSession,
    updateSessionStatus,
    getSessionById,
    listSessions,
    deleteSession,
    saveLlmResponse,
    saveLlmFailure,
    saveIdeas,
    updateDuplicateReferences,
    getSessionIdeas,
    getIdeaById,
    saveDeepeningSession,
    getLatestLlmResponse,
};
