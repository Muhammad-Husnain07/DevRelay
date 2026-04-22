const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const ScheduledJob = require('../models/ScheduledJob');
const ScheduledJobRun = require('../models/ScheduledJobRun');
const cronManager = require('../scheduler/cronManager');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

router.use(authenticate);
router.use('/:workspaceSlug', resolveWorkspace);

/**
 * GET /api/workspaces/{workspaceSlug}/scheduled-jobs
 * @summary List scheduled jobs
 * @tags Scheduler
 * @security bearerAuth
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
    
    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }
    
    if (!['http-request', 'enqueue-job', 'webhook-event'].includes(action.type)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }
    
    const job = await ScheduledJob.create({
      workspaceId: req.workspace._id,
      name,
      description: description || '',
      cronExpression,
      timezone: timezone || 'UTC',
      action,
      timeout: timeout || 30000,
      maxConsecutiveFailures: maxConsecutiveFailures || 5
    });
    
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

const cronstrue = require('cronstrue');

router.post('/validate-cron', async (req, res) => {
  try {
    const { expression, timezone } = req.body;
    
    if (!expression) {
      return res.status(400).json({ error: 'Cron expression is required' });
    }
    
    const isValid = cron.validate(expression);
    
    if (!isValid) {
      return res.json({ valid: false, error: 'Invalid cron expression' });
    }
    
    let description = '';
    try {
      description = cronstrue.toString(expression, { verbose: true });
    } catch (err) {
      description = 'Cron expression';
    }
    
    const nextRuns = [];
    let current = new Date();
    
    for (let i = 0; i < 5; i += 1) {
      current = new Date(current.getTime() + 60000);
      nextRuns.push(current.toISOString());
    }
    
    res.json({
      valid: true,
      description,
      nextRuns,
      expression
    });
  } catch (error) {
    console.error('Validate cron error:', error);
    res.status(500).json({ error: 'Failed to validate cron expression' });
  }
});

module.exports = router;