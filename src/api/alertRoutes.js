const express = require('express');
const router = express.Router();
const AlertRule = require('../models/AlertRule');
const Alert = require('../models/Alert');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');
const { evaluateRule, evaluateAllRules, fireAlert } = require('../services/alertEngine');

router.use(authenticate);
router.param('workspaceSlug', resolveWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/alerts/rules:
 *   get:
 *     summary: List alert rules
 *     description: Get all alert rules for a workspace
 *     tags: [Alerts]
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
 *         description: List of alert rules
 */
router.get('/:workspaceSlug/alerts/rules', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const rules = await AlertRule.find({ workspaceId: workspace._id }).sort({ createdAt: -1 });
  res.json({ rules });
}));

router.post('/:workspaceSlug/alerts/rules', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const rule = await AlertRule.create({ ...req.body, workspaceId: workspace._id });
  res.status(201).json({ rule });
}));

router.get('/:workspaceSlug/alerts/rules/:id', asyncHandler(async (req, res) => {
  const rule = await AlertRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({ rule });
}));

router.put('/:workspaceSlug/alerts/rules/:id', asyncHandler(async (req, res) => {
  const rule = await AlertRule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({ rule });
}));

router.delete('/:workspaceSlug/alerts/rules/:id', asyncHandler(async (req, res) => {
  const rule = await AlertRule.findByIdAndDelete(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({ message: 'Rule deleted' });
}));

router.post('/:workspaceSlug/alerts/rules/:id/evaluate', asyncHandler(async (req, res) => {
  const result = await evaluateRule(req.params.id);
  res.json({ result });
}));

const evaluators = {
  webhook_failure_rate: require('../services/alertEvaluators/webhookFailureRate'),
  job_failure_rate: require('../services/alertEvaluators/jobFailureRate'),
  queue_depth: require('../services/alertEvaluators/queueDepth'),
  endpoint_consecutive_failures: require('../services/alertEvaluators/endpointConsecutiveFailures'),
  cron_missed: require('../services/alertEvaluators/cronMissed')
};

router.post('/:workspaceSlug/alerts/rules/:id/test', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const rule = await AlertRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  
  const metric = rule.condition?.metric;
  const evaluator = evaluators[metric];
  
  if (!evaluator) {
    return res.status(400).json({ error: `Unknown metric: ${metric}` });
  }
  
  const windowMinutes = rule.condition?.windowMinutes || 5;
  const currentValue = await evaluator.evaluate(workspace._id, windowMinutes);
  res.json({ currentValue, threshold: rule.condition?.threshold });
}));

router.post('/:workspaceSlug/alerts/evaluate', asyncHandler(async (req, res) => {
  await evaluateAllRules();
  res.json({ message: 'Evaluation complete' });
}));

router.get('/:workspaceSlug/alerts', asyncHandler(async (req, res) => {
  const workspace = res.locals.workspace;
  const alerts = await Alert.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ alerts });
}));

router.delete('/:workspaceSlug/alerts/:id', asyncHandler(async (req, res) => {
  const alert = await Alert.findByIdAndDelete(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ message: 'Alert deleted' });
}));

module.exports = router;