import http from 'http';

const API_KEY = 'dev_local_api_key_9f3b';

console.log('\n' + '='.repeat(90));
console.log('🔬 TESTING ALL 5 MODELS OUTPUT - INDIVIDUAL RESPONSES');
console.log('='.repeat(90) + '\n');

// Problem Statement
const problemStatement = 'What are the most effective strategies for implementing sustainable agriculture in developing countries?';

console.log('📝 INPUT:');
console.log('─'.repeat(90));
console.log(`"${problemStatement}"\n`);

console.log('🚀 MODELS TO BE CALLED:');
console.log('─'.repeat(90));
console.log('1. deepseek/deepseek-chat       (DeepSeek)');
console.log('2. perplexity/sonar             (Perplexity)');
console.log('3. mistralai/mistral-large      (Mistral)');
console.log('4. meta-llama/llama-3-8b-instruct (Llama 3)');
console.log('5. google/gemma-3-27b-it        (Gemma)\n');

console.log('⏳ CALLING /api/v1/multimodel ENDPOINT...\n');

const postData = JSON.stringify({
  input: problemStatement,
  depth: 'medium'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/multimodel',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'x-api-key': API_KEY
  },
  timeout: 180000  // 3 minutes
};

let startTime = Date.now();
let dataChunks = '';

const req = http.request(options, (res) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Status Code: ${res.statusCode} [${elapsed}s]\n`);
  
  res.on('data', (chunk) => {
    dataChunks += chunk;
    const progress = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r[${progress}s] Receiving data (${(dataChunks.length / 1024).toFixed(1)} KB)...`);
  });

  res.on('end', () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\n✅ Response received in ${elapsed} seconds\n`);
    
    try {
      const json = JSON.parse(dataChunks);
      
      console.log('📊 RESPONSE STRUCTURE:');
      console.log('─'.repeat(90));
      console.log(`Session ID: ${json.data?.sessionId}`);
      console.log(`Timestamp: ${json.data?.timestamp}`);
      console.log(`Duration: ${json.duration}ms (${(json.duration / 1000).toFixed(1)}s)\n`);
      
      // Check if multimodel_outputs exists
      if (json.data?.multimodel_outputs && Array.isArray(json.data.multimodel_outputs)) {
        console.log(`📡 MODEL RESPONSES: ${json.data.multimodel_outputs.length} responses received\n`);
        
        json.data.multimodel_outputs.forEach((response, idx) => {
          console.log(`${'═'.repeat(90)}`);
          console.log(`📌 MODEL ${idx + 1}: ${response.model || response.provider || 'Unknown'}`);
          console.log(`${'─'.repeat(90)}`);
          
          if (response.output) {
            // Truncate output if too long
            const output = response.output;
            const truncated = output.length > 1000 ? output.substring(0, 1000) + '\n\n[... TRUNCATED FOR DISPLAY ...]' : output;
            console.log(truncated);
          } else if (response.error) {
            console.log(`❌ ERROR: ${response.error}`);
          } else {
            console.log('⚠️  No output or error information');
          }
          console.log('');
        });
      } else if (json.data?.rawOutputs && Array.isArray(json.data.rawOutputs)) {
        console.log(`📡 RAW OUTPUTS: ${json.data.rawOutputs.length} responses received\n`);
        
        json.data.rawOutputs.forEach((response, idx) => {
          console.log(`${'═'.repeat(90)}`);
          console.log(`📌 MODEL ${idx + 1}: ${response.model || 'Unknown'}`);
          console.log(`${'─'.repeat(90)}`);
          
          if (response.output) {
            const output = response.output;
            const truncated = output.length > 1000 ? output.substring(0, 1000) + '\n\n[... TRUNCATED FOR DISPLAY ...]' : output;
            console.log(truncated);
          } else {
            console.log('⚠️  No output');
          }
          console.log('');
        });
      } else {
        console.log('📄 FULL RESPONSE:');
        console.log(JSON.stringify(json, null, 2));
      }
      
      console.log('═'.repeat(90));
      console.log('\n✅ Test completed successfully!\n');
      
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.log('Raw response (first 2000 chars):', dataChunks.substring(0, 2000));
    }
    
    process.exit(0);
  });
});

req.on('error', (e) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n❌ ERROR (${elapsed}s): ${e.message}`);
  
  if (e.code === 'ECONNREFUSED') {
    console.log('Backend not running on localhost:3000');
  }
  
  process.exit(1);
});

req.on('timeout', () => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  TIMEOUT (${elapsed}s) - Request took too long`);
  req.abort();
  process.exit(1);
});

req.write(postData);
req.end();
