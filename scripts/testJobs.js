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
      console.log('=== JOBS API TEST ===');
      testJobs(result.token);
    }
  });
});

loginReq.write(postData);
loginReq.end();

function testJobs(token) {
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/jobs',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== GET JOBS ===');
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
    });
  });
  req.end();
}