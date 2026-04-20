const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = user.generateJWT();

    res.status(201).json({
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = user.generateJWT();

    res.json({
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.githubCallback = async (req, res) => {
  try {
    const token = req.user.generateJWT();
    const redirectUrl = `${env.appUrl}/auth/callback?token=${token}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.redirect(`${env.appUrl}/auth/error`);
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

exports.generateApiKey = async (req, res) => {
  try {
    const { name, scopes = [], expiresInDays } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    const user = await User.findById(req.user._id);
    const result = user.generateApiKey(name, scopes, expiresInDays);
    await user.save();

    res.status(201).json({
      rawKey: result.rawKey,
      key: {
        name: result.apiKey.name,
        prefix: result.apiKey.prefix,
        scopes: result.apiKey.scopes,
        expiresAt: result.apiKey.expiresAt,
        createdAt: result.apiKey.createdAt
      },
      message: 'Store this key securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
};

exports.listApiKeys = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const keys = user.apiKeys
      .filter(k => k.isActive)
      .map(k => ({
        name: k.name,
        prefix: k.prefix,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt
      }));

    res.json({ keys });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
};

exports.revokeApiKey = async (req, res) => {
  try {
    const { prefix } = req.params;

    const user = await User.findById(req.user._id);
    const key = user.apiKeys.find(k => k.prefix === prefix && k.isActive);

    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    key.isActive = false;
    await user.save();

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
};

exports.github = (req, res) => {
  // This route is handled by Passport - just redirect to it
  res.redirect('/api/auth/github');
};

exports.githubCallbackHandler = (req, res) => {
  // This is handled by Passport's callback
};