const mongoose = require('mongoose');
const slugify = require('slugify');

const memberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const workspaceSchema = new mongoose.Schema({
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
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  settings: {
    webhookTimeout: {
      type: Number,
      default: 30
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    rateLimit: {
      type: Number,
      default: 1000
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

workspaceSchema.pre('validate', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  next();
});

workspaceSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.userId.toString() === userId.toString());
};

workspaceSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member && ['owner', 'admin'].includes(member.role);
};

workspaceSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member ? member.role : null;
};

workspaceSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug });
};

workspaceSchema.statics.findByUser = function(userId) {
  return this.find({ 'members.userId': userId, isActive: true });
};

module.exports = mongoose.model('Workspace', workspaceSchema);