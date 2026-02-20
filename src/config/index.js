'use strict';

require('dotenv').config();

const requiredEnvVars = [
  'OPENROUTER_API_KEY',
  'HUGGINGFACE_API_KEY',
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

  // Direct Providers
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY,
    baseURL: process.env.HUGGINGFACE_BASE_URL || 'https://router.huggingface.co/models',
    maxTokens: parseInt(process.env.HF_MAX_TOKENS || '2000', 10),
    timeoutMs: parseInt(process.env.HF_TIMEOUT_MS || '60000', 10),
    flan_t5Model: process.env.FLAN_T5_MODEL || 'google/flan-t5-xl',
    llumaModel: process.env.LLAMA_MODEL || 'meta-llama/Llama-2-13b-hf',
  },

  // OpenRouter (DeepSeek, Perplexity, Anthropic)
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000', 10),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '60000', 10),

    // Default fallback
    defaultModel: process.env.DEFAULT_MODEL || 'deepseek/deepseek-chat',

    // Models to use for the main research phase via OpenRouter
    // Note: 'grok' and 'gemini' are handled directly, so they are NOT in this list
    researchModels: [
      'deepseek/deepseek-chat',
      'anthropic/claude-3-5-sonnet',
      'perplexity/sonar',
    ],
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

module.exports = config;
