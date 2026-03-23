'use strict';

/**
 * Model Configuration for OpenRouter
 * Contains all available models and their configurations
 */

const modelConfig = {
  // Research models used for main research pipeline
  research: [
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'DeepSeek',
      maxTokens: 4096,
      costPer1kTokens: { input: 0.0005, output: 0.002 },
    },
    {
      id: 'perplexity/sonar',
      name: 'Perplexity Sonar',
      provider: 'Perplexity',
      maxTokens: 4096,
      costPer1kTokens: { input: 0.003, output: 0.015 },
    },
    {
      id: 'mistralai/mistral-large',
      name: 'Mistral Large',
      provider: 'Mistral',
      maxTokens: 4096,
      costPer1kTokens: { input: 0.004, output: 0.012 },
    },
    {
      id: 'meta-llama/llama-3-8b-instruct',
      name: 'Llama 3 8B Instruct',
      provider: 'Meta',
      maxTokens: 4096,
      costPer1kTokens: { input: 0.0002, output: 0.0003 },
    },
    {
      id: 'google/gemma-3-27b-it',
      name: 'Gemma 3 27B IT',
      provider: 'Google',
      maxTokens: 4096,
      costPer1kTokens: { input: 0.0001, output: 0.0002 },
    },
  ],

  // Deepening models used for idea expansion
  deepening: [
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'DeepSeek',
      maxTokens: 4096,
    },
    {
      id: 'perplexity/sonar',
      name: 'Perplexity Sonar',
      provider: 'Perplexity',
      maxTokens: 4096,
    },
  ],

  // Default model fallback
  default: 'deepseek/deepseek-chat',
};

/**
 * Get research models based on config
 * Filters models based on comma-separated list from env or returns all
 */
function getResearchModels(envVar) {
  if (!envVar) {
    return modelConfig.research.map((m) => m.id);
  }

  const modelIds = envVar.split(',').map((id) => id.trim());
  return modelIds.filter((id) =>
    modelConfig.research.some((m) => m.id === id)
  );
}

/**
 * Get model metadata by model ID
 */
function getModelMetadata(modelId) {
  const allModels = [...modelConfig.research, ...modelConfig.deepening];
  return allModels.find((m) => m.id === modelId);
}

export {
  modelConfig,
  getResearchModels,
  getModelMetadata,
};
