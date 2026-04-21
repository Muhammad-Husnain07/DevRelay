const mongoose = require('mongoose');
const crypto = require('crypto');

const inboundWebhookSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  method: {
    type: String,
    enum: ['POST', 'PUT', 'PATCH'],
    default: 'POST'
  },
  secret: {
    type: String,
    select: false
  },
  secretPrefix: {
    type: String,
    default: ''
  },
  signatureHeader: {
    type: String,
    default: 'x-hub-signature-256'
  },
  signatureAlgorithm: {
    type: String,
    enum: ['sha256', 'sha1', 'md5'],
    default: 'sha256'
  },
  signatureFormat: {
    type: String,
    enum: ['hex', 'base64'],
    default: 'hex'
  },
  signaturePrefix: {
    type: String,
    default: ''
  },
  transformScript: {
    type: String,
    default: null
  },
  eventTypeField: {
    type: String,
    default: 'type'
  },
  defaultEventType: {
    type: String,
    default: 'webhook.received'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  requestCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

inboundWebhookSchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    const slugBase = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.slug = slugBase + '-' + Date.now().toString(36).substring(0, 4);
  }
  next();
});

inboundWebhookSchema.methods.generateSecret = function() {
  const rawSecret = crypto.randomBytes(24).toString('hex');
  const hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex');
  
  this.secret = hashedSecret;
  this.secretPrefix = rawSecret.substring(0, 6);
  
  return rawSecret;
};

inboundWebhookSchema.methods.verifySecret = function(rawSecret) {
  const hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex');
  return hashedSecret === this.secret;
};

inboundWebhookSchema.methods.incrementRequestCount = async function() {
  this.requestCount += 1;
  await this.save();
};

inboundWebhookSchema.methods.getPublic = function() {
  return {
    id: this._id,
    workspaceId: this.workspaceId,
    name: this.name,
    slug: this.slug,
    method: this.method,
    secretPrefix: this.secretPrefix,
    signatureHeader: this.signatureHeader,
    signatureAlgorithm: this.signatureAlgorithm,
    signatureFormat: this.signatureFormat,
    signaturePrefix: this.signaturePrefix,
    eventTypeField: this.eventTypeField,
    defaultEventType: this.defaultEventType,
    isActive: this.isActive,
    requestCount: this.requestCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('InboundWebhook', inboundWebhookSchema);