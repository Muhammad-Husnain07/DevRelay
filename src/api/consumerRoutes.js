const express = require('express');
const router = express.Router();
const Consumer = require('../models/Consumer');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

router.use(requireAuth);
router.param('workspaceSlug', resolveWorkspace);

router.get('/:workspaceSlug/gateway/consumers', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const consumers = await Consumer.find({ workspaceId: workspace._id }).sort({ createdAt: -1 });
  res.json({ consumers });
}));

router.post('/:workspaceSlug/gateway/consumers', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const consumer = await Consumer.create({ ...req.body, workspaceId: workspace._id });
  res.status(201).json({ consumer });
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

router.get('/:workspaceSlug/gateway/consumers/:id/usage', asyncHandler(async (req, res) => {
  const consumer = await Consumer.findById(req.params.id);
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });
  const since = parseInt(req.query.since) || 86400000;
  const usage = await consumer.getUsage(since);
  res.json({ usage, currentMonthCount: consumer.quotas.currentMonthCount, quotaLimit: consumer.quotas.monthlyRequests });
}));

module.exports = router;