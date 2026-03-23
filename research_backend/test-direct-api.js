import axios from 'axios';

console.log('\n' + '='.repeat(90));
console.log('🧪 DIRECT OPENROUTER API TEST - Single Model');
console.log('='.repeat(90) + '\n');

const API_KEY = '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';
const MODEL = 'deepseek/deepseek-chat';

console.log(`📌 Testing model: ${MODEL}`);
console.log(`🔑 API Key: ${API_KEY.substring(0, 15)}...${API_KEY.substring(API_KEY.length - 10)}\n`);

const payload = {
  model: MODEL,
  messages: [
    {
      role: 'system',
      content: 'You are a research assistant. Provide a concise response about sustainable agriculture strategies.'
    },
    {
      role: 'user',
      content: 'What are the most effective strategies for implementing sustainable agriculture in developing countries?'
    }
  ],
  max_tokens: 1000,
  temperature: 0.7
};

console.log('📤 Sending request to OpenRouter...\n');
const startTime = Date.now();

axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Research Engine',
    'Content-Type': 'application/json'
  },
  timeout: 60000
})
.then(response => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Success in ${elapsed}s\n`);
  
  console.log('📊 Response Details:');
  console.log('─'.repeat(90));
  console.log(`Model: ${response.data.model}`);
  console.log(`Usage - Input: ${response.data.usage?.prompt_tokens}, Output: ${response.data.usage?.completion_tokens}`);
  console.log('');
  
  console.log('💬 Model Response:');
  console.log('─'.repeat(90));
  const content = response.data.choices[0]?.message?.content || 'No content';
  const truncated = content.length > 1000 ? content.substring(0, 1000) + '\n\n[... TRUNCATED ...]' : content;
  console.log(truncated);
  console.log('\n' + '='.repeat(90) + '\n');
  
})
.catch(error => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`❌ Error in ${elapsed}s\n`);
  
  console.log('📋 Error Details:');
  console.log('─'.repeat(90));
  console.log(`Status: ${error.response?.status}`);
  console.log(`Code: ${error.code}`);
  console.log(`Message: ${error.message}\n`);
  
  if (error.response?.data) {
    console.log('API Response:');
    console.log(JSON.stringify(error.response.data, null, 2));
  } else {
    console.log('Error Details:', error.response?.data || error);
  }
  
  console.log('\n' + '='.repeat(90));
  console.log('\n⚠️  Possible causes:');
  console.log('1. API key is invalid or expired');
  console.log('2. API key has insufficient quota');
  console.log('3. Model name is incorrect or not available');
  console.log('4. Network connectivity issue');
  console.log('5. OpenRouter service is down\n');
});
