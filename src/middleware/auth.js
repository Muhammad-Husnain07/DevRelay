const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const env = require('../config/env');

exports.authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    req.authMethod = 'jwt';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

exports.authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const prefix = apiKey.substring(0, 8);

    const user = await User.findOne({
      'apiKeys.key': hash,
      'apiKeys.isActive': true,
      'apiKeys.prefix': prefix
    }).select('+apiKeys');

    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const keyObj = user.apiKeys.find(k => k.key === hash && k.isActive);

    if (!keyObj) {
      return res.status(401).json({ error: 'API key not found or inactive' });
    }

    if (keyObj.expiresAt && new Date() > keyObj.expiresAt) {
      return res.status(401).json({ error: 'API key expired' });
    }

    keyObj.lastUsedAt = new Date();
    await user.save();

    req.user = user;
    req.apiKey = keyObj;
    req.authMethod = 'api-key';
    next();
  } catch (error) {
    console.error('API Key auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return exports.authenticateJWT(req, res, next);
  }

  if (apiKey) {
    return exports.authenticateApiKey(req, res, next);
  }

  return res.status(401).json({ error: 'Authentication required' });
};

exports.requireScope = (requiredScope) => {
  return (req, res, next) => {
    if (req.authMethod !== 'api-key') {
      return res.status(403).json({ error: 'API key required for this endpoint' });
    }

    if (!req.apiKey.scopes || !req.apiKey.scopes.includes(requiredScope)) {
      return res.status(403).json({ error: `Missing required scope: ${requiredScope}` });
    }

    next();
  };
};