import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'dev_local_api_key_9f3b';

async function testResearchEndpoint() {
  try {
    console.log('\n📋 Testing Research Endpoint with Problem Statement');
    console.log('================================================\n');
    
    const problemStatement = 'What are the most effective strategies for implementing sustainable agriculture in developing countries?';
    
    console.log(`📝 Problem Statement:\n"${problemStatement}"\n`);
    console.log('⏳ Calling /research endpoint...\n');
    
    const response = await axios.post(`${API_URL}/research`, {
      input: problemStatement
    }, {
      headers: {
        'x-api-key': API_KEY
      },
      timeout: 60000
    });
    
    console.log('✅ Response Received!\n');
    console.log('Status:', response.status);
    console.log('\nData:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status);
      console.error('Message:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Backend not running on localhost:3000');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

testResearchEndpoint();
