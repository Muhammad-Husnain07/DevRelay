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
      console.log('Logged in as demo@devrelay.io');
      getWebhookId(result.token);
    } else {
      console.log('Login failed:', data);
    }
  });
});

loginReq.write(postData);
loginReq.end();

function getWebhookId(token) {
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/webhooks',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      const result = JSON.parse(data);
      const webhooks = result.endpoints || [];
      const testWebhook = webhooks.find(w => w.name === 'Test Outbound');
      
      if (testWebhook) {
        console.log('\nFound webhook:', testWebhook.name);
        testWebhookDelivery(token, testWebhook.id);
      } else {
        console.log('\nNo "Test Outbound" webhook found');
        if (webhooks.length > 0) {
          console.log('Available webhooks:', webhooks.map(w => w.name).join(', '));
        }
      }
    });
  });
  
  req.end();
}

function testWebhookDelivery(token, id) {
  const testData = JSON.stringify({
    payload: {
      event: 'test.trigger',
      data: {
        message: 'Hello from DevRelay!',
        timestamp: new Date().toISOString()
      }
    }
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workspaces/demo-workspace/webhooks/' + id + '/test',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Content-Length': testData.length
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('\nTest Status:', res.statusCode);
      console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
    });
  });
  
  req.write(testData);
  req.end();
}