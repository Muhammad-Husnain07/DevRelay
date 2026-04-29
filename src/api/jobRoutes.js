const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const JobDefinition = require('../models/JobDefinition');
const { enqueueJob, cancelJob, retryJob, getJobStatus, getJobStats } = require('../services/jobService');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

router.use(authenticate);
router.use('/:workspaceSlug', resolveWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/jobs:
 *   post:
 *     summary: Enqueue a new job
 *     description: Add a new job to the queue for processing
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceSlug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               payload:
 *                 type: object
 *               priority:
 *                 type: number
 *               delay:
 *                 type: number
 *     responses:
 *       201:
 *         description: Job enqueued
 */
router.post('/:workspaceSlug/jobs', async (req, res) => {
  try {
    const { name, payload = {}, priority, delay, scheduledFor, maxAttempts, handler, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Job name is required' });
    }
    
    const job = await enqueueJob(req.workspace._id, name, payload, {
      priority,
      delay,
      scheduledFor,
      maxAttempts,
      handler,
      description
    });
    
    res.status(201).json({ job: job.getPublic() });
  } catch (error) {
    console.error('Enqueue job error:', error);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

/**
 * GET /api/workspaces/{workspaceSlug}/jobs
 * @summary List jobs with filters
 * @tags Jobs
 * @security bearerAuth
 */
router.get('/:workspaceSlug/jobs', async (req, res) => {
  try {
    const { status, name, limit = 50, page = 1 } = req.query;
    
    const query = { workspaceId: req.workspace._id };
    
    if (status) query.status = status;
    if (name) query.name = name;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Job.countDocuments(query);
    
    res.json({
      jobs: jobs.map(j => j.getPublic()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

/**
 * GET /api/workspaces/{workspaceSlug}/jobs/stats
 * @summary Get job statistics
 * @tags Jobs
 * @security bearerAuth
 */
router.get('/:workspaceSlug/jobs/stats', async (req, res) => {
  try {
    const stats = await getJobStats(req.workspace._id);
    res.json({ stats });
  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({ error: 'Failed to get job stats' });
  }
});

/**
 * GET /api/workspaces/{workspaceSlug}/jobs/:id
 * @summary Get job details
 * @tags Jobs
 * @security bearerAuth
 */
router.get('/:workspaceSlug/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const status = await getJobStatus(job._id);
    
    res.json(status);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

/**
 * DELETE /api/workspaces/{workspaceSlug}/jobs/:id
 * @summary Cancel a job
 * @tags Jobs
 * @security bearerAuth
 */
router.delete('/:workspaceSlug/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const cancelled = await cancelJob(job._id);
    
    res.json({ job: cancelled.getPublic() });
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel job' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/jobs/:id/retry
 * @summary Retry a failed job
 * @tags Jobs
 * @security bearerAuth
 */
router.post('/:workspaceSlug/jobs/:id/retry', async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    console.log('Retrying job:', job._id, 'status:', job.status);
    
    const retried = await retryJob(job._id);
    
    console.log('Job retried successfully:', retried._id);
    
    res.json({ job: retried.getPublic() });
  } catch (error) {
    console.error('Retry job error:', error);
    res.status(500).json({ error: error.message || 'Failed to retry job' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/jobs/retry-all
 * @summary Retry all failed jobs
 * @tags Jobs
 * @security bearerAuth
 */
router.post('/:workspaceSlug/jobs/retry-all', async (req, res) => {
  try {
    const failedJobs = await Job.find({
      workspaceId: req.workspace._id,
      status: 'failed'
    });
    
    const results = await Promise.allSettled(
      failedJobs.map(job => retryJob(job._id))
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({ succeeded, failed, jobsCount: failedJobs.length });
  } catch (error) {
    console.error('Retry all jobs error:', error);
    res.status(500).json({ error: error.message || 'Failed to retry jobs' });
  }
});

/**
 * GET /api/workspaces/{workspaceSlug}/job-definitions
 * @summary List job definitions
 * @tags Jobs
 * @security bearerAuth
 */
router.get('/:workspaceSlug/job-definitions', async (req, res) => {
  try {
    const definitions = await JobDefinition.find({ workspaceId: req.workspace._id })
      .sort({ createdAt: -1 });
    
    res.json({ definitions: definitions.map(d => d.getPublic()) });
  } catch (error) {
    console.error('List definitions error:', error);
    res.status(500).json({ error: 'Failed to list job definitions' });
  }
});

module.exports = router;