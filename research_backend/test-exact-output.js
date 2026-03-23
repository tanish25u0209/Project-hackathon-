import http from 'http';

const API_KEY = 'dev_local_api_key_9f3b';

console.log('\n' + '='.repeat(80));
console.log('🧪 TESTING RESEARCH BACKEND WITH PROBLEM STATEMENT');
console.log('='.repeat(80) + '\n');

// Problem Statement
const problemStatement = 'How can emerging startups compete effectively against established corporations in the technology sector?';

console.log('📋 PROBLEM STATEMENT:');
console.log('─'.repeat(80));
console.log(`"${problemStatement}"\n`);

console.log('📤 SENDING REQUEST TO BACKEND:');
console.log('─'.repeat(80));
console.log('Endpoint: POST /api/v1/research');
console.log('Payload:', JSON.stringify({ problemStatement }, null, 2));
console.log('\n⏳ Waiting for response...\n');

const postData = JSON.stringify({
  problemStatement: problemStatement
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/research',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'x-api-key': API_KEY
  },
  timeout: 120000  // 2 minutes to allow external API calls
};

let startTime = Date.now();
let chunks = 0;

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
    chunks++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`.\r[${elapsed}s]`);
  });

  res.on('end', () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\n✅ RESPONSE RECEIVED (${elapsed}s, ${chunks} chunks)\n`);
    
    console.log('📊 RESPONSE DETAILS:');
    console.log('─'.repeat(80));
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Response Size: ${data.length} bytes\n`);
    
    console.log('📄 EXACT OUTPUT:');
    console.log('─'.repeat(80) + '\n');
    
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
    
    console.log('\n' + '='.repeat(80));
    process.exit(0);
  });
});

req.on('error', (e) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n❌ ERROR (after ${elapsed}s)\n`);
  console.log('Error Details:', {
    code: e.code,
    message: e.message,
    errno: e.errno
  });
  
  if (e.code === 'ECONNREFUSED') {
    console.log('\n⚠️  Backend not running on localhost:3000');
  } else if (e.code === 'ETIMEDOUT' || e.code === 'ESC_TIMEOUT') {
    console.log('\n⚠️  Request timeout - External LLM providers are slow or unreachable');
    console.log('   Typical causes:');
    console.log('   - OpenRouter API rate limits');
    console.log('   - Invalid or expired API keys');
    console.log('   - Network connectivity issues');
    console.log('   - External services down');
  }
  
  process.exit(1);
});

req.on('timeout', () => {
  req.abort();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n⏱️  REQUEST TIMEOUT (${elapsed}s)\n`);
  console.log('The request exceeded the 2-minute timeout.');
  console.log('This typically means the external LLM providers are not responding.');
  process.exit(1);
});

req.write(postData);
req.end();
