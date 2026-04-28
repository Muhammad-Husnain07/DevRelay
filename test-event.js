const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const WORKSPACE_SLUG = process.env.WORKSPACE_SLUG || 'demo-workspace';
const TOKEN = process.env.API_TOKEN;

async function testDispatchEvent() {
  if (!TOKEN) {
    console.error('Please set API_TOKEN environment variable');
    console.log('Usage: API_TOKEN=<your-token> node test-event.js');
    process.exit(1);
  }

  try {
    console.log('Testing dispatch event...');
    console.log('URL:', `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/events`);
    
    const response = await axios.post(
      `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/events`,
      {
        type: 'test.event',
        payload: { message: 'Hello from test!' }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDispatchEvent();
