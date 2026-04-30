const mongoose = require('mongoose');
const crypto = require('crypto');

const consumerSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true },
  key: { type: String, required: true },
  keyHash: { type: String, required: true },
  secretHash: { type: String, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  rateLimits: {
    requestsPerSecond: { type: Number, default: 10 },
    requestsPerMinute: { type: Number, default: 100 },
    requestsPerDay: { type: Number, default: 10000 }
  },
  quotas: {
    monthlyRequests: { type: Number, default: 100000 },
    currentMonthCount: { type: Number, default: 0 },
    quotaResetAt: { type: Date, default: () => getNextMonthReset() }
  },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

function getNextMonthReset() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

consumerSchema.methods.generateKeyPair = function() {
  this.key = 'dk_' + crypto.randomBytes(16).toString('hex');
  this.keyHash = crypto.createHash('sha256').update(this.key).digest('hex');
  return this.key;
};

consumerSchema.methods.generateSecret = function() {
  this.secretHash = crypto.randomBytes(32).toString('hex');
  return this.secretHash;
};

consumerSchema.methods.verifyKey = function(inputKey) {
  const inputHash = crypto.createHash('sha256').update(inputKey).digest('hex');
  return this.keyHash === inputHash;
};

consumerSchema.methods.verifySecret = function(inputSecret) {
  if (!this.secretHash) return true;
  return crypto.timingSafeEqual(
    Buffer.from(this.secretHash),
    Buffer.from(inputSecret)
  );
};

consumerSchema.pre('save', function(next) {
  if (this.isModified('key') && !this.keyHash) {
    this.keyHash = crypto.createHash('sha256').update(this.key).digest('hex');
  }
  next();
});

consumerSchema.index({ workspaceId: 1, keyHash: 1 }, { unique: true });
consumerSchema.index({ workspaceId: 1 });

consumerSchema.methods.getUsage = async function(since = 24 * 3600000) {
  const GatewayLog = mongoose.model('GatewayLog');
  const logs = await GatewayLog.aggregate([
    {
      $match: {
        consumerId: this.key,
        createdAt: { $gte: new Date(Date.now() - since) }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  return logs;
};

consumerSchema.methods.resetQuota = async function() {
  this.quotas.currentMonthCount = 0;
  this.quotas.quotaResetAt = getNextMonthReset();
  await this.save();
};

module.exports = mongoose.model('Consumer', consumerSchema);