const crypto = require('crypto');
const Consumer = require('../../models/Consumer');

exports.authPlugin = async (req, res, route) => {
  if (!route.auth.required || route.auth.type === 'none') {
    req.consumerId = 'anonymous';
    return { allowed: true };
  }

  const apiKeyHeader = req.headers['x-api-key'];

  if (route.auth.type === 'consumer-key') {
    if (!apiKeyHeader) {
      return { allowed: false, error: 'X-API-Key header required' };
    }

    const inputKeyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const consumer = await Consumer.findOne({ 
      keyHash: inputKeyHash, 
      isActive: true,
      workspaceId: route.workspaceId
    });

    if (!consumer) {
      return { allowed: false, error: 'Invalid API key' };
    }

    req.consumerId = consumer.key;
    req.consumer = consumer;

    return { allowed: true };
  }

  return { allowed: false, error: 'Invalid auth type' };
};