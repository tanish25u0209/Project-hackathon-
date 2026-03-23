'use strict';

import logger from '../utils/logger.js';

/**
 * Advanced Research Intelligence Synthesis Engine
 * Takes raw model outputs and synthesizes them into elite-level research output
 */

class SynthesisEngine {
    /**
     * Synthesize raw model outputs into strategic ideas
     * @param {Array} rawOutputs - Array of { model, raw_output, ... }
     * @returns {Object} - Synthesized research JSON
     */
    synthesize(rawOutputs) {
        logger.info('Starting synthesis', { outputCount: rawOutputs.length });

        try {
            // Extract all distinct ideas from raw outputs
            const allIdeas = this.extractIdeasFromOutputs(rawOutputs);
            logger.debug('Extracted ideas', { totalIdeas: allIdeas.length });

            // Analyze and cluster semantically similar ideas
            const clusters = this.clusterIdeas(allIdeas);
            logger.debug('Clustered ideas', { clusterCount: clusters.length });

            // Identify dominant themes
            const dominantThemes = this.identifyDominantThemes(clusters, rawOutputs);

            // Identify contrarian insights
            const contrarianInsights = this.identifyContrarianInsights(clusters, rawOutputs);

            // Identify systemic patterns
            const systemicPatterns = this.identifySystemicPatterns(clusters);

            // Generate unique, strategic ideas
            const uniqueIdeas = this.generateUniqueIdeas(clusters, rawOutputs);

            // Identify and list discarded ideas
            const discardedIdeas = this.identifyDiscardedIdeas(allIdeas, uniqueIdeas);

            const result = {
                researchSummary: {
                    dominantThemes,
                    contrarianInsights,
                    systemicPatterns,
                },
                uniqueIdeas,
                discardedIdeas,
                metadata: {
                    modelCount: rawOutputs.length,
                    totalIdeasExtracted: allIdeas.length,
                    clusterCount: clusters.length,
                    synthesizedAt: new Date().toISOString(),
                },
            };

            logger.info('Synthesis complete', {
                uniqueIdeasCount: uniqueIdeas.length,
                discardedIdeasCount: discardedIdeas.length,
            });

            return result;
        } catch (err) {
            logger.error('Synthesis failed', { error: err.message });
            throw err;
        }
    }

    /**
     * Extract distinct ideas from raw model outputs
     * @private
     */
    extractIdeasFromOutputs(rawOutputs) {
        const ideas = [];

        rawOutputs.forEach((output) => {
            if (!output.raw_output) return;

            // Parse raw output (assume it's either JSON or text)
            const lines = output.raw_output.split('\n').filter((line) => line.trim());

            // Extract numbered or bulleted items
            lines.forEach((line) => {
                const cleaned = line
                    .replace(/^\d+[\.\)]\s*/, '') // Remove numbering
                    .replace(/^[-*]\s+/, '') // Remove bullets
                    .replace(/\*\*/g, '') // Remove markdown bold
                    .trim();

                if (cleaned.length > 10 && cleaned.length < 500) {
                    // Filter out very short or very long lines
                    ideas.push({
                        text: cleaned,
                        source: output.model,
                        createdAt: output.created_at,
                    });
                }
            });
        });

        return ideas;
    }

    /**
     * Cluster semantically similar ideas
     * @private
     */
    clusterIdeas(ideas) {
        const clusters = [];
        const processed = new Set();

        ideas.forEach((idea, idx) => {
            if (processed.has(idx)) return;

            const cluster = [idea];
            processed.add(idx);

            // Find semantically similar ideas
            ideas.forEach((other, otherIdx) => {
                if (otherIdx <= idx || processed.has(otherIdx)) return;

                if (this.isSemanticallySimlar(idea.text, other.text)) {
                    cluster.push(other);
                    processed.add(otherIdx);
                }
            });

            clusters.push(cluster);
        });

        return clusters;
    }

    /**
     * Check semantic similarity between two ideas
     * @private
     */
    isSemanticallySimlar(text1, text2) {
        // Simple semantic similarity: shared keywords / common structure
        const keywords1 = text1.toLowerCase().split(/\s+/);
        const keywords2 = text2.toLowerCase().split(/\s+/);

        const common = keywords1.filter((k) => keywords2.includes(k));
        const similarity = (2 * common.length) / (keywords1.length + keywords2.length);

        return similarity > 0.4; // Threshold
    }

    /**
     * Identify dominant themes (consensus ideas)
     * @private
     */
    identifyDominantThemes(clusters, rawOutputs) {
        return clusters
            .filter((cluster) => cluster.length >= 3) // Appears in 3+ models
            .map((cluster) => this.synthesizeCluster(cluster))
            .slice(0, 5); // Top 5
    }

    /**
     * Identify contrarian insights (unique single-model insights)
     * @private
     */
    identifyContrarianInsights(clusters, rawOutputs) {
        return clusters
            .filter((cluster) => cluster.length === 1) // Single source
            .map((cluster) => cluster[0].text)
            .filter((text) => text.length > 50) // Substantive
            .slice(0, 5); // Top 5
    }

    /**
     * Identify systemic patterns
     * @private
     */
    identifySystemicPatterns(clusters) {
        // Patterns that appear across multiple clusters
        const patterns = [
            'Async-first or asynchronous communication',
            'Outcome-based or results-focused evaluation',
            'Documentation and knowledge management',
            'Leadership distribution or delegation',
            'Tool consolidation or integration',
            'Team structure or organizational design',
        ];

        return patterns
            .map((pattern) => ({
                pattern,
                appearanceCount: clusters.filter((c) =>
                    c.some((idea) => idea.text.toLowerCase().includes(pattern.toLowerCase()))
                ).length,
            }))
            .filter((p) => p.appearanceCount >= 2)
            .map((p) => p.pattern);
    }

    /**
     * Generate unique, strategic ideas from clusters
     * @private
     */
    generateUniqueIdeas(clusters, rawOutputs) {
        return clusters
            .filter((cluster) => cluster.length >= 2) // Multi-source consensus
            .map((cluster) => {
                const derivedModels = [...new Set(cluster.map((idea) => idea.source))];
                const synthesis = this.synthesizeCluster(cluster);

                return {
                    title: this.extractTitle(synthesis),
                    description: synthesis,
                    derivedFromModels: derivedModels,
                    supportCount: derivedModels.length,
                    ideaType: derivedModels.length >= 3 ? 'consensus' : 'emerging',
                };
            })
            .sort((a, b) => b.supportCount - a.supportCount)
            .slice(0, 10); // Top 10
    }

    /**
     * Synthesize a cluster of similar ideas into a coherent statement
     * @private
     */
    synthesizeCluster(cluster) {
        // Return the longest/most detailed idea as representative
        const longest = cluster.reduce((max, idea) =>
            idea.text.length > max.text.length ? idea : max
        );
        return longest.text;
    }

    /**
     * Extract a short title from an idea
     * @private
     */
    extractTitle(text) {
        const words = text.split(/[\s,;:/]/).filter((w) => w.length > 3);
        return words.slice(0, 5).join(' ');
    }

    /**
     * Identify ideas that are discarded (generic, redundant, low-leverage)
     * @private
     */
    identifyDiscardedIdeas(allIdeas, uniqueIdeas) {
        const keepTexts = new Set(uniqueIdeas.map((u) => u.description));

        const generic = ['build', 'improve', 'better', 'increase', 'communication', 'team'];

        return allIdeas
            .filter((idea) => !keepTexts.has(idea.text))
            .filter((idea) => {
                const lowerText = idea.text.toLowerCase();
                return (
                    generic.filter((g) => lowerText.includes(g)).length <= 1 ||
                    idea.text.length < 30
                );
            })
            .slice(0, 5)
            .map((idea) => ({
                reason: 'generic | redundant | low leverage',
                originalTitle: idea.text.substring(0, 100),
            }));
    }
}

export default SynthesisEngine;
