const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    select: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  prefix: {
    type: String,
    required: true,
    length: 8
  },
  scopes: [{
    type: String,
    enum: ['webhooks:read', 'webhooks:write', 'jobs:read', 'jobs:write', 'scheduler:read', 'scheduler:write', 'gateway:read', 'gateway:write']
  }],
  lastUsedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  githubId: {
    type: String,
    sparse: true,
    unique: true
  },
  githubUsername: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  apiKeys: [apiKeySchema]
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateJWT = function() {
  return jwt.sign(
    { id: this._id, email: this.email, plan: this.plan },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

userSchema.methods.generateApiKey = function(name, scopes = [], expiresInDays = null) {
  const rawKey = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const prefix = rawKey.substring(0, 8);

  const apiKey = {
    key: hash,
    name,
    prefix,
    scopes,
    createdAt: new Date(),
    isActive: true
  };

  if (expiresInDays) {
    apiKey.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  this.apiKeys.push(apiKey);
  
  return { rawKey, prefix, apiKey };
};

userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    plan: this.plan,
    githubUsername: this.githubUsername,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt
  };
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.apiKeys;
  return obj;
};

module.exports = mongoose.model('User', userSchema);