'use strict';

const OpenAI = require('openai');
const config = require('../config');
const { parseAndValidateLlmOutput } = require('../utils/llmSchema');
const { ProviderError, ProviderTimeoutError, ParseError } = require('../utils/errors');
const logger = require('../utils/logger');

// Single OpenRouter client
const client = new OpenAI({
    apiKey: config.openRouter.apiKey,
    baseURL: config.openRouter.baseURL,
    defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000', // Update in production
        'X-Title': 'Research Engine',
    },
});

/**
 * Call OpenRouter with specific model.
 * 
 * @param {string} model - The model identifier (e.g., 'deepseek/deepseek-chat')
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {string} taskType - 'research' or 'deepening' (for schema validation)
 * @param {number} [maxRetries=2]
 */
async function callOpenRouter(model, systemPrompt, userPrompt, taskType = 'research', maxRetries = 2) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.openRouter.timeoutMs);
        const start = Date.now();

        try {
            const response = await client.chat.completions.create(
                {
                    model,
                    max_tokens: config.openRouter.maxTokens,
                    temperature: 0.7,
                    // OpenRouter supports 'json_object' for many models, but not all. 
                    // We rely on the system prompt instruction + AJV validation as the primary enforcement.
                    response_format: { type: 'json_object' },
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

            // Validate JSON output
            const { valid, data, errors } = parseAndValidateLlmOutput(content, taskType);
            if (!valid) {
                throw new ParseError(model, JSON.stringify(errors), content);
            }

            logger.debug(`OpenRouter call succeeded (${model})`, { latencyMs, tokens: promptTokens + completionTokens });

            if (taskType === 'research') {
                return {
                    provider: model, // We use the model name as the "provider" identifier now
                    model: model,
                    ideas: data.ideas,
                    rawResponse: content,
                    promptTokens,
                    completionTokens,
                    latencyMs,
                };
            } else {
                // Deepening
                return {
                    provider: model,
                    model: model,
                    result: data.deepening,
                    promptTokens,
                    completionTokens,
                    latencyMs,
                };
            }

        } catch (err) {
            clearTimeout(timeout);

            if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
                logger.warn(`OpenRouter timeout (${model})`);
                if (attempt < maxRetries) continue;
                throw new ProviderTimeoutError(model);
            }

            const status = err.status || err.statusCode;

            // Retry on rate limits or server errors
            if ((status === 429 || status >= 500) && attempt < maxRetries) {
                const backoff = Math.pow(2, attempt) * 1000;
                logger.warn(`OpenRouter attempt ${attempt + 1} failed (${model} - ${status}), retrying in ${backoff}ms`);
                await new Promise((r) => setTimeout(r, backoff));
                lastError = err;
                continue;
            }

            // If it's a parse error, we might not want to retry immediately unless it's random noise.
            // But usually ParseError is thrown above and caught here.
            if (err instanceof ParseError && attempt < maxRetries) {
                logger.warn(`Parse error for ${model}, retrying...`);
                lastError = err;
                continue;
            }

            throw new ProviderError(model, err.message || 'OpenRouter API call failed', { status });
        }
    }

    throw lastError;
}

module.exports = { callOpenRouter };
