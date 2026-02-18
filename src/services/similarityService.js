'use strict';

const config = require('../config');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// COSINE SIMILARITY
// ─────────────────────────────────────────────

/**
 * Compute cosine similarity between two vectors.
 * Returns a value in [-1, 1] where 1 = identical direction.
 *
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    // Clamp to [-1, 1] to handle floating point drift
    return Math.min(1, Math.max(-1, dot / denominator));
}

/**
 * Compute the full N×N cosine similarity matrix for an array of embeddings.
 * Complexity: O(N² × D) — for N=20 ideas at D=1536 dims, ~600k ops, instant.
 *
 * We compute only the upper triangle and mirror it (symmetric matrix optimization).
 *
 * @param {number[][]} embeddings - Array of embedding vectors
 * @returns {number[][]} - N×N matrix where matrix[i][j] = cosineSimilarity(embeddings[i], embeddings[j])
 */
function buildSimilarityMatrix(embeddings) {
    const n = embeddings.length;
    // Initialize N×N matrix with zeros
    const matrix = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        matrix[i][i] = 1.0; // Self-similarity is always 1
        for (let j = i + 1; j < n; j++) {
            const sim = cosineSimilarity(embeddings[i], embeddings[j]);
            matrix[i][j] = sim;
            matrix[j][i] = sim; // Mirror: matrix is symmetric
        }
    }

    return matrix;
}

// ─────────────────────────────────────────────
// UNION-FIND (Disjoint Set Union) for clustering
// ─────────────────────────────────────────────

class UnionFind {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        // Path compression
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(x, y) {
        const px = this.find(x);
        const py = this.find(y);
        if (px === py) return; // Already in the same set

        // Union by rank for balanced trees
        if (this.rank[px] < this.rank[py]) {
            this.parent[px] = py;
        } else if (this.rank[px] > this.rank[py]) {
            this.parent[py] = px;
        } else {
            this.parent[py] = px;
            this.rank[px]++;
        }
    }

    connected(x, y) {
        return this.find(x) === this.find(y);
    }
}

/**
 * Assign cluster IDs using single-linkage clustering via Union-Find.
 * Two ideas are in the same cluster if their similarity ≥ threshold.
 *
 * @param {number[][]} matrix - N×N similarity matrix
 * @param {number} threshold - Similarity threshold (default from config: 0.80)
 * @returns {number[]} - Array of cluster IDs (one per idea, same index order)
 */
function clusterIdeas(matrix, threshold = config.similarity.clusterThreshold) {
    const n = matrix.length;
    const uf = new UnionFind(n);

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (matrix[i][j] >= threshold) {
                uf.union(i, j);
            }
        }
    }

    // Normalize cluster IDs: map root indices to sequential integers
    const rootToClusterId = new Map();
    let nextId = 0;
    const clusterIds = [];

    for (let i = 0; i < n; i++) {
        const root = uf.find(i);
        if (!rootToClusterId.has(root)) {
            rootToClusterId.set(root, nextId++);
        }
        clusterIds.push(rootToClusterId.get(root));
    }

    const numClusters = rootToClusterId.size;
    logger.info(`Clustering complete: ${n} ideas → ${numClusters} clusters (threshold=${threshold})`);

    return clusterIds;
}

// ─────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────

/**
 * Identify duplicates within each cluster.
 * For each pair with similarity ≥ dedupThreshold, mark the lower-confidence idea as duplicate.
 *
 * @param {Array<Object>} ideas - Array of idea objects with { confidence_score, ... }
 * @param {number[][]} matrix - N×N similarity matrix
 * @param {number[]} clusterIds - Cluster assignment per idea
 * @param {number} dedupThreshold - Similarity above which ideas are considered duplicates
 * @returns {Array<Object>} - Same ideas array with isDuplicate, duplicateOfIdx, similarityToDuplicate added
 */
function deduplicateIdeas(
    ideas,
    matrix,
    clusterIds,
    dedupThreshold = config.similarity.dedupThreshold
) {
    const n = ideas.length;
    // Track which ideas are already marked as duplicates
    const isDuplicate = new Array(n).fill(false);
    const duplicateOfIdx = new Array(n).fill(null);
    const similarityToDuplicate = new Array(n).fill(null);

    // Group ideas by cluster for efficient comparison
    const clusters = new Map();
    for (let i = 0; i < n; i++) {
        const cid = clusterIds[i];
        if (!clusters.has(cid)) clusters.set(cid, []);
        clusters.get(cid).push(i);
    }

    // Process each cluster
    for (const [, members] of clusters) {
        if (members.length <= 1) continue; // Single-member cluster, no dedup needed

        // Compare all pairs within the cluster
        for (let mi = 0; mi < members.length; mi++) {
            for (let mj = mi + 1; mj < members.length; mj++) {
                const i = members[mi];
                const j = members[mj];

                if (isDuplicate[i] || isDuplicate[j]) continue; // Skip already-flagged

                const sim = matrix[i][j];
                if (sim >= dedupThreshold) {
                    // Keep the idea with higher confidence_score; mark the other as duplicate
                    const confI = ideas[i].confidence_score || 0;
                    const confJ = ideas[j].confidence_score || 0;

                    const keepIdx = confI >= confJ ? i : j;
                    const dropIdx = confI >= confJ ? j : i;

                    isDuplicate[dropIdx] = true;
                    duplicateOfIdx[dropIdx] = keepIdx;
                    similarityToDuplicate[dropIdx] = sim;

                    logger.debug(`Duplicate detected: idea[${dropIdx}] is duplicate of idea[${keepIdx}] (sim=${sim.toFixed(3)})`);
                }
            }
        }
    }

    const uniqueCount = isDuplicate.filter((d) => !d).length;
    const dupCount = isDuplicate.filter((d) => d).length;
    logger.info(`Deduplication complete: ${uniqueCount} unique, ${dupCount} duplicates (threshold=${dedupThreshold})`);

    return ideas.map((idea, idx) => ({
        ...idea,
        _isDuplicate: isDuplicate[idx],
        _duplicateOfIdx: duplicateOfIdx[idx],
        _similarityToDuplicate: similarityToDuplicate[idx],
    }));
}

/**
 * Full pipeline: takes ideas with embeddings, returns enriched ideas with cluster + dedup info.
 *
 * @param {Array<{ embedding: number[], confidence_score: number, ...}>} ideas
 * @returns {{
 *   enrichedIdeas: Array,
 *   matrix: number[][],
 *   clusterIds: number[],
 *   summary: { totalIdeas, uniqueIdeas, duplicates, clusters }
 * }}
 */
function runSimilarityPipeline(ideas) {
    if (ideas.length === 0) return { enrichedIdeas: [], matrix: [], clusterIds: [], summary: {} };

    const embeddings = ideas.map((idea) => idea.embedding);

    // Step 1: Build full similarity matrix
    const matrix = buildSimilarityMatrix(embeddings);

    // Step 2: Cluster
    const clusterIds = clusterIdeas(matrix);

    // Step 3: Deduplicate
    const enriched = deduplicateIdeas(ideas, matrix, clusterIds);

    const uniqueIdeas = enriched.filter((i) => !i._isDuplicate);
    const duplicates = enriched.filter((i) => i._isDuplicate);

    const summary = {
        totalIdeas: ideas.length,
        uniqueIdeas: uniqueIdeas.length,
        duplicates: duplicates.length,
        clusters: new Set(clusterIds).size,
    };

    return { enrichedIdeas: enriched, matrix, clusterIds, summary };
}

module.exports = {
    cosineSimilarity,
    buildSimilarityMatrix,
    clusterIdeas,
    deduplicateIdeas,
    runSimilarityPipeline,
    UnionFind,
};
