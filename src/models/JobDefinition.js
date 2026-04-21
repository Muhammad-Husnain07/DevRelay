const mongoose = require('mongoose');
const slugify = require('slugify');

const jobDefinitionSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: ''
  },
  handler: {
    type: String,
    required: true
  },
  defaultPriority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },
  defaultTimeout: {
    type: Number,
    default: 30000
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  allowedPayloadSchema: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

jobDefinitionSchema.pre('validate', function(next) {
  if (this.isModified('name') && !this.name.includes('-')) {
    this.name = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

jobDefinitionSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

jobDefinitionSchema.methods.getPublic = function() {
  return {
    id: this._id,
    workspaceId: this.workspaceId,
    name: this.name,
    description: this.description,
    handler: this.handler,
    defaultPriority: this.defaultPriority,
    defaultTimeout: this.defaultTimeout,
    maxAttempts: this.maxAttempts,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('JobDefinition', jobDefinitionSchema);