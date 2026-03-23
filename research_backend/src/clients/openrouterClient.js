'use strict';

import OpenAI from 'openai';
import { parseAndValidateLlmOutput } from '../utils/llmSchema.js';
import { ProviderError, ProviderTimeoutError, ParseError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Unified OpenRouter Client
 * Handles all LLM calls through OpenRouter with OpenAI-compatible interface
 */
class OpenRouterClient {
  constructor(config) {
    if (!config.apiKey && (!config.apiKeys || config.apiKeys.length === 0)) {
      throw new Error('OpenRouter API key or keys are required');
    }

    this.apiKey = config.apiKey;
    this.apiKeys = config.apiKeys || (config.apiKey ? [config.apiKey] : []);
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.maxTokens = config.maxTokens || 2000;
    this.timeoutMs = config.timeoutMs || 60000;
    this.modelKeyMap = config.modelKeyMap || {};
    this.currentKeyIndex = 0;

    // Initialize with primary key
    // this._initializeClient(this.apiKey || this.apiKeys[0]);
  }

  /**
   * Initialize OpenAI client with a specific API key
   * @private
   */
  _getClient(apiKey) {
    if (!this.clients) this.clients = new Map();
    if (!this.clients.has(apiKey)) {
      this.clients.set(apiKey, new OpenAI({
        apiKey,
        baseURL: this.baseURL,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Research Engine',
        },
      }));
    }
    return this.clients.get(apiKey);
  }

  /**
   * Get the API key to use for a specific model
   * @private
   */
  _getKeyForModel(model) {
    // Check if model has a dedicated key in the map
    if (this.modelKeyMap[model]) {
      return this.modelKeyMap[model];
    }
    // Fallback to primary single key
    return this.apiKey || this.apiKeys[0];
  }

  /**
   * Rotate to the next available API key (for fallback on quota failures)
   * @private
   */
  _rotateKey() {
    if (this.apiKeys.length <= 1) return this.apiKey;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Execute a single call to OpenRouter
   *
   * @param {string} model - Model identifier (e.g., 'deepseek/deepseek-chat')
   * @param {string} systemPrompt - System context
   * @param {string} userPrompt - User request
   * @param {string} taskType - 'research' or 'deepening' (for schema validation)
   * @param {number} [maxRetries=2] - Number of retry attempts
   * @returns {Promise<Object>} - Structured response from model
   */
  async call(model, systemPrompt, userPrompt, taskType = 'research', maxRetries = 2) {
    let lastError;
    let usedKeys = new Set();
    let currentKey = this._getKeyForModel(model);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      const start = Date.now();

      try {
        const isRawMode = taskType === 'raw';

        const client = this._getClient(currentKey);
        const response = await client.chat.completions.create(
          {
            model,
            max_tokens: this.maxTokens,
            temperature: 0.7,
            ...(isRawMode ? {} : { response_format: { type: 'json_object' } }),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          },
          { signal: controller.signal }
        );

        clearTimeout(timeout);

        const content = response.choices[0].message.content;
        const promptTokens = response.usage?.prompt_tokens || 0;
        const completionTokens = response.usage?.completion_tokens || 0;
        const latencyMs = Date.now() - start;

        logger.debug(`OpenRouter call succeeded (${model})`, {
          latencyMs,
          tokens: promptTokens + completionTokens,
        });

        // Raw mode: return text output directly
        if (isRawMode) {
          return {
            model,
            data: content,
            promptTokens,
            completionTokens,
            latencyMs,
          };
        }

        // Validate JSON output against schema for other task types
        const { valid, data, errors } = parseAndValidateLlmOutput(content, taskType);
        if (!valid) {
          throw new ParseError(model, JSON.stringify(errors), content);
        }

        // Format response based on task type
        if (taskType === 'research') {
          return {
            model,
            ideas: data.ideas || [],
            rawResponse: content,
            promptTokens,
            completionTokens,
            latencyMs,
          };
        } else if (taskType === 'deepening') {
          return {
            model,
            result: data.deepening || data.result || '',
            promptTokens,
            completionTokens,
            latencyMs,
          };
        }

        return { model, data, promptTokens, completionTokens, latencyMs };
      } catch (err) {
        clearTimeout(timeout);

        // Handle timeout
        if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
          logger.warn(`OpenRouter timeout on ${model} (attempt ${attempt + 1})`, {
            timeoutMs: this.timeoutMs,
          });
          if (attempt < maxRetries) {
            const backoff = Math.pow(2, attempt) * 1000;
            await new Promise((r) => setTimeout(r, backoff));
            lastError = err;
            continue;
          }
          throw new ProviderTimeoutError(model);
        }

        // Handle HTTP status errors
        const status = err.status || err.statusCode;

        // Handle 402 (quota exceeded) - try next key if available
        if (status === 402 && this.apiKeys.length > 1 && !usedKeys.has(currentKey)) {
          usedKeys.add(currentKey);
          currentKey = this._rotateKey();
          logger.warn(
            `OpenRouter quota exceeded for ${model} with current key, retrying with next key (attempt ${attempt + 1})`
          );
          const backoff = Math.pow(2, attempt) * 500;
          await new Promise((r) => setTimeout(r, backoff));
          lastError = err;
          continue;
        }

        if ((status === 429 || status >= 500) && attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          logger.warn(
            `OpenRouter request failed for ${model} (HTTP ${status}), retrying in ${backoff}ms`
          );
          await new Promise((r) => setTimeout(r, backoff));
          lastError = err;
          continue;
        }

        // Handle parse errors - retry once
        if (err instanceof ParseError && attempt < maxRetries) {
          logger.warn(`Parse error for ${model}, retrying...`);
          lastError = err;
          continue;
        }

        // Final error throw
        throw new ProviderError(model, err.message || 'OpenRouter API call failed', {
          status,
          originalError: err.code,
        });
      }
    }

    throw lastError;
  }

  /**
   * Execute calls to multiple models in parallel
   * Returns settled promises to handle partial failures gracefully
   *
   * @param {string[]} models - Array of model IDs
   * @param {string} systemPrompt - System context
   * @param {string} userPrompt - User request
   * @param {string} taskType - 'research' or 'deepening'
   * @returns {Promise<Object[]>} - Array of settled results
   */
  async callMultiple(models, systemPrompt, userPrompt, taskType = 'research') {
    const promises = models.map((model) =>
      this.call(model, systemPrompt, userPrompt, taskType)
        .then((result) => ({
          model,
          status: 'fulfilled',
          result,
        }))
        .catch((error) => {
          logger.error(`Model ${model} failed in batch call`, { error: error.message });
          return {
            model,
            status: 'rejected',
            error,
          };
        })
    );

    const settled = await Promise.all(promises);
    return settled;
  }
}

export default OpenRouterClient;
