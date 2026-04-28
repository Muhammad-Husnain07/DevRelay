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
      console.log('=== CREATE UNIQUE JOB ===');
      createJob(result.token, 'unique-test-job-' + Date.now());
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
    priority: 'normal',
    delay: 0
  });

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
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
    });
  });
  
  req.write(jobData);
  req.end();
}