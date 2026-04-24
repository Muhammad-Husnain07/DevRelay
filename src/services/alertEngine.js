const { redisClient } = require('../config/redis');
const AlertRule = require('../models/AlertRule');
const Alert = require('../models/Alert');
const { getEmitter } = require('../socket/emitter');

const evaluators = {
  webhook_failure_rate: require('./alertEvaluators/webhookFailureRate'),
  job_failure_rate: require('./alertEvaluators/jobFailureRate'),
  queue_depth: require('./alertEvaluators/queueDepth'),
  endpoint_consecutive_failures: require('./alertEvaluators/endpointConsecutiveFailures'),
  cron_missed: require('./alertEvaluators/cronMissed')
};

const operators = {
  gt: (v, t) => v > t,
  lt: (v, t) => v < t,
  gte: (v, t) => v >= t,
  lte: (v, t) => v <= t,
  eq: (v, t) => v === t
};

const evaluateRule = async (rule) => {
  const evaluator = evaluators[rule.condition.metric];
  if (!evaluator) return null;

  const value = await evaluator.evaluate(
    rule.workspaceId,
    rule.condition.windowMinutes,
    rule.condition.metric === 'queue_depth' ? 'webhook' : null
  );

  const matches = operators[rule.condition.operator](value, rule.condition.threshold);

  return { value, matches };
};

const checkCooldown = async (ruleId) => {
  const key = `alert:cooldown:${ruleId}`;
  const exists = await redisClient.exists(key);
  return exists === 1;
};

const setCooldown = async (ruleId, cooldownMinutes) => {
  const key = `alert:cooldown:${ruleId}`;
  await redisClient.setex(key, cooldownMinutes * 60, '1');
};

const fireAlert = async (rule, value) => {
  const alert = await Alert.create({
    workspaceId: rule.workspaceId,
    ruleId: rule._id,
    severity: rule.severity,
    message: `${rule.name}: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold} (current: ${value.toFixed(2)})`,
    metric: rule.condition.metric,
    value,
    threshold: rule.condition.threshold,
    status: 'firing'
  });

  rule.lastFiredAt = new Date();
  await rule.save();

  const emitter = getEmitter();
  if (emitter) emitter.emitToWorkspace(rule.workspaceId, 'alert:fired', {
    alertId: alert._id,
    ruleId: rule._id,
    severity: rule.severity,
    message: alert.message,
    value,
    threshold: rule.condition.threshold
  });

  for (const channel of rule.channels) {
    try {
      if (channel.type === 'email') {
        await require('./channels/emailChannel')(alert, channel.config);
      } else if (channel.type === 'webhook') {
        await require('./channels/webhookChannel')(alert, channel.config);
      }
    } catch (err) {
      console.error(`[AlertEngine] Channel error:`, err.message);
    }
  }

  return alert;
};

const resolveAlert = async (alertId) => {
  const alert = await Alert.findByIdAndUpdate(alertId, { status: 'resolved', resolvedAt: new Date() }, { new: true });
  if (!alert) return null;

  const emitter = getEmitter();
  if (emitter) emitter.emitToWorkspace(alert.workspaceId, 'alert:resolved', { alertId: alert._id, ruleId: alert.ruleId });

  return alert;
};

const evaluateAllRules = async (workspaceId) => {
  const rules = await AlertRule.find({ workspaceId, isActive: true });
  const results = [];

  for (const rule of rules) {
    try {
      const { value, matches } = await evaluateRule(rule);

      if (matches && !(await checkCooldown(rule._id))) {
        await fireAlert(rule, value);
        results.push({ ruleId: rule._id, fired: true, value });
        await setCooldown(rule._id, rule.cooldownMinutes);
      } else {
        results.push({ ruleId: rule._id, fired: false, value });
      }
    } catch (err) {
      console.error(`[AlertEngine] Rule evaluation error:`, err.message);
    }
  }

  return results;
};

module.exports = { evaluateRule, evaluateAllRules, fireAlert, resolveAlert, checkCooldown };