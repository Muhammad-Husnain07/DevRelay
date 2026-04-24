const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  key: { type: String, required: true },
  prefix: { type: String, required: true },
  scopes: [{ type: String }],
  lastUsedAt: { type: Date },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

apiKeySchema.index({ userId: 1 });
apiKeySchema.index({ key: 1 });
apiKeySchema.index({ prefix: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);