'use strict';

const { callOpenAI, callOpenAIDeepening } = require('./openai');
const { callClaude, callClaudeDeepening } = require('./claude');
const { callGemini, callGeminiDeepening } = require('./gemini');
const logger = require('../utils/logger');

/**
 * Maps provider names to their call functions.
 */
const PROVIDERS = {
  openai: callOpenAI,
  anthropic: callClaude,
  gemini: callGemini,
};

const DEEPENING_PROVIDERS = {
  openai: callOpenAIDeepening,
  anthropic: callClaudeDeepening,
  gemini: callGeminiDeepening,
};

/**
 * Execute all providers in PARALLEL using Promise.allSettled.
 * allSettled guarantees all promises complete regardless of individual failures.
 * We never let one provider failure abort the whole pipeline.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<Array<{
 *   provider: string,
 *   status: 'fulfilled' | 'rejected',
 *   result?: Object,
 *   error?: Error
 * }>>}
 */
async function executeAllProviders(systemPrompt, userPrompt) {
  const providerNames = Object.keys(PROVIDERS);

  logger.info(`Executing ${providerNames.length} providers in parallel`, { providers: providerNames });

  const promises = providerNames.map((name) =>
    PROVIDERS[name](systemPrompt, userPrompt)
      .then((result) => ({ provider: name, status: 'fulfilled', result }))
      .catch((error) => {
        logger.error(`Provider ${name} failed`, { error: error.message, code: error.code });
        return { provider: name, status: 'rejected', error };
      })
  );

  const settled = await Promise.allSettled(promises);

  // Promise.allSettled wraps each in { status, value, reason }
  // Our inner .catch already normalizes the shape, so unwrap:
  return settled.map((s) => (s.status === 'fulfilled' ? s.value : s.reason));
}

/**
 * Execute a single provider for deepening.
 * @param {string} providerName
 * @param {string} systemPrompt
 * @param {string} userPrompt
 */
async function executeDeepeningProvider(providerName, systemPrompt, userPrompt) {
  const fn = DEEPENING_PROVIDERS[providerName];
  if (!fn) throw new Error(`Unknown provider: ${providerName}`);
  return fn(systemPrompt, userPrompt);
}

/**
 * Extract successful results and failed provider records from the settled array.
 * @param {Array} settledResults
 * @returns {{ successes: Array, failures: Array }}
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
  PROVIDERS,
};
