const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireWorkspace } = require('../middleware/workspace');
const { getLiveStats, getTimeSeries, getSummary } = require('../services/metricsService');

router.use(requireAuth, requireWorkspace);

router.get('/:slug/metrics/live', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const stats = await getLiveStats(workspace._id);
  res.json({ stats });
}));

router.get('/:slug/metrics/timeseries', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const { metric = 'deliveries', hours = 24 } = req.query;
  const data = await getTimeSeries(workspace._id, metric, parseInt(hours));
  res.json({ data, metric, hours });
}));

router.get('/:slug/metrics/summary', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const summary = await getSummary(workspace._id);
  res.json({ summary });
}));

module.exports = router;