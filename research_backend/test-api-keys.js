'use strict';

import 'dotenv/config';
import config from './src/config/index.js';
import OpenRouterClient from './src/clients/openrouterClient.js';
import { modelConfig } from './src/config/models.js';

// Test prompt
const TEST_PROMPT = 'Say "Test successful" in exactly 2-3 words. Only respond with those words, nothing else.';

async function testOpenRouterModels() {
  console.log('\n🧪 Testing OpenRouter Models...');
  
  const client = new OpenRouterClient({
    apiKey: config.openRouter.apiKey,
    baseURL: config.openRouter.baseURL,
    maxTokens: 500,
    timeoutMs: 60000,
  });

  const results = [];
  
  // Test only DeepSeek (lowest cost, most reliable for testing)
  const modelsToTest = ['deepseek/deepseek-chat'];
  
  for (const model of modelsToTest) {
    try {
      console.log(`   Testing ${model}...`);
      
      // Use a proper system+user prompt that expects JSON research output
      const systemPrompt = `You are a research assistant. Respond with valid JSON.`;
      const userPrompt = `Generate 1 research idea about AI safety in JSON format with field "ideas" containing an array with objects having "title" and "description" fields.`;
      
      const response = await client.call(
        model,
        systemPrompt,
        userPrompt,
        'research'
      );

      console.log(`   ✅ ${model}: SUCCESS`);
      console.log(`      Ideas returned: ${response.ideas?.length || 0}`);
      console.log(`      Tokens: ${response.promptTokens} → ${response.completionTokens}`);
      console.log(`      Latency: ${response.latencyMs}ms`);
      
      results.push({ 
        model, 
        status: 'success', 
        latencyMs: response.latencyMs,
        tokens: response.promptTokens + response.completionTokens 
      });
    } catch (err) {
      console.log(`   ❌ ${model}: FAILED`);
      console.log(`      Error: ${err.message}`);
      results.push({ 
        model, 
        status: 'failed', 
        error: err.message 
      });
    }
  }

  return results;
}

async function testDefaultModel() {
  console.log('\n🧪 Testing Default Model (Fallback)...');
  
  const client = new OpenRouterClient({
    apiKey: config.openRouter.apiKey,
    baseURL: config.openRouter.baseURL,
    maxTokens: 500,
    timeoutMs: 60000,
  });

  const model = config.openRouter.defaultModel;
  
  try {
    console.log(`   Testing ${model}...`);
    
    // Use a proper system+user prompt that expects JSON research output
    const systemPrompt = `You are a research assistant. Respond with valid JSON.`;
    const userPrompt = `Generate 1 research idea about machine learning in JSON format with field "ideas" containing an array with objects having "title" and "description" fields.`;
    
    const response = await client.call(
      model,
      systemPrompt,
      userPrompt,
      'research'
    );

    console.log(`   ✅ ${model}: SUCCESS`);
    console.log(`      Ideas returned: ${response.ideas?.length || 0}`);
    console.log(`      Tokens: ${response.promptTokens} → ${response.completionTokens}`);
    console.log(`      Latency: ${response.latencyMs}ms`);
    
    return { 
      model, 
      status: 'success', 
      latencyMs: response.latencyMs,
      tokens: response.promptTokens + response.completionTokens 
    };
  } catch (err) {
    console.log(`   ❌ ${model}: FAILED`);
    console.log(`      Error: ${err.message}`);
    return { 
      model, 
      status: 'failed', 
      error: err.message 
    };
  }
}

async function testOpenRouterAPIKey() {
  console.log('\n🧪 Testing OpenRouter API Key Validity...');
  
  if (!config.openRouter.apiKey) {
    console.log('   ❌ OPENROUTER_API_KEY: NOT SET');
    return { status: 'failed', error: 'API key not set' };
  }

  if (!config.openRouter.apiKey.startsWith('sk-or-')) {
    console.log('   ⚠️  OPENROUTER_API_KEY: Invalid format (should start with sk-or-)');
  } else {
    console.log('   ✅ OPENROUTER_API_KEY: Valid format');
  }

  // Mask the key for security
  const masked = config.openRouter.apiKey.substring(0, 10) + '...' + config.openRouter.apiKey.substring(config.openRouter.apiKey.length - 4);
  console.log(`      Key: ${masked}`);

  return { status: 'success', apiKey: masked };
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('🚀 OPENROUTER API KEY TEST SUITE');
  console.log('='.repeat(70));

  // Test API key format
  const keyTest = await testOpenRouterAPIKey();

  // Test models
  const modelTests = await testOpenRouterModels();
  const defaultModelTest = await testDefaultModel();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  const allTests = [...modelTests, defaultModelTest];
  const successful = allTests.filter(r => r.status === 'success');
  const failed = allTests.filter(r => r.status === 'failed');

  console.log(`\n✅ Models Working: ${successful.length}/${allTests.length}`);
  successful.forEach(r => {
    console.log(`   • ${r.model}`);
    console.log(`     └─ Latency: ${r.latencyMs}ms | Tokens: ${r.tokens}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Models Failed: ${failed.length}/${allTests.length}`);
    failed.forEach(r => {
      console.log(`   • ${r.model}`);
      console.log(`     └─ ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('NOTES:');
  console.log('  • All models accessed via OpenRouter (unified interface)');
  console.log('  • Hugging Face integration removed');
  console.log('  • Only OpenRouter API key required: OPENROUTER_API_KEY');
  console.log('='.repeat(70) + '\n');

  process.exit(failed.length > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
