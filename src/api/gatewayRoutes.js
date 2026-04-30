const express = require('express');
const router = express.Router();
const GatewayRoute = require('../models/GatewayRoute');
const GatewayLog = require('../models/GatewayLog');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

router.use(authenticate);
router.use('/:workspaceSlug', resolveWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/gateway/routes:
 *   get:
 *     summary: List API routes
 *     description: Get all API gateway routes for a workspace
 *     tags: [Gateway]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of gateway routes
 */
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
  const { route: routePath, status: statusFilter, page = 1, limit = 50 } = req.query;
  
  const query = { workspaceId: workspace._id };
  
  if (routePath) {
    query.path = { $regex: routePath, $options: 'i' };
  }
  
  if (statusFilter) {
    const statusCodes = statusFilter.split(',').map(s => {
      const range = s.trim();
      if (range === '2xx') return { $gte: 200, $lt: 300 };
      if (range === '3xx') return { $gte: 300, $lt: 400 };
      if (range === '4xx') return { $gte: 400, $lt: 500 };
      if (range === '5xx') return { $gte: 500, $lt: 600 };
      return parseInt(range);
    });
    if (statusCodes.length === 1) {
      query.statusCode = statusCodes[0];
    } else {
      query.$or = statusCodes.map(s => ({ statusCode: s }));
    }
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const logs = await GatewayLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
  const total = await GatewayLog.countDocuments(query);
  
  res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
}));

router.get('/:workspaceSlug/gateway/stats', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const { routeId, since } = req.query;
  const stats = await GatewayLog.computeStats(workspace._id, routeId || null, since ? new Date(since) : undefined);
  res.json({ stats });
}));

module.exports = router;