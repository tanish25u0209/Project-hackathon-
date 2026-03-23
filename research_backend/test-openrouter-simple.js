'use strict';

import 'dotenv/config';
import config from './src/config/index.js';
import OpenAI from 'openai';

console.log('='.repeat(70));
console.log('🚀 OPENROUTER API CONNECTIVITY TEST (SIMPLE)');
console.log('='.repeat(70));

console.log('\n🔍 Configuration:');
console.log(`   Base URL: ${config.openRouter.baseURL}`);
console.log(`   API Key: ${config.openRouter.apiKey.substring(0, 10)}...${config.openRouter.apiKey.slice(-4)}`);
console.log(`   Default Model: ${config.openRouter.defaultModel}`);

async function testConnectivity() {
  const client = new OpenAI({
    apiKey: config.openRouter.apiKey,
    baseURL: config.openRouter.baseURL,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Research Engine',
    },
  });

  console.log('\n⏳ Testing connectivity...');

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'user',
          content: 'Respond with the word "connected" only.',
        },
      ],
      max_tokens: 50,
    });

    const message = response.choices[0].message.content;
    
    console.log('\n✅ SUCCESS! API Connection Working');
    console.log(`   Response: "${message}"`);
    console.log(`   Tokens used: ${response.usage.total_tokens}`);
    console.log(`   Model: ${response.model}`);

    return { status: 'success', message };
  } catch (err) {
    console.log('\n❌ Connection Failed');
    console.log(`   Error: ${err.message}`);
    console.log(`   Status: ${err.status}`);
    return { status: 'failed', error: err.message };
  }
}

async function main() {
  const result = await testConnectivity();

  console.log('\n' + '='.repeat(70));
  console.log('📋 TEST RESULT');
  console.log('='.repeat(70));

  if (result.status === 'success') {
    console.log('\n✅ OpenRouter API Key is VALID and WORKING');
    console.log('   • API Key format: Valid OpenRouter key');
    console.log('   • Authentication: Success');
    console.log('   • Model availability: DeepSeek accessible');
    console.log('   • All systems: GO ✓');
  } else {
    console.log('\n❌ OpenRouter API Connection Failed');
    console.log(`   Issue: ${result.error}`);
  }

  console.log('='.repeat(70) + '\n');
  process.exit(result.status === 'success' ? 0 : 1);
}

main().catch(() => process.exit(1));
