'use strict';

import { query } from '../db/pool.js';
import { DatabaseError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Save raw model output to database
 * @param {string} sessionId - Session UUID
 * @param {string} model - Model ID (e.g., 'deepseek/deepseek-chat')
 * @param {Object} result - Model result { output, error, latencyMs, promptTokens, completionTokens }
 * @returns {Promise<string>} - Saved record ID
 */
async function saveRawOutput(sessionId, model, result) {
    try {
        const { rows } = await query(
            `INSERT INTO raw_model_outputs 
             (session_id, model, raw_output, status, error_message, latency_ms, prompt_tokens, completion_tokens)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                sessionId,
                model,
                result.output || '',
                result.error ? 'error' : 'success',
                result.error || null,
                result.latencyMs || 0,
                result.promptTokens || 0,
                result.completionTokens || 0,
            ]
        );

        logger.debug(`Raw output saved for ${model}`, { sessionId, id: rows[0].id });
        return rows[0].id;
    } catch (err) {
        throw new DatabaseError(`Failed to save raw output: ${err.message}`);
    }
}

/**
 * Get all raw outputs for a session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Array>} - Array of raw outputs
 */
async function getRawOutputsBySessionId(sessionId) {
    try {
        const { rows } = await query(
            `SELECT id, model, raw_output, status, error_message, latency_ms, prompt_tokens, completion_tokens, created_at
             FROM raw_model_outputs
             WHERE session_id = $1
             ORDER BY created_at ASC`,
            [sessionId]
        );

        logger.debug(`Retrieved ${rows.length} raw outputs for session`, { sessionId });
        return rows;
    } catch (err) {
        throw new DatabaseError(`Failed to retrieve raw outputs: ${err.message}`);
    }
}

/**
 * Get successful raw outputs for a session (exclude errors)
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Array>} - Array of successful raw outputs
 */
async function getSuccessfulOutputsBySessionId(sessionId) {
    try {
        const { rows } = await query(
            `SELECT id, model, raw_output, latency_ms, prompt_tokens, completion_tokens, created_at
             FROM raw_model_outputs
             WHERE session_id = $1 AND status = 'success'
             ORDER BY created_at ASC`,
            [sessionId]
        );

        logger.debug(`Retrieved ${rows.length} successful outputs for session`, { sessionId });
        return rows;
    } catch (err) {
        throw new DatabaseError(`Failed to retrieve successful outputs: ${err.message}`);
    }
}

/**
 * Get raw outputs by model
 * @param {string} sessionId - Session UUID
 * @param {string} model - Model ID
 * @returns {Promise<Object|null>} - Raw output or null
 */
async function getRawOutputByModel(sessionId, model) {
    try {
        const { rows } = await query(
            `SELECT id, model, raw_output, status, error_message, latency_ms, prompt_tokens, completion_tokens, created_at
             FROM raw_model_outputs
             WHERE session_id = $1 AND model = $2
             LIMIT 1`,
            [sessionId, model]
        );

        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        throw new DatabaseError(`Failed to retrieve output for model: ${err.message}`);
    }
}

/**
 * Delete raw outputs for a session (cleanup)
 * @param {string} sessionId - Session UUID
 * @returns {Promise<void>}
 */
async function deleteRawOutputsBySessionId(sessionId) {
    try {
        await query(
            `DELETE FROM raw_model_outputs WHERE session_id = $1`,
            [sessionId]
        );

        logger.debug(`Deleted raw outputs for session`, { sessionId });
    } catch (err) {
        throw new DatabaseError(`Failed to delete raw outputs: ${err.message}`);
    }
}

export {
    saveRawOutput,
    getRawOutputsBySessionId,
    getSuccessfulOutputsBySessionId,
    getRawOutputByModel,
    deleteRawOutputsBySessionId,
};

export default {
    saveRawOutput,
    getRawOutputsBySessionId,
    getSuccessfulOutputsBySessionId,
    getRawOutputByModel,
    deleteRawOutputsBySessionId,
};
