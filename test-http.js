const http = require('http');
const crypto = require('crypto');

const testInbound = async () => {
  const slug = 'test-inbound-' + Date.now();
  const rawSecret = crypto.randomBytes(32).toString('hex');
  const payload = JSON.stringify({ event: 'test', data: { message: 'Hello World' } });
  const signature = 'sha256=' + crypto.createHmac('sha256', rawSecret).update(payload).digest('hex');
  
  console.log('Testing Inbound Webhook:');
  console.log('URL:', '/receive/' + slug);
  console.log('Payload:', payload);
  console.log('Signature:', signature);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/receive/' + slug,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-test-signature': signature
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\nResponse Status:', res.statusCode);
        console.log('Response Body:', data);
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.error('Error:', e.message);
      reject(e);
    });
    
    req.write(payload);
    req.end();
  });
};

testInbound().catch(console.error);