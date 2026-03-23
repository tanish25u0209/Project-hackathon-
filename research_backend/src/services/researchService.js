'use strict';

import { buildResearchPrompt, buildDeepeningPrompt } from '../utils/promptBuilder.js';
import { executeAllProviders, partitionProviderResults, executeDeepeningProvider } from '../providers/index.js';
import { generateEmbeddings, buildIdeaEmbeddingText } from './embeddingService.js';
import { runSimilarityPipeline } from './similarityService.js';
import repo from './sessionRepository.js';
import config from '../config/index.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Full research pipeline orchestrator.
 * Called by both the sync endpoint and the BullMQ worker.
 *
 * Flow:
 *  1. Create session in DB
 *  2. Call all LLM providers in parallel
 *  3. Parse + validate each response
 *  4. Batch embed all ideas
 *  5. Run similarity + clustering + dedup
 *  6. Persist everything to DB
 *  7. Return structured result
 *
 * @param {string} problemStatement
 * @param {Object} metadata
 * @returns {Promise<Object>}
 */
async function runResearchPipeline(problemStatement, metadata = {}) {
    // ── Step 1: Create or reuse session ─────────────────────────────────────
    let session;
    if (metadata && metadata.sessionId) {
        session = await repo.getSessionById(metadata.sessionId);
    } else {
        session = await repo.createSession(problemStatement, metadata);
    }
    const sessionId = session.id;
    logger.info('Research pipeline started', { sessionId, problemLength: problemStatement.length });

    await repo.updateSessionStatus(sessionId, 'processing');

    const fastMode = process.env.TEMP_FAST_MODE === 'true' || !!metadata.fast;
    if (fastMode) {
        logger.info('FAST_MODE enabled: calling default model only and skipping embeddings/clustering', { sessionId });

        const { system, user } = buildResearchPrompt(problemStatement);
        const settledResults = await executeAllProviders(system, user);
        const { successes, failures } = partitionProviderResults(settledResults);

        if (successes.length === 0) {
            await repo.updateSessionStatus(sessionId, 'failed');
            throw new AppError('Model execution failed in fast mode', 502, 'MODEL_FAILED', failures);
        }

        const provResult = successes[0];
        await repo.saveLlmResponse(sessionId, provResult);
        await repo.updateSessionStatus(sessionId, 'completed');

        const uniqueIdeas = provResult.ideas || [];

        return {
            sessionId,
            status: 'completed',
            summary: {
                totalIdeasGenerated: uniqueIdeas.length,
                uniqueIdeasReturned: uniqueIdeas.length,
                duplicatesRemoved: 0,
                clustersFound: 0,
                providersSucceeded: 1,
                providersFailed: 0,
            },
            uniqueIdeas,
            providerStatus: [{ provider: provResult.provider, status: 'success', latencyMs: provResult.latencyMs }],
        };
    }

    try {
        // ── Step 2: Build prompt + call all providers in parallel ───────────────
        const { system, user } = buildResearchPrompt(problemStatement);
        const settledResults = await executeAllProviders(system, user);
        const { successes, failures } = partitionProviderResults(settledResults);

        if (successes.length === 0) {
            await repo.updateSessionStatus(sessionId, 'failed');
            throw new AppError('All LLM providers failed. Cannot proceed.', 502, 'ALL_PROVIDERS_FAILED', failures);
        }

        logger.info(`Providers: ${successes.length} succeeded, ${failures.length} failed`, { sessionId });

        // ── Step 3: Persist LLM responses + collect all ideas ──────────────────
        const allIdeas = []; // Flat list: [{ idea fields, provider, llmResponseId }]

        for (const provResult of successes) {
            const llmResponseId = await repo.saveLlmResponse(sessionId, provResult);
            for (const idea of provResult.ideas) {
                allIdeas.push({ ...idea, provider: provResult.provider, _llmResponseId: llmResponseId });
            }
        }

        for (const failure of failures) {
            await repo.saveLlmFailure(sessionId, failure.provider, failure.error);
        }

        logger.info(`Total raw ideas collected: ${allIdeas.length}`, { sessionId });

        // ── Step 4: Generate embeddings in ONE batch call ───────────────────────
        const embeddingTexts = allIdeas.map(buildIdeaEmbeddingText);
        const embeddings = await generateEmbeddings(embeddingTexts);

        // Attach embeddings to ideas
        const ideasWithEmbeddings = allIdeas.map((idea, idx) => ({
            ...idea,
            embedding: embeddings[idx],
        }));

        // ── Step 5: Similarity + clustering + deduplication ─────────────────────
        const { enrichedIdeas, clusterIds, summary } = runSimilarityPipeline(ideasWithEmbeddings);

        // ── Step 6: Persist ideas to DB ─────────────────────────────────────────
        // Group by provider/llmResponseId for bulk insert
        const byResponse = new Map();
        enrichedIdeas.forEach((idea, idx) => {
            const key = `${idea.provider}::${idea._llmResponseId}`;
            if (!byResponse.has(key)) byResponse.set(key, []);
            byResponse.get(key).push({ idea, originalIdx: idx });
        });

        const dbIdMap = new Map(); // originalIdx → DB UUID

        for (const [, items] of byResponse) {
            const provider = items[0].idea.provider;
            const llmResponseId = items[0].idea._llmResponseId;
            const ideas = items.map((i) => i.idea);
            const indices = items.map((i) => i.originalIdx);
            const clusterSubset = indices.map((i) => clusterIds[i]);

            const insertedIds = await repo.saveIdeas(sessionId, llmResponseId, provider, ideas, clusterSubset);
            insertedIds.forEach((dbId, pos) => {
                dbIdMap.set(indices[pos], dbId);
            });
        }

        // ── Step 7: Update duplicate foreign key references ─────────────────────
        const dupUpdates = enrichedIdeas
            .map((idea, idx) => ({
                dbId: dbIdMap.get(idx),
                duplicateOfDbId: idea._duplicateOfIdx !== null ? dbIdMap.get(idea._duplicateOfIdx) : null,
                similarityToDuplicate: idea._similarityToDuplicate,
            }))
            .filter((u) => u.duplicateOfDbId !== null);

        if (dupUpdates.length > 0) {
            await repo.updateDuplicateReferences(dupUpdates);
        }

        // ── Step 8: Mark session complete ───────────────────────────────────────
        await repo.updateSessionStatus(sessionId, 'completed');

        // ── Step 9: Fetch final unique ideas for response ───────────────────────
        const uniqueIdeas = await repo.getSessionIdeas(sessionId, true);

        const providerStatus = [
            ...successes.map((s) => ({ provider: s.provider, status: 'success', latencyMs: s.latencyMs })),
            ...failures.map((f) => ({ provider: f.provider, status: 'failed', error: f.error })),
        ];

        logger.info('Research pipeline completed', { sessionId, ...summary });

        return {
            sessionId,
            status: 'completed',
            summary: {
                totalIdeasGenerated: allIdeas.length,
                uniqueIdeasReturned: uniqueIdeas.length,
                duplicatesRemoved: summary.duplicates,
                clustersFound: summary.clusters,
                providersSucceeded: successes.length,
                providersFailed: failures.length,
            },
            uniqueIdeas,
            providerStatus,
        };
    } catch (err) {
        // Only update to failed if it's not already handled
        if (!err.code || err.code !== 'ALL_PROVIDERS_FAILED') {
            try {
                await repo.updateSessionStatus(sessionId, 'failed');
            } catch (dbErr) {
                logger.error('Failed to update session status to failed', { sessionId, error: dbErr.message });
            }
        }
        throw err;
    }
}

/**
 * Deepen a specific idea with more detailed analysis using OpenRouter models.
 *
 * @param {string} sessionId
 * @param {string} ideaId
 * @param {string} model - Model ID (e.g., 'deepseek/deepseek-chat', 'anthropic/claude-3-5-sonnet')
 * @param {number} depthLevel - 1, 2, or 3
 * @returns {Promise<Object>}
 */
async function deepenIdea(sessionId, ideaId, model = config.openRouter.defaultModel, depthLevel = 1) {
    // Validate session and idea exist
    const [session, idea] = await Promise.all([
        repo.getSessionById(sessionId),
        repo.getIdeaById(ideaId),
    ]);

    if (idea.session_id !== sessionId) {
        throw new AppError('Idea does not belong to this session', 400, 'IDEA_SESSION_MISMATCH');
    }

    logger.info('Deepening idea', { sessionId, ideaId, model, depthLevel });

    const { system, user } = buildDeepeningPrompt(
        {
            title: idea.title,
            description: idea.description,
            rationale: idea.rationale,
            category: idea.category,
        },
        session.problem_statement,
        depthLevel
    );

    const deepeningResult = await executeDeepeningProvider(model, system, user);

    const deepeningSessionId = await repo.saveDeepeningSession(sessionId, ideaId, {
        provider: deepeningResult.provider,
        depthLevel,
        promptUsed: user,
        result: deepeningResult.result,
        promptTokens: deepeningResult.promptTokens,
        completionTokens: deepeningResult.completionTokens,
        latencyMs: deepeningResult.latencyMs,
        status: 'success',
    });

    return {
        sessionId,
        ideaId,
        deepeningSessionId,
        result: deepeningResult.result,
        model,
        depthLevel,
    };
}

/**
 * Multi-model research execution - returns raw outputs from all models.
 * Executes all configured models in parallel and returns structured results.
 * No merging, deduplication, or clustering.
 *
 * @param {string} input - Research input/question
 * @returns {Promise<Object>} Structured response with all model outputs
 */
async function runMultiModelResearch(input) {
    logger.info('Multi-model research started', { inputLength: input.length });

    const { modelConfig } = await import('../config/models.js');
    const OpenRouterClient = await import('../clients/openrouterClient.js').then(m => m.default);

    const models = modelConfig.research.map((m) => m.id);
    const systemPrompt = 'You are a helpful research assistant. Provide clear, detailed responses.';
    const userPrompt = input;

    // Initialize client with multi-key support
    const client = new OpenRouterClient({
        apiKey: config.openRouter.apiKey,
        apiKeys: config.openRouter.apiKeys,
        baseURL: config.openRouter.baseURL,
        maxTokens: config.openRouter.maxTokens,
        timeoutMs: config.openRouter.timeoutMs,
        modelKeyMap: config.openRouter.modelKeyMap,
    });

    // Execute all models in parallel
    const promises = models.map(async (model) => {
        try {
            const result = await client.call(model, systemPrompt, userPrompt, 'raw');

            logger.debug(`Model ${model} completed`, { latencyMs: result.latencyMs });

            return {
                model,
                output: result.data || '',
                latencyMs: result.latencyMs,
                promptTokens: result.promptTokens,
                completionTokens: result.completionTokens,
            };
        } catch (err) {
            logger.error(`Model ${model} failed`, { error: err.message });
            return {
                model,
                error: err.message,
            };
        }
    });

    const modelResults = await Promise.all(promises);

    // Format response - preserve raw outputs
    const results = modelResults.map((result) => {
        if (result.error) {
            return {
                model: result.model,
                error: result.error,
            };
        }
        return {
            model: result.model,
            output: result.output,
        };
    });

    const response = {
        input,
        results,
        timestamp: new Date().toISOString(),
        modelCount: models.length,
        successCount: results.filter((r) => !r.error).length,
        failureCount: results.filter((r) => r.error).length,
    };

    logger.info('Multi-model research completed', {
        successCount: response.successCount,
        failureCount: response.failureCount,
    });

    return response;
}

export { runResearchPipeline, deepenIdea, runMultiModelResearch };
