'use strict';

import OpenRouterClient from '../clients/openrouterClient.js';
import config from '../config/index.js';
import { getResearchModels } from '../config/models.js';
import logger from '../utils/logger.js';

// Initialize the unified OpenRouter client
const client = new OpenRouterClient({
  apiKey: config.openRouter.apiKey,
  baseURL: config.openRouter.baseURL,
  maxTokens: config.openRouter.maxTokens,
  timeoutMs: config.openRouter.timeoutMs,
});

/**
 * Execute research prompt across all configured OpenRouter models in parallel.
 * All models are accessed through OpenRouter with unified OpenAI-compatible format.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<Array<Object>>} Settled results (fulfilled/rejected)
 */
async function executeAllProviders(systemPrompt, userPrompt) {
  // Get models from config - either custom list or defaults
  const researchModels = getResearchModels(process.env.RESEARCH_MODELS);

  logger.info(`Executing research across models: ${researchModels.join(', ')}`);

  // Fast mode: single model execution
  const fastMode = process.env.TEMP_FAST_MODE === 'true';
  if (fastMode) {
    const model = config.openRouter.defaultModel;
    logger.info(`FAST_MODE enabled — executing only: ${model}`);

    const result = await client.call(model, systemPrompt, userPrompt, 'research');
    return [
      {
        model: result.model,
        status: 'fulfilled',
        result: {
          model: result.model,
          provider: result.model,
          ideas: result.ideas,
          rawResponse: result.rawResponse,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          latencyMs: result.latencyMs,
        },
      },
    ];
  }

  // Execute all models in parallel
  const results = await client.callMultiple(researchModels, systemPrompt, userPrompt, 'research');

  // Format results to match expected structure
  return results.map((item) => {
    if (item.status === 'fulfilled') {
      return {
        ...item,
        result: {
          model: item.result.model,
          provider: item.result.model,
          ideas: item.result.ideas,
          rawResponse: item.result.rawResponse,
          promptTokens: item.result.promptTokens,
          completionTokens: item.result.completionTokens,
          latencyMs: item.result.latencyMs,
        },
      };
    }
    return item;
  });
}

/**
 * Execute deepening for a specific model.
 * Uses unified OpenRouter interface for all models.
 *
 * @param {string} model - Model ID (e.g., 'deepseek/deepseek-chat')
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<Object>} Deepening result
 */
async function executeDeepeningProvider(model, systemPrompt, userPrompt) {
  logger.info(`Executing deepening with model: ${model}`);

  const result = await client.call(model, systemPrompt, userPrompt, 'deepening');

  return {
    model: result.model,
    provider: result.model,
    result: result.result,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs: result.latencyMs,
  };
}

/**
 * Partition settled results into successes and failures.
 * Handles per-model errors without crashing the pipeline.
 *
 * @param {Array<Object>} settledResults
 * @returns {Object} { successes, failures }
 */
function partitionProviderResults(settledResults) {
  const successes = [];
  const failures = [];

  for (const item of settledResults) {
    if (item.status === 'fulfilled' && item.result) {
      successes.push(item.result);
    } else {
      failures.push({
        provider: item.model || 'unknown',
        error: item.error?.message || 'Unknown error',
        code: item.error?.code || 'UNKNOWN',
      });
    }
  }

  return { successes, failures };
}

export {
  executeAllProviders,
  executeDeepeningProvider,
  partitionProviderResults,
};
