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
      console.log('\n=== AUTH TEST: PASS ===');
      console.log('Token obtained:', result.token.substring(0, 50) + '...');
      runTests(result.token);
    } else {
      console.log('\n=== AUTH TEST: FAIL ===');
      console.log('Error:', data);
    }
  });
});

loginReq.on('error', (e) => console.error('Login Error:', e.message));
loginReq.write(postData);
loginReq.end();

function runTests(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  // Test workspace summary
  const summaryReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/summary',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== WORKSPACE SUMMARY TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('Data:', JSON.parse(data)); } catch(e) { console.log(data); }
      testWebhooks(token);
    });
  });
  summaryReq.on('error', (e) => console.error('Error:', e.message));
  summaryReq.end();
}

function testWebhooks(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const webhooksReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/webhooks',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== WEBHOOKS LIST TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('Webhooks:', JSON.parse(data)); } catch(e) { console.log(data); }
      testInbound(token);
    });
  });
  webhooksReq.on('error', (e) => console.error('Error:', e.message));
  webhooksReq.end();
}

function testInbound(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/inbound',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== INBOUND TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('Inbound:', JSON.parse(data)); } catch(e) { console.log(data); }
      testJobs(token);
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
}

function testJobs(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/jobs',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== JOBS TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('Jobs:', JSON.parse(data)); } catch(e) { console.log(data); }
      testScheduler(token);
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
}

function testScheduler(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/scheduled-jobs',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== SCHEDULER TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('Scheduled Jobs:', JSON.parse(data)); } catch(e) { console.log(data); }
      testAlerts(token);
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
}

function testAlerts(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/alerts',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== ALERTS TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('Alerts:', JSON.parse(data)); } catch(e) { console.log(data); }
      testGateway(token);
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
}

function testGateway(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/gateway/routes',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== API GATEWAY TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('Routes:', JSON.parse(data)); } catch(e) { console.log(data); }
      testMembers(token);
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
}

function testMembers(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/members',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== MEMBERS TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('Members:', JSON.parse(data)); } catch(e) { console.log(data); }
      testApiKeys(token);
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
}

function testApiKeys(token) {
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/api-keys',
    method: 'GET',
    headers
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\n=== API KEYS TEST ===');
      console.log('Status:', res.statusCode);
      try { console.log('API Keys:', JSON.parse(data)); } catch(e) { console.log(data); }
      console.log('\n=== ALL API TESTS COMPLETE ===');
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
}