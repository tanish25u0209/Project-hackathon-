import fs from 'fs';
import path from 'path';

console.log('\n' + '='.repeat(90));
console.log('🔧 API CONFIGURATION DIAGNOSTIC');
console.log('='.repeat(90) + '\n');

// Read .env file
const envPath = new URL('../.env', import.meta.url).pathname;
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
  console.error('❌ Could not read .env file:', e.message);
  process.exit(1);
}

console.log('📋 ENV FILE CONTENTS:');
console.log('─'.repeat(90));

// Parse .env
const lines = envContent.split('\n');
const config = {};
lines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    config[key?.trim()] = value?.trim();
  }
});

// Display config
Object.entries(config).forEach(([key, value]) => {
  if (key.includes('KEY') || key.includes('PASSWORD')) {
    // Mask sensitive values
    const masked = value ? value.substring(0, 10) + '...' + value.substring(value.length - 5) : 'NOT SET';
    console.log(`${key}: ${masked}`);
  } else {
    console.log(`${key}: ${value}`);
  }
});

console.log('\n🔍 API KEY ANALYSIS:');
console.log('─'.repeat(90));

const apiKey = config.OPENROUTER_API_KEY;
const apiKeys = config.OPENROUTER_API_KEYS ? config.OPENROUTER_API_KEYS.split(',') : [];

console.log(`Single API Key configured: ${apiKey ? '✓' : '✗'}`);
console.log(`Multiple API Keys configured: ${apiKeys.length > 0 ? `✓ (${apiKeys.length} keys)` : '✗'}`);

if (apiKey) {
  console.log(`\n  Primary Key Format: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`  Valid format (sk-or-v1-...): ${apiKey.startsWith('sk-or-v1-') ? '✓' : '✗'}`);
}

if (apiKeys.length > 0) {
  console.log(`\n  Multiple Keys:`);
  apiKeys.forEach((key, idx) => {
    console.log(`    ${idx + 1}. ${key.substring(0, 8)}...${key.substring(key.length - 5)} (${key.startsWith('sk-or-v1-') ? '✓' : '✗'})`);
  });
}

console.log('\n⚠️  POTENTIAL ISSUES TO CHECK:');
console.log('─'.repeat(90));

const issues = [];

if (!apiKey && apiKeys.length === 0) {
  issues.push('❌ No OpenRouter API keys configured - LLM calls will fail');
} else {
  issues.push('✓ API keys are configured');
}

if (config.NODE_ENV !== 'development') {
  issues.push('⚠️  NODE_ENV is not set to development');
}

if (config.DB_HOST && config.DB_USER && config.DB_PASSWORD) {
  issues.push('✓ Database configuration present');
}

if (!config.REDIS_HOST) {
  issues.push('⚠️  Redis host not configured (optional, affects queue)');
}

issues.forEach(issue => console.log(issue));

console.log('\n💡 NEXT STEPS:');
console.log('─'.repeat(90));
console.log('1. Verify OpenRouter API keys are valid and not expired');
console.log('2. Check OpenRouter account status: https://openrouter.ai');
console.log('3. Verify you have sufficient API quota');
console.log('4. Check network connectivity to https://openrouter.ai/api/v1');
console.log('5. Review backend logs for specific error messages\n');

console.log('='.repeat(90) + '\n');
