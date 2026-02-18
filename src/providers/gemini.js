'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const { parseAndValidateLlmOutput } = require('../utils/llmSchema');
const { ProviderError, ProviderTimeoutError, ParseError } = require('../utils/errors');
const logger = require('../utils/logger');

// Initialize Gemini only if API key is present
const genAI = config.gemini.apiKey ? new GoogleGenerativeAI(config.gemini.apiKey) : null;

/**
 * Internal helper: call Gemini with timeout + retry logic.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {number} [maxRetries=2]
 */
async function callGeminiRaw(systemPrompt, userPrompt, maxRetries = 2) {
    if (!genAI) {
        throw new Error('Gemini API key is missing');
    }

    const model = genAI.getGenerativeModel({
        model: config.gemini.model,
        generationConfig: {
            maxOutputTokens: config.gemini.maxTokens,
            temperature: 0.7,
            responseMimeType: 'application/json',
        },
    });

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new ProviderTimeoutError('gemini')), config.gemini.timeoutMs)
            );

            const apiCallPromise = (async () => {
                const result = await model.generateContent({
                    contents: [
                        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
                    ],
                });
                return result.response;
            })();

            const response = await Promise.race([apiCallPromise, timeoutPromise]);
            const text = response.text();

            return {
                content: text,
                // Gemini usage metadata extraction omitted for brevity/compatibility
                promptTokens: 0,
                completionTokens: 0,
            };

        } catch (err) {
            if (err instanceof ProviderTimeoutError) {
                if (attempt < maxRetries) continue;
                throw err;
            }

            const status = err.status || err.statusCode || 500;
            if (attempt < maxRetries) {
                const backoff = Math.pow(2, attempt) * 1000;
                logger.warn(`Gemini attempt ${attempt + 1} failed, retrying in ${backoff}ms`, { error: err.message });
                await new Promise((r) => setTimeout(r, backoff));
                lastError = err;
                continue;
            }

            throw new ProviderError('gemini', err.message || 'Gemini API call failed');
        }
    }

    throw lastError;
}

/**
 * Call Gemini for research.
 */
async function callGemini(systemPrompt, userPrompt) {
    const start = Date.now();
    const raw = await callGeminiRaw(systemPrompt, userPrompt);
    const latencyMs = Date.now() - start;

    const { valid, data, errors } = parseAndValidateLlmOutput(raw.content, 'research');
    if (!valid) {
        throw new ParseError('gemini', JSON.stringify(errors), raw.content);
    }

    logger.debug('Gemini research call succeeded', { latencyMs });

    return {
        provider: 'gemini',
        model: config.gemini.model,
        ideas: data.ideas,
        rawResponse: raw.content,
        promptTokens: raw.promptTokens,
        completionTokens: raw.completionTokens,
        latencyMs,
    };
}

/**
 * Call Gemini for deepening.
 */
async function callGeminiDeepening(systemPrompt, userPrompt) {
    const start = Date.now();
    const raw = await callGeminiRaw(systemPrompt, userPrompt);
    const latencyMs = Date.now() - start;

    const { valid, data, errors } = parseAndValidateLlmOutput(raw.content, 'deepening');
    if (!valid) {
        throw new ParseError('gemini', JSON.stringify(errors), raw.content);
    }

    return {
        provider: 'gemini',
        model: config.gemini.model,
        result: data.deepening,
        promptTokens: raw.promptTokens,
        completionTokens: raw.completionTokens,
        latencyMs,
    };
}

module.exports = { callGemini, callGeminiDeepening };
