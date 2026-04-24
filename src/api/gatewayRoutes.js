const express = require('express');
const router = express.Router();
const GatewayRoute = require('../models/GatewayRoute');
const GatewayLog = require('../models/GatewayLog');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

router.use(requireAuth);
router.param('workspaceSlug', resolveWorkspace);

router.get('/:workspaceSlug/gateway/routes', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const routes = await GatewayRoute.find({ workspaceId: workspace._id }).sort({ priority: 1 });
  res.json({ routes });
}));

router.post('/:workspaceSlug/gateway/routes', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const route = await GatewayRoute.create({ ...req.body, workspaceId: workspace._id });
  res.status(201).json({ route });
}));

router.put('/:workspaceSlug/gateway/routes/:id', asyncHandler(async (req, res) => {
  const route = await GatewayRoute.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json({ route });
}));

router.delete('/:workspaceSlug/gateway/routes/:id', asyncHandler(async (req, res) => {
  const route = await GatewayRoute.findByIdAndDelete(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json({ message: 'Route deleted' });
}));

router.get('/:workspaceSlug/gateway/logs', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const { routeId, since = 3600000, limit = 100, offset = 0 } = req.query;
  const logs = await GatewayLog.find({
    workspaceId: workspace._id,
    createdAt: { $gte: new Date(Date.now() - parseInt(since)) }
  }).sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit));
  res.json({ logs });
}));

router.get('/:workspaceSlug/gateway/stats', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const { routeId, since } = req.query;
  const stats = await GatewayLog.computeStats(workspace._id, routeId || null, since ? new Date(since) : undefined);
  res.json({ stats });
}));

module.exports = router;