const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const cronstrue = require('cronstrue');
const ScheduledJob = require('../models/ScheduledJob');
const ScheduledJobRun = require('../models/ScheduledJobRun');
const cronManager = require('../scheduler/cronManager');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

function validateCronExpression(expression) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length === 5) {
    return cron.validate(expression);
  }
  if (parts.length === 6) {
    const seconds = parts[0];
    const minutes = parts[1];
    const hours = parts[2];
    const dayOfMonth = parts[3];
    const month = parts[4];
    const dayOfWeek = parts[5];
    
    const inRange = (v, min, max) => {
      if (v === '*') return true;
      if (v.startsWith('*/')) {
        const step = parseInt(v.slice(2));
        return step >= 1;
      }
      if (v.includes(',')) {
        return v.split(',').every(x => inRange(x.trim(), min, max));
      }
      if (v.includes('-')) {
        const [start, end] = v.split('-').map(Number);
        return start >= min && end <= max && start <= end;
      }
      const num = parseInt(v);
      return !isNaN(num) && num >= min && num <= max;
    };
    
    return (
      inRange(seconds, 0, 59) &&
      inRange(minutes, 0, 59) &&
      inRange(hours, 0, 23) &&
      inRange(dayOfMonth, 1, 31) &&
      inRange(month, 1, 12) &&
      inRange(dayOfWeek, 0, 7)
    );
  }
  return false;
}

// Validate cron - NO auth required (public endpoint)
router.post('/validate-cron', async (req, res) => {
  try {
    const { expression } = req.body;
    
    if (!expression) {
      return res.status(400).json({ error: 'Cron expression is required' });
    }
    
    const parts = expression.trim().split(/\s+/);
    const is6Field = parts.length === 6;
    const isValid = validateCronExpression(expression);
    
    if (!isValid) {
      return res.json({ valid: false, error: 'Invalid cron expression' });
    }
    
    let description = '';
    try {
      description = cronstrue.toString(expression, { verbose: true, use24HourTimeFormat: true });
    } catch (err) {
      description = is6Field ? 'Every X seconds' : 'Cron expression';
    }
    
    const nextRuns = [];
    let current = new Date();
    
    const interval = is6Field ? 1000 : 60000;
    for (let i = 0; i < 5; i += 1) {
      current = new Date(current.getTime() + interval);
      nextRuns.push(current.toISOString());
    }
    
    res.json({
      valid: true,
      description,
      nextRuns,
      expression,
      is6Field: !!is6Field
    });
  } catch (error) {
    console.error('Validate cron error:', error);
    res.status(500).json({ error: 'Failed to validate cron expression' });
  }
});

// All routes below require authentication
router.use(authenticate);

router.use('/:workspaceSlug', resolveWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/scheduled-jobs:
 *   get:
 *     summary: List scheduled jobs
 *     description: Get all scheduled jobs for a workspace
 *     tags: [Scheduler]
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
 *         description: List of scheduled jobs
 */
router.get('/:workspaceSlug/scheduled-jobs', async (req, res) => {
  try {
    const jobs = await ScheduledJob.find({ workspaceId: req.workspace._id })
      .sort({ createdAt: -1 });
    
    res.json({ scheduledJobs: jobs.map(j => j.getPublic()) });
  } catch (error) {
    console.error('List scheduled jobs error:', error);
    res.status(500).json({ error: 'Failed to list scheduled jobs' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/scheduled-jobs
 * @summary Create scheduled job
 * @tags Scheduler
 * @security bearerAuth
 */
router.post('/:workspaceSlug/scheduled-jobs', async (req, res) => {
  try {
    const { name, description, cronExpression, timezone, action, timeout, maxConsecutiveFailures } = req.body;
    
    if (!name || !cronExpression || !action) {
      return res.status(400).json({ error: 'Name, cronExpression, and action are required' });
    }
    
    // Validate cron expression
    if (!validateCronExpression(cronExpression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }
    
    // Normalize action type and config
    let actionType = 'http-request';
    let actionConfig = {};
    
    const actType = action.type || action.actionType || '';
    
    if (actType === 'http-request' || actType === 'http') {
      actionType = 'http-request';
      actionConfig = {
        url: action.url || '',
        method: action.method || 'GET',
        headers: action.headers || [],
        body: action.body || ''
      };
    } else if (actType === 'enqueue-job' || actType === 'job') {
      actionType = 'enqueue-job';
      actionConfig = {
        handler: action.handler || 'log-message',
        config: action.config || {}
      };
    } else if (actType === 'webhook-event' || actType === 'event') {
      actionType = 'webhook-event';
      actionConfig = {
        eventType: action.eventType || '',
        payload: action.payload || {}
      };
    } else {
      actionType = 'http-request';
      actionConfig = { url: '', method: 'GET', headers: [], body: '' };
    }
    
    const job = await ScheduledJob.create({
      workspaceId: req.workspace._id,
      name,
      description: description || '',
      cronExpression,
      timezone: timezone || 'UTC',
      action: { type: actionType, config: actionConfig },
      timeout: timeout || 30000,
      maxConsecutiveFailures: maxConsecutiveFailures || 5
    });
    
    // Schedule the job if active
    if (job.isActive) {
      await cronManager.scheduleJob(job);
    }
    
    res.status(201).json({ scheduledJob: job.getPublic() });
  } catch (error) {
    console.error('Create scheduled job error:', error);
    res.status(500).json({ error: 'Failed to create scheduled job' });
  }
});

/**
 * GET /api/workspaces/{workspaceSlug}/scheduled-jobs/:id
 * @summary Get scheduled job
 * @tags Scheduler
 * @security bearerAuth
 */
router.get('/:workspaceSlug/scheduled-jobs/:id', async (req, res) => {
  try {
    const job = await ScheduledJob.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Scheduled job not found' });
    }
    
    res.json({ scheduledJob: job.getPublic() });
  } catch (error) {
    console.error('Get scheduled job error:', error);
    res.status(500).json({ error: 'Failed to get scheduled job' });
  }
});

/**
 * PUT /api/workspaces/{workspaceSlug}/scheduled-jobs/:id
 * @summary Update scheduled job
 * @tags Scheduler
 * @security bearerAuth
 */
router.put('/:workspaceSlug/scheduled-jobs/:id', async (req, res) => {
  try {
    const job = await ScheduledJob.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Scheduled job not found' });
    }
    
    const { name, description, cronExpression, timezone, action, timeout, maxConsecutiveFailures, isActive } = req.body;
    
    if (name) job.name = name;
    if (description !== undefined) job.description = description;
    if (timezone) job.timezone = timezone;
    if (action) job.action = action;
    if (timeout) job.timeout = timeout;
    if (maxConsecutiveFailures) job.maxConsecutiveFailures = maxConsecutiveFailures;
    
    if (cronExpression) {
      if (!cron.validate(cronExpression)) {
        return res.status(400).json({ error: 'Invalid cron expression' });
      }
      job.cronExpression = cronExpression;
    }
    
    if (typeof isActive === 'boolean') {
      job.isActive = isActive;
    }
    
    await job.save();
    
    await cronManager.rescheduleJob(job);
    
    res.json({ scheduledJob: job.getPublic() });
  } catch (error) {
    console.error('Update scheduled job error:', error);
    res.status(500).json({ error: 'Failed to update scheduled job' });
  }
});

/**
 * DELETE /api/workspaces/{workspaceSlug}/scheduled-jobs/:id
 * @summary Delete scheduled job
 * @tags Scheduler
 * @security bearerAuth
 */
router.delete('/:workspaceSlug/scheduled-jobs/:id', async (req, res) => {
  try {
    const job = await ScheduledJob.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Scheduled job not found' });
    }
    
    await cronManager.unscheduleJob(job._id);
    await job.deleteOne();
    
    res.json({ message: 'Scheduled job deleted' });
  } catch (error) {
    console.error('Delete scheduled job error:', error);
    res.status(500).json({ error: 'Failed to delete scheduled job' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/scheduled-jobs/:id/toggle
 * @summary Toggle scheduled job (enable/disable)
 * @tags Scheduler
 * @security bearerAuth
 */
router.post('/:workspaceSlug/scheduled-jobs/:id/toggle', async (req, res) => {
  try {
    const job = await ScheduledJob.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Scheduled job not found' });
    }
    
    job.isActive = !job.isActive;
    await job.save();
    
    if (job.isActive) {
      await cronManager.scheduleJob(job);
    } else {
      await cronManager.unscheduleJob(job._id);
    }
    
    res.json({ scheduledJob: job.getPublic() });
  } catch (error) {
    console.error('Toggle scheduled job error:', error);
    res.status(500).json({ error: 'Failed to toggle scheduled job' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/scheduled-jobs/:id/run-now
 * @summary Run scheduled job now (manual trigger)
 * @tags Scheduler
 * @security bearerAuth
 */
router.post('/:workspaceSlug/scheduled-jobs/:id/run-now', async (req, res) => {
  try {
    const job = await ScheduledJob.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Scheduled job not found' });
    }
    
    await cronManager.executeJob(job);
    
    res.json({ message: 'Job executed successfully' });
  } catch (error) {
    console.error('Run now error:', error);
    res.status(500).json({ error: 'Failed to run job' });
  }
});

/**
 * GET /api/workspaces/{workspaceSlug}/scheduled-jobs/:id/history
 * @summary Get scheduled job run history
 * @tags Scheduler
 * @security bearerAuth
 */
router.get('/:workspaceSlug/scheduled-jobs/:id/history', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const job = await ScheduledJob.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Scheduled job not found' });
    }
    
    const runs = await ScheduledJobRun.find({ scheduledJobId: job._id })
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ScheduledJobRun.countDocuments({ scheduledJobId: job._id });
    
    res.json({
      runs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get run history' });
  }
});

module.exports = router;