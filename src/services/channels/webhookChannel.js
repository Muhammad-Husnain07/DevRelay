const axios = require('axios');
const crypto = require('crypto');

const send = async (alert, config) => {
  const { url, secret, headers = {} } = config;

  const payload = {
    alertId: alert._id.toString(),
    ruleId: alert.ruleId.toString(),
    severity: alert.severity,
    message: alert.message,
    metric: alert.metric,
    value: alert.value,
    threshold: alert.threshold,
    firedAt: alert.createdAt.toISOString()
  };

  const signature = secret ? crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex') : null;

  await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'X-DevRelay-Signature': `sha256=${signature}` } : {}),
      ...headers
    }
  });
};

module.exports = send;