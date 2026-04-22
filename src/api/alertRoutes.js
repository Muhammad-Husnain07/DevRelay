const express = require('express');
const router = express.Router();
const AlertRule = require('../models/AlertRule');
const Alert = require('../models/Alert');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireWorkspace } = require('../middleware/workspace');
const { evaluateRule, evaluateAllRules, fireAlert } = require('../services/alertEngine');

router.use(requireAuth, requireWorkspace);

router.get('/:slug/alerts/rules', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const rules = await AlertRule.find({ workspaceId: workspace._id }).sort({ createdAt: -1 });
  res.json({ rules });
}));

router.post('/:slug/alerts/rules', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const rule = await AlertRule.create({ ...req.body, workspaceId: workspace._id });
  res.status(201).json({ rule });
}));

router.put('/:slug/alerts/rules/:id', asyncHandler(async (req, res) => {
  const rule = await AlertRule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({ rule });
}));

router.delete('/:slug/alerts/rules/:id', asyncHandler(async (req, res) => {
  const rule = await AlertRule.findByIdAndDelete(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({ message: 'Rule deleted' });
}));

router.post('/:slug/alerts/rules/:id/test', asyncHandler(async (req, res) => {
  const rule = await AlertRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });

  const { value, matches } = await evaluateRule(rule);
  res.json({ ruleId: rule._id, value, threshold: rule.condition.threshold, wouldFire: matches });
}));

router.get('/:slug/alerts/history', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const { status, limit = 50, offset = 0 } = req.query;

  const query = { workspaceId: workspace._id };
  if (status) query.status = status;

  const alerts = await Alert.find(query).populate('ruleId', 'name').sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit));
  res.json({ alerts });
}));

module.exports = router;