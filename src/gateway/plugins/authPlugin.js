const jwt = require('jsonwebtoken');
const ApiKey = require('../../models/ApiKey');

exports.authPlugin = async (req, res, route) => {
  if (!route.auth.required || route.auth.type === 'none') {
    req.consumerId = 'anonymous';
    return { allowed: true };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { allowed: false, error: 'No authorization header' };
  }

  if (route.auth.type === 'api-key') {
    const apiKey = authHeader.replace(/^Bearer\s+/i, '');
    const key = await ApiKey.findOne({ key: apiKey.substring(0, 8), isActive: true });
    if (!key) return { allowed: false, error: 'Invalid API key' };
    req.consumerId = key.userId.toString();
    req.apiKeyId = key._id;
    return { allowed: true };
  }

  if (route.auth.type === 'jwt') {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
      req.consumerId = decoded.userId || decoded.sub;
      return { allowed: true };
    } catch (err) {
      return { allowed: false, error: 'Invalid or expired token' };
    }
  }

  return { allowed: true };
};