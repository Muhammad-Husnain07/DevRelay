const http = require('http');

const loginData = JSON.stringify({email:'demo@devrelay.io', password:'demo123'});
const loginReq = http.request({
  hostname: 'localhost', port: 3000, path: '/api/auth/login',
  method: 'POST', headers: {'Content-Type':'application/json', 'Content-Length':loginData.length}
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const token = JSON.parse(d).token;
    if (token) getJob(token);
  });
});
loginReq.write(loginData);
loginReq.end();

function getJob(token) {
  http.get('http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs/69ee702452ff6b456e2f6b10', {
    headers: {Authorization: 'Bearer ' + token}
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const json = JSON.parse(d);
      console.log('Action:', JSON.stringify(json.scheduledJob.action, null, 2));
    });
  }).on('error', e => console.log('Error:', e.message));
}