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
    if (token) checkJob(token);
  });
});
loginReq.write(loginData);
loginReq.end();

function checkJob(token) {
  http.get('http://localhost:3000/api/workspaces/demo-workspace/jobs/69ee66eb83a08990cb0cf48b', {
    headers: {Authorization: 'Bearer ' + token}
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Result:', JSON.stringify(JSON.parse(d).job.result, null, 2));
    });
  }).on('error', e => console.log('Error:', e.message));
}