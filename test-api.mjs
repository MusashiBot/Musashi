#!/usr/bin/env node

/**
 * Test script for Musashi API
 * Run with: node test-api.mjs
 * Make sure the dev server is running first: npm run dev
 */

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`   ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ ${response.status} ${response.statusText}`);
      console.log(`   Data:`, JSON.stringify(data, null, 2).slice(0, 500));
      return { success: true, data };
    } else {
      console.log(`   ❌ ${response.status} ${response.statusText}`);
      console.log(`   Error:`, data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`   ❌ Request failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Musashi API Test Suite');
  console.log('=' .repeat(50));

  // Test 1: Health Check
  await testEndpoint(
    'Health Check',
    `${BASE_URL}/api/health`
  );

  // Test 2: Analyze Text
  await testEndpoint(
    'Analyze Text - Bitcoin',
    `${BASE_URL}/api/analyze-text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Bitcoin just crossed $100k for the first time!',
        maxResults: 3,
      }),
    }
  );

  // Test 3: Analyze Text - Fed rates
  await testEndpoint(
    'Analyze Text - Fed Rate Cut',
    `${BASE_URL}/api/analyze-text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The Fed is likely to cut interest rates in March after inflation cooled to 2.9%',
        minConfidence: 0.25,
        maxResults: 5,
      }),
    }
  );

  // Test 4: Arbitrage Detection
  await testEndpoint(
    'Arbitrage Detection',
    `${BASE_URL}/api/markets/arbitrage?minSpread=0.05&limit=10`
  );

  // Test 5: Market Movers
  await testEndpoint(
    'Market Movers (1h)',
    `${BASE_URL}/api/markets/movers?timeframe=1h&minChange=0.10&limit=10`
  );

  // Test 6: Market Movers (24h)
  await testEndpoint(
    'Market Movers (24h)',
    `${BASE_URL}/api/markets/movers?timeframe=24h&minChange=0.05&limit=20`
  );

  console.log('\n' + '='.repeat(50));
  console.log('✨ Test suite completed!');
  console.log('\n💡 To run manually:');
  console.log('   curl http://localhost:3000/api/health');
  console.log(`   curl -X POST http://localhost:3000/api/analyze-text \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"text":"Bitcoin to the moon!","maxResults":3}'`);
}

runTests().catch(console.error);
