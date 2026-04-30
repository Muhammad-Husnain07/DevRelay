const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Consumer = require('../models/Consumer');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

router.use(authenticate);
router.use('/:workspaceSlug', resolveWorkspace);

router.get('/:workspaceSlug/gateway/consumers', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const consumers = await Consumer.find({ workspaceId: workspace._id }).select('-keyHash -secretHash').sort({ createdAt: -1 });
  res.json({ consumers });
}));

router.post('/:workspaceSlug/gateway/consumers', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const { name, description, isActive, rateLimits, quotas } = req.body;
  
  let key = req.body.key;
  let secret = req.body.secret;
  
  if (!key) {
    key = 'dk_' + crypto.randomBytes(16).toString('hex');
  }
  
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const secretHash = secret || crypto.randomBytes(32).toString('hex');
  
  const consumer = await Consumer.create({
    workspaceId: workspace._id,
    name,
    key,
    keyHash,
    secret: secretHash,
    secretHash,
    description: description || '',
    isActive: isActive !== false,
    rateLimits: rateLimits || { requestsPerSecond: 10, requestsPerMinute: 100, requestsPerDay: 10000 },
    quotas: quotas || { monthlyRequests: 100000, currentMonthCount: 0 }
  });
  
  const response = consumer.toObject();
  delete response.keyHash;
  delete response.secretHash;
  
  res.status(201).json({ consumer: response });
}));

router.get('/:workspaceSlug/gateway/consumers/:id', asyncHandler(async (req, res) => {
  const consumer = await Consumer.findById(req.params.id);
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });
  res.json({ consumer });
}));

router.put('/:workspaceSlug/gateway/consumers/:id', asyncHandler(async (req, res) => {
  const consumer = await Consumer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });
  res.json({ consumer });
}));

router.delete('/:workspaceSlug/gateway/consumers/:id', asyncHandler(async (req, res) => {
  const consumer = await Consumer.findByIdAndDelete(req.params.id);
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });
  res.json({ message: 'Consumer deleted' });
}));

router.post('/:workspaceSlug/gateway/consumers/:id/toggle', asyncHandler(async (req, res) => {
  const consumer = await Consumer.findById(req.params.id);
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });
  consumer.isActive = !consumer.isActive;
  await consumer.save();
  res.json({ consumer });
}));

router.get('/:workspaceSlug/gateway/consumers/:id/usage', asyncHandler(async (req, res) => {
  const consumer = await Consumer.findById(req.params.id);
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });
  const since = parseInt(req.query.since) || 86400000;
  const usage = await consumer.getUsage(since);
  res.json({ usage, currentMonthCount: consumer.quotas.currentMonthCount, quotaLimit: consumer.quotas.monthlyRequests });
}));

module.exports = router;