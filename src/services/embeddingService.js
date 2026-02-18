'use strict';

const OpenAI = require('openai');
const config = require('../config');
const { EmbeddingError } = require('../utils/errors');
const logger = require('../utils/logger');

const client = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Build the text to embed for an idea.
 * Concatenates title + description + tags for richer semantic representation.
 *
 * @param {Object} idea
 * @returns {string}
 */
function buildIdeaEmbeddingText(idea) {
    const tagStr = Array.isArray(idea.tags) ? idea.tags.join(', ') : '';
    return `${idea.title}. ${idea.description} Tags: ${tagStr}`.trim();
}

/**
 * Generate embeddings for an array of texts using OpenAI's embedding model.
 * Handles batching automatically if the input exceeds the model's batch limit.
 *
 * @param {string[]} texts - Array of strings to embed
 * @returns {Promise<number[][]>} - Array of embedding vectors (same order as input)
 */
async function generateEmbeddings(texts) {
    if (texts.length === 0) return [];

    const batchSize = config.embedding.batchSize; // default 100
    const allEmbeddings = [];

    logger.info(`Generating embeddings for ${texts.length} texts (batch size: ${batchSize})`);

    // Split into batches to respect API limits
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(texts.length / batchSize);

        logger.debug(`Embedding batch ${batchNum}/${totalBatches} (${batch.length} texts)`);

        try {
            const response = await client.embeddings.create({
                model: config.embedding.model,
                input: batch,
                dimensions: config.embedding.dimensions,
                encoding_format: 'float',
            });

            // Sort by index to ensure correct order (API may not guarantee order)
            const sorted = response.data.sort((a, b) => a.index - b.index);
            allEmbeddings.push(...sorted.map((d) => d.embedding));
        } catch (err) {
            logger.error(`Embedding batch ${batchNum} failed`, { error: err.message });
            throw new EmbeddingError(`Failed to generate embeddings: ${err.message}`, {
                batch: batchNum,
                totalBatches,
                textsInBatch: batch.length,
            });
        }
    }

    logger.info(`Embeddings generated successfully`, { count: allEmbeddings.length });
    return allEmbeddings;
}

/**
 * Generate a single embedding (convenience wrapper).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateSingleEmbedding(text) {
    const results = await generateEmbeddings([text]);
    return results[0];
}

module.exports = {
    generateEmbeddings,
    generateSingleEmbedding,
    buildIdeaEmbeddingText,
};
