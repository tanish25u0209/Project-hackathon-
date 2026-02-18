'use strict';

const OpenAI = require('openai');
const config = require('../config');
const { parseAndValidateLlmOutput } = require('../utils/llmSchema');
const { ProviderError, ProviderTimeoutError, ParseError } = require('../utils/errors');
const logger = require('../utils/logger');

// xAI Grok uses an OpenAI-compatible API
const client = new OpenAI({
    apiKey: config.grok.apiKey,
    baseURL: 'https://api.x.ai/v1',
});

/**
 * Internal helper: call Grok with timeout + retry on 429/5xx.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {number} [maxRetries=2]
 */
async function callGrokRaw(systemPrompt, userPrompt, maxRetries = 2) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.grok.timeoutMs);
        const start = Date.now();

        try {
            const response = await client.chat.completions.create(
                {
                    model: config.grok.model,
                    max_tokens: config.grok.maxTokens,
                    temperature: 0.7,
                    // Grok supports OpenAI-compatible JSON mode
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                },
                { signal: controller.signal }
            );

            clearTimeout(timeout);
            return {
                content: response.choices[0].message.content,
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                latencyMs: Date.now() - start,
            };
        } catch (err) {
            clearTimeout(timeout);

            if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
                throw new ProviderTimeoutError('grok');
            }

            const status = err.status || err.statusCode;
            if ((status === 429 || status >= 500) && attempt < maxRetries) {
                const backoff = Math.pow(2, attempt) * 1000;
                logger.warn(`Grok attempt ${attempt + 1} failed (${status}), retrying in ${backoff}ms`);
                await new Promise((r) => setTimeout(r, backoff));
                lastError = err;
                continue;
            }

            throw new ProviderError('grok', err.message || 'Grok API call failed', { status });
        }
    }

    throw lastError;
}

/**
 * Call Grok for research idea generation.
 */
async function callGrok(systemPrompt, userPrompt) {
    const raw = await callGrokRaw(systemPrompt, userPrompt);

    const { valid, data, errors } = parseAndValidateLlmOutput(raw.content, 'research');
    if (!valid) {
        throw new ParseError('grok', JSON.stringify(errors), raw.content);
    }

    logger.debug('Grok research call succeeded', {
        ideas: data.ideas.length,
        latencyMs: raw.latencyMs,
    });

    return {
        provider: 'grok',
        model: config.grok.model,
        ideas: data.ideas,
        rawResponse: raw.content,
        promptTokens: raw.promptTokens,
        completionTokens: raw.completionTokens,
        latencyMs: raw.latencyMs,
    };
}

/**
 * Call Grok for idea deepening.
 */
async function callGrokDeepening(systemPrompt, userPrompt) {
    const raw = await callGrokRaw(systemPrompt, userPrompt);

    const { valid, data, errors } = parseAndValidateLlmOutput(raw.content, 'deepening');
    if (!valid) {
        throw new ParseError('grok', JSON.stringify(errors), raw.content);
    }

    return {
        provider: 'grok',
        model: config.grok.model,
        result: data.deepening,
        promptTokens: raw.promptTokens,
        completionTokens: raw.completionTokens,
        latencyMs: raw.latencyMs,
    };
}

module.exports = { callGrok, callGrokDeepening };
