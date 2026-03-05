const fetch = require('node-fetch');

async function testHealth() {
  const url = 'https://musashi-api.vercel.app/api/health';
  const res = await fetch(url);
  const data = await res.json();
  
  console.log('HTTP Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log('\nSDK would access:');
  console.log('  status:', data.data?.status);
  console.log('  timestamp:', data.data?.timestamp);
  console.log('  services:', data.data?.services);
}

testHealth().catch(console.error);
