'use strict';

const config = require('../config');
const { callOpenRouter } = require('./openrouter');
const { callGrok, callGrokDeepening } = require('./grok');
const { callGemini, callGeminiDeepening } = require('./gemini');
const logger = require('../utils/logger');

/**
 * Execute research prompt across ALL providers (hybrid).
 * Runs direct providers (Grok, Gemini) + OpenRouter models (DeepSeek, Claude, Perplexity) in parallel.
 * 
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<Array<Object>>} Settled results (fulfilled/rejected)
 */
async function executeAllProviders(systemPrompt, userPrompt) {
    const promises = [];

    // Fast-mode: only use DeepSeek/default OpenRouter model and skip direct providers
    const fastMode = process.env.TEMP_FAST_MODE === 'true';
    if (fastMode) {
        const model = config.openRouter.defaultModel;
        logger.info(`FAST_MODE enabled — executing only OpenRouter model: ${model}`);
        promises.push(
            callOpenRouter(model, systemPrompt, userPrompt, 'research')
                .then((result) => ({ provider: model, status: 'fulfilled', result }))
                .catch((error) => {
                    logger.error(`Model ${model} failed`, { error: error.message });
                    return { provider: model, status: 'rejected', error };
                })
        );
    } else {
        // 1. Direct Providers
        logger.info('Executing direct providers: grok, gemini');

        promises.push(
            callGrok(systemPrompt, userPrompt)
                .then((result) => ({ provider: 'grok', status: 'fulfilled', result }))
                .catch((error) => {
                    logger.error('Provider grok failed', { error: error.message });
                    return { provider: 'grok', status: 'rejected', error };
                })
        );

        promises.push(
            callGemini(systemPrompt, userPrompt)
                .then((result) => ({ provider: 'gemini', status: 'fulfilled', result }))
                .catch((error) => {
                    logger.error('Provider gemini failed', { error: error.message });
                    return { provider: 'gemini', status: 'rejected', error };
                })
        );

        // 2. OpenRouter Models
        const openRouterModels = config.openRouter.researchModels;
        logger.info(`Executing OpenRouter models: ${openRouterModels.join(', ')}`);

        openRouterModels.forEach((model) => {
            promises.push(
                callOpenRouter(model, systemPrompt, userPrompt, 'research')
                    .then((result) => ({ provider: model, status: 'fulfilled', result }))
                    .catch((error) => {
                        logger.error(`Model ${model} failed`, { error: error.message });
                        return { provider: model, status: 'rejected', error };
                    })
            );
        });
    }

    const settled = await Promise.allSettled(promises);
    return settled.map((s) => (s.status === 'fulfilled' ? s.value : s.reason));
}

/**
 * Execute deepening for a specific provider/model.
 * Handles routing to direct providers vs OpenRouter.
 * 
 * @param {string} providerName - 'grok', 'gemini', or an OpenRouter model ID
 * @param {string} systemPrompt
 * @param {string} userPrompt
 */
async function executeDeepeningProvider(providerName, systemPrompt, userPrompt) {
    // Direct Routing
    if (providerName === 'grok') {
        return callGrokDeepening(systemPrompt, userPrompt);
    }

    if (providerName === 'gemini') {
        return callGeminiDeepening(systemPrompt, userPrompt);
    }

    // Default to OpenRouter for everything else
    return callOpenRouter(providerName, systemPrompt, userPrompt, 'deepening');
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
