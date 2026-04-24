const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');
const { getLiveStats, getTimeSeries, getSummary } = require('../services/metricsService');

router.use(authenticate);
router.param('workspaceSlug', resolveWorkspace);

router.get('/:workspaceSlug/metrics/live', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const stats = await getLiveStats(workspace._id);
  res.json({ stats });
}));

router.get('/:workspaceSlug/metrics/timeseries', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const { metric = 'deliveries', hours = 24 } = req.query;
  const data = await getTimeSeries(workspace._id, metric, parseInt(hours));
  res.json({ data, metric, hours });
}));

router.get('/:workspaceSlug/metrics/summary', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const summary = await getSummary(workspace._id);
  res.json({ summary });
}));

module.exports = router;