'use strict';

const config = require('../config');
const { callOpenRouter } = require('./openrouter');
const logger = require('../utils/logger');

/**
 * Execute research prompt across multiple models in parallel.
 * Uses the models defined in config.openRouter.researchModels
 * 
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<Array<Object>>} Settled results (fulfilled/rejected)
 */
async function executeAllProviders(systemPrompt, userPrompt) {
    // We treat each MODEL as a "provider" in this context
    const models = config.openRouter.researchModels;

    logger.info(`Executing research with models: ${models.join(', ')}`);

    const promises = models.map((model) =>
        callOpenRouter(model, systemPrompt, userPrompt, 'research')
            .then((result) => ({ provider: model, status: 'fulfilled', result }))
            .catch((error) => {
                logger.error(`Model ${model} failed`, { error: error.message, code: error.code });
                return { provider: model, status: 'rejected', error };
            })
    );

    const settled = await Promise.allSettled(promises);
    return settled.map((s) => (s.status === 'fulfilled' ? s.value : s.reason));
}

/**
 * Execute deepening for a specific model.
 * @param {string} modelName - The OpenRouter model ID
 * @param {string} systemPrompt
 * @param {string} userPrompt
 */
async function executeDeepeningProvider(modelName, systemPrompt, userPrompt) {
    return callOpenRouter(modelName, systemPrompt, userPrompt, 'deepening');
}

/**
 * Extract successful results and failed provider records.
 */
function partitionProviderResults(settledResults) {
    const successes = [];
    const failures = [];

    for (const item of settledResults) {
        if (item.status === 'fulfilled' && item.result) {
            successes.push(item.result);
        } else {
            failures.push({
                provider: item.provider,
                error: item.error?.message || 'Unknown error',
                code: item.error?.code || 'UNKNOWN',
            });
        }
    }

    return { successes, failures };
}

module.exports = {
    executeAllProviders,
    executeDeepeningProvider,
    partitionProviderResults,
};
