const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireAuth } = require('../middleware/auth');
const { getSystemHealth, getSystemStats, getQueueStatus } = require('../services/systemHealthService');
const { getQueues } = require('../config/queues');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const WebhookEndpoint = require('../models/WebhookEndpoint');
const Job = require('../models/Job');
const AuditLog = require('../models/AuditLog');

router.use(requireAuth, requireAdmin);

router.get('/health', async (req, res) => {
  const health = await getSystemHealth();
  res.json(health);
});

router.get('/stats', async (req, res) => {
  const stats = await getSystemStats();
  res.json(stats);
});

router.get('/queues', async (req, res) => {
  const status = await getQueueStatus();
  res.json({ queues: status });
});

router.get('/workspaces', async (req, res) => {
  const { page = 1, limit = 20, plan, search } = req.query;
  const query = {};

  if (plan) query.plan = plan;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [workspaces, total] = await Promise.all([
    Workspace.find(query)
      .populate('ownerId', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }),
    Workspace.countDocuments(query)
  ]);

  res.json({ workspaces, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.get('/workspaces/:id', async (req, res) => {
  const workspace = await Workspace.findById(req.params.id).populate('members.userId', 'name email');

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const [webhookCount, jobCount, deliveryCount] = await Promise.all([
    WebhookEndpoint.countDocuments({ workspaceId: workspace._id }),
    Job.countDocuments({ workspaceId: workspace._id }),
    WebhookDelivery.countDocuments({ workspaceId: workspace._id })
  ]);

  const recentLogs = await AuditLog.find({ workspaceId: workspace._id })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    workspace,
    stats: { webhookCount, jobCount, deliveryCount },
    recentAuditLogs: recentLogs
  });
});

router.post('/workspaces/:id/suspend', async (req, res) => {
  const workspace = await Workspace.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  res.json({ message: 'Workspace suspended', workspace });
});

router.post('/workspaces/:id/reinstate', async (req, res) => {
  const workspace = await Workspace.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  res.json({ message: 'Workspace reinstated', workspace });
});

router.get('/users', async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(query).select('-password').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    User.countDocuments(query)
  ]);

  res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const workspaces = await Workspace.find({ 'members.userId': user._id });
  const recentLogs = await AuditLog.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10);

  res.json({ user, workspaces, recentAuditLogs: recentLogs });
});

router.post('/users/:id/ban', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User banned', user });
});

router.put('/users/:id/plan', async (req, res) => {
  const { plan } = req.body;
  if (!['free', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const user = await User.findByIdAndUpdate(req.params.id, { plan }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'Plan updated', user });
});

router.post('/queues/:name/pause', async (req, res) => {
  const queue = getQueues()[req.params.name];
  if (!queue) return res.status(404).json({ error: 'Queue not found' });

  await queue.pause();
  res.json({ message: `Queue ${req.params.name} paused` });
});

router.post('/queues/:name/resume', async (req, res) => {
  const queue = getQueues()[req.params.name];
  if (!queue) return res.status(404).json({ error: 'Queue not found' });

  await queue.resume();
  res.json({ message: `Queue ${req.params.name} resumed` });
});

router.delete('/queues/:name/failed', async (req, res) => {
  const queue = getQueues()[req.params.name];
  if (!queue) return res.status(404).json({ error: 'Queue not found' });

  await queue.clean(0, 0, 'failed');
  res.json({ message: `Failed jobs in ${req.params.name} cleared` });
});

router.post('/queues/:name/retry-failed', async (req, res) => {
  const queue = getQueues()[req.params.name];
  if (!queue) return res.status(404).json({ error: 'Queue not found' });

  const failed = await queue.getFailed();
  let retried = 0;

  for (const job of failed) {
    await job.retry();
    retried++;
  }

  res.json({ message: `${retried} failed jobs requeued`, retried });
});

module.exports = router;