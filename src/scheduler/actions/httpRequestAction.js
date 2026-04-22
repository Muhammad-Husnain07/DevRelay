const axios = require('axios');

async function execute(config, payload = {}) {
  const { url, method = 'GET', headers = {}, body = null } = config;
  
  const response = await axios({
    url,
    method: method.toUpperCase(),
    headers,
    data: body,
    timeout: 30000,
    validateStatus: () => true
  });
  
  return {
    statusCode: response.status,
    body: response.data
  };
}

module.exports = { execute };