import http from 'http';

const API_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'dev_local_api_key_9f3b';

function testAPI() {
  const problemStatement = 'What are the most effective strategies for implementing sustainable agriculture in developing countries?';
  
  console.log('\n📋 TEST: Research Backend API');
  console.log('================================================\n');
  console.log(`📝 Problem Statement:\n"${problemStatement}"\n`);
  console.log('⏳ Sending request to /research endpoint...\n');
  
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
    timeout: 30000
  };

  const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}\n`);
    
    let data = '';
    let chunks = 0;
    
    res.on('data', (chunk) => {
      data += chunk;
      chunks++;
      process.stdout.write(`.`);
    });

    res.on('end', () => {
      console.log(`\n\n✅ Response received (${chunks} chunks):\n`);
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        // If not JSON, show as text (truncated if needed)
        const text = data.length > 2000 ? data.substring(0, 2000) + '\n... [truncated]' : data;
        console.log(text);
      }
      process.exit(0);
    });
  });

  req.on('error', (error) => {
    console.error(`\n❌ Error: ${error.code || error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.error('Backend is not running on localhost:3000');
    }
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('\n❌ Request timeout');
    req.abort();
    process.exit(1);
  });

  req.write(postData);
  req.end();
}

testAPI();
