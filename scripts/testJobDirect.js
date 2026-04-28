const http = require('http');

const postData = JSON.stringify({
  email: "demo@devrelay.io",
  password: "demo123"
});

console.log('=== Logging in ===');
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
    console.log('Login status:', res.statusCode);
    try {
      const result = JSON.parse(data);
      if (result.token) {
        console.log('Token received, creating job...');
        createJob(result.token, 'job-' + Date.now());
      } else {
        console.log('Error:', data);
      }
    } catch(e) {
      console.log('Parse error:', e.message, data);
    }
  });
});

loginReq.write(postData);
loginReq.end();

function createJob(token, jobName) {
  const jobData = JSON.stringify({
    name: jobName,
    queue: 'generic-job',
    payload: { test: true, message: 'Hello World' },
    priority: 'normal'
  });

  console.log('POST data:', jobData);
  
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/jobs',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Content-Length': jobData.length
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Job status:', res.statusCode);
      console.log('Response:', data);
    });
  });
  
  req.on('error', (e) => console.error('Request error:', e.message));
  req.write(jobData);
  req.end();
}