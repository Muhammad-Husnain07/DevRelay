const http = require('http');
const url = 'http://localhost:3000/api/health';

console.log('Testing health endpoint...');
http.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Health:', data);
  });
}).on('error', (e) => console.error('Error:', e.message));