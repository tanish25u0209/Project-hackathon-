'use strict';

require('dotenv').config();

const config = require('./src/config');
const OpenAI = require('openai');

// Test prompt
const TEST_PROMPT = 'Say "Test successful" in exactly 2-3 words.';

async function testGemini() {
  console.log('\n🧪 Testing FLAN-T5 (via Hugging Face)...');
  try {
    const model = config.huggingface.flan_t5Model;
    const url = `${config.huggingface.baseURL}/${model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.huggingface.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: TEST_PROMPT,
        parameters: {
          max_length: 100,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${response.status} - ${error.error || 'Unknown error'}`);
    }

    const result = await response.json();
    const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
    
    console.log('✅ FLAN-T5: SUCCESS');
    console.log(`   Response: "${text}"`);
    return { provider: 'flan-t5', status: 'success', response: text };
  } catch (err) {
    console.log('❌ FLAN-T5: FAILED');
    console.log(`   Error: ${err.message}`);
    return { provider: 'flan-t5', status: 'failed', error: err.message };
  }
}

async function testGrok() {
  console.log('\n🧪 Testing Llama-2-13b (via Hugging Face)...');
  try {
    const model = config.huggingface.llumaModel;
    const url = `${config.huggingface.baseURL}/${model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.huggingface.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: TEST_PROMPT,
        parameters: {
          max_length: 100,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${response.status} - ${error.error || 'Unknown error'}`);
    }

    const result = await response.json();
    const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
    
    console.log('✅ LLAMA-2: SUCCESS');
    console.log(`   Response: "${text}"`);
    return { provider: 'llama-2', status: 'success', response: text };
  } catch (err) {
    console.log('❌ LLAMA-2: FAILED');
    console.log(`   Error: ${err.message}`);
    return { provider: 'llama-2', status: 'failed', error: err.message };
  }
}

async function testOpenRouter() {
  console.log('\n🧪 Testing OPENROUTER API...');
  try {
    const client = new OpenAI({
      apiKey: config.openRouter.apiKey,
      baseURL: config.openRouter.baseURL,
    });

    const response = await client.chat.completions.create({
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'user', content: TEST_PROMPT },
      ],
      max_tokens: 100,
    });

    const text = response.choices[0].message.content;
    
    console.log('✅ OPENROUTER: SUCCESS');
    console.log(`   Response: "${text}"`);
    return { provider: 'openrouter', status: 'success', response: text };
  } catch (err) {
    console.log('❌ OPENROUTER: FAILED');
    console.log(`   Error: ${err.message}`);
    return { provider: 'openrouter', status: 'failed', error: err.message };
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('API KEY TEST SUITE');
  console.log('='.repeat(60));

  const results = [];
  
  results.push(await testGemini());
  results.push(await testGrok());
  results.push(await testOpenRouter());

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');

  console.log(`\n✅ Working: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    if (r.provider === 'flan-t5') {
      console.log(`   • FLAN-T5 (google/flan-t5-xl)`);
    } else if (r.provider === 'llama-2') {
      console.log(`   • LLAMA-2 (meta-llama/Llama-2-13b-hf)`);
    } else {
      console.log(`   • ${r.provider.toUpperCase()}`);
    }
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      if (r.provider === 'flan-t5') {
        console.log(`   • FLAN-T5 (google/flan-t5-xl): ${r.error}`);
      } else if (r.provider === 'llama-2') {
        console.log(`   • LLAMA-2 (meta-llama/Llama-2-13b-hf): ${r.error}`);
      } else {
        console.log(`   • ${r.provider.toUpperCase()}: ${r.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  process.exit(failed.length > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
