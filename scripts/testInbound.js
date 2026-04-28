const http = require('http');

const postData = JSON.stringify({
  email: "demo@devrelay.io",
  password: "demo123"
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.token) {
      console.log('Token:', result.token);
      testInbound(result.token);
    } else {
      console.log('Login failed:', data);
    }
  });
});

loginReq.on('error', (e) => console.error('Error:', e.message));
loginReq.write(postData);
loginReq.end();

function testInbound(token) {
  const inboundReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/inbound',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\nInbound API Status:', res.statusCode);
      console.log('Response:', data);
    });
  });
  
  inboundReq.on('error', (e) => console.error('Error:', e.message));
  inboundReq.end();
}