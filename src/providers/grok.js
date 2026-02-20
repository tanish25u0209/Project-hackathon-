'use strict';

const config = require('../config');
const { parseAndValidateLlmOutput } = require('../utils/llmSchema');
const { ProviderError, ProviderTimeoutError, ParseError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Internal helper: call Hugging Face with meta-llama/Llama-2-13b-hf for text generation.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {number} [maxRetries=2]
 */
async function callGrokRaw(systemPrompt, userPrompt, maxRetries = 2) {
    if (!config.huggingface.apiKey) {
        throw new Error('Hugging Face API key is missing');
    }

    const model = config.huggingface.llumaModel;
    const url = `${config.huggingface.baseURL}/${model}`;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new ProviderTimeoutError('grok')), config.huggingface.timeoutMs)
            );

            const apiCallPromise = (async () => {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.huggingface.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: `${systemPrompt}\n\n${userPrompt}`,
                        parameters: {
                            max_length: config.huggingface.maxTokens,
                            temperature: 0.7,
                        },
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`HF API error: ${response.status} - ${error.error || 'Unknown error'}`);
                }

                const result = await response.json();
                return result;
            })();

            const response = await Promise.race([apiCallPromise, timeoutPromise]);
            
            // Llama-2 returns an array of objects with 'generated_text'
            const text = Array.isArray(response) ? response[0]?.generated_text : response?.generated_text;

            if (!text) {
                throw new Error('No generated text in response');
            }

            return {
                content: JSON.stringify({ ideas: [{ title: text.substring(0, 100), description: text }] }),
                promptTokens: 0,
                completionTokens: 0,
                latencyMs: 0,
            };

        } catch (err) {
            if (err instanceof ProviderTimeoutError) {
                if (attempt < maxRetries) continue;
                throw err;
            }

            if (attempt < maxRetries) {
                const backoff = Math.pow(2, attempt) * 1000;
                logger.warn(`Llama-2 attempt ${attempt + 1} failed, retrying in ${backoff}ms`, { error: err.message });
                await new Promise((r) => setTimeout(r, backoff));
                lastError = err;
                continue;
            }

            throw new ProviderError('grok', err.message || 'Llama-2 API call failed');
        }
    }

    throw lastError;
}

/**
 * Call Llama-2 (via Hugging Face) for research idea generation.
 */
async function callGrok(systemPrompt, userPrompt) {
    const start = Date.now();
    const raw = await callGrokRaw(systemPrompt, userPrompt);
    const latencyMs = Date.now() - start;

    const { valid, data, errors } = parseAndValidateLlmOutput(raw.content, 'research');
    if (!valid) {
        throw new ParseError('grok', JSON.stringify(errors), raw.content);
    }

    logger.debug('Llama-2 research call succeeded', {
        ideas: data.ideas.length,
        latencyMs,
    });

    return {
        provider: 'grok',
        model: config.huggingface.llumaModel,
        ideas: data.ideas,
        rawResponse: raw.content,
        promptTokens: raw.promptTokens,
        completionTokens: raw.completionTokens,
        latencyMs,
    };
}

/**
 * Call Llama-2 (via Hugging Face) for idea deepening.
 */
async function callGrokDeepening(systemPrompt, userPrompt) {
    const start = Date.now();
    const raw = await callGrokRaw(systemPrompt, userPrompt);
    const latencyMs = Date.now() - start;

    const { valid, data, errors } = parseAndValidateLlmOutput(raw.content, 'deepening');
    if (!valid) {
        throw new ParseError('grok', JSON.stringify(errors), raw.content);
    }

    return {
        provider: 'grok',
        model: config.huggingface.llumaModel,
        result: data.deepening,
        promptTokens: raw.promptTokens,
        completionTokens: raw.completionTokens,
        latencyMs,
    };
}

module.exports = { callGrok, callGrokDeepening };
