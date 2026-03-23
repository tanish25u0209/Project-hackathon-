'use strict';

import 'dotenv/config';
import { getResearchModels, modelConfig } from './models.js';

/**
 * Build a mapping of model IDs to API key indices for key-per-model assignment.
 * Distributes models round-robin across available keys.
 */
function buildModelKeyMap(models, apiKeysEnv) {
  const keys = (apiKeysEnv || '').split(',').filter(Boolean).map((k) => k.trim());
  if (keys.length === 0) return {}; // No keys provided, will use default

  const map = {};
  models.forEach((model, idx) => {
    map[model.id] = keys[idx % keys.length];
  });
  return map;
}

const requiredEnvVars = [
  'OPENROUTER_API_KEY',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'API_KEY',
];

// Validate required env vars
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.API_KEY,
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    poolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '10000', 10),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  },

  // OpenRouter - Single unified provider for all LLM access
  openRouter: {
    // Support both single key (legacy) and multiple keys (new)
    apiKey: process.env.OPENROUTER_API_KEY,
    apiKeys: (process.env.OPENROUTER_API_KEYS || '').split(',').filter(Boolean).map((k) => k.trim()),
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000', 10),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '60000', 10),

    // Default fallback model
    defaultModel: process.env.DEFAULT_MODEL || modelConfig.default,

    // Research phase models - comma-separated env var or defaults
    researchModels: (process.env.RESEARCH_MODELS || '').split(',').filter(Boolean).length > 0
      ? (process.env.RESEARCH_MODELS || '').split(',').map((m) => m.trim())
      : modelConfig.research.slice(0, 3).map((m) => m.id), // Default to first 3 models

    // Key-to-model mapping: maps model ID to API key index
    modelKeyMap: buildModelKeyMap(modelConfig.research, process.env.OPENROUTER_API_KEYS),
  },

  embedding: {
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10),
  },

  similarity: {
    clusterThreshold: parseFloat(process.env.CLUSTER_THRESHOLD || '0.80'),
    dedupThreshold: parseFloat(process.env.DEDUP_THRESHOLD || '0.85'),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    globalMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    researchMax: parseInt(process.env.RESEARCH_RATE_LIMIT_MAX || '20', 10),
  },

  queue: {
    name: process.env.QUEUE_NAME || 'research-jobs',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
    attempts: parseInt(process.env.JOB_ATTEMPTS || '2', 10),
    backoffMs: parseInt(process.env.JOB_BACKOFF_MS || '5000', 10),
  },
};

export default config;
