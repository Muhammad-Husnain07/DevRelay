const cron = require('node-cron');
const ScheduledJob = require('../models/ScheduledJob');
const ScheduledJobRun = require('../models/ScheduledJobRun');
const httpRequestAction = require('./actions/httpRequestAction');
const enqueueJobAction = require('./actions/enqueueJobAction');
const webhookEventAction = require('./actions/webhookEventAction');

const actionHandlers = {
  'http-request': httpRequestAction,
  'enqueue-job': enqueueJobAction,
  'webhook-event': webhookEventAction
};

class CronManager {
  constructor() {
    this.jobs = new Map();
  }

  async loadAll() {
    console.log('[CronManager] Loading all scheduled jobs...');
    
    const jobs = await ScheduledJob.find({ isActive: true });
    
    for (const scheduledJob of jobs) {
      await this.scheduleJob(scheduledJob);
    }
    
    console.log(`[CronManager] Loaded ${jobs.length} scheduled jobs`);
    
    await this.detectMissedJobs();
  }

  async scheduleJob(scheduledJob) {
    if (!cron.validate(scheduledJob.cronExpression)) {
      console.error(`[CronManager] Invalid cron expression for job ${scheduledJob._id}: ${scheduledJob.cronExpression}`);
      return;
    }
    
    if (this.jobs.has(scheduledJob._id.toString())) {
      await this.unscheduleJob(scheduledJob._id);
    }
    
    const task = cron.schedule(
      scheduledJob.cronExpression,
      async () => {
        await this.executeJob(scheduledJob);
      },
      {
        scheduled: true,
        timezone: scheduledJob.timezone
      }
    );
    
    this.jobs.set(scheduledJob._id.toString(), {
      task,
      scheduledJob
    });
    
    console.log(`[CronManager] Scheduled job: ${scheduledJob.name} (${scheduledJob.cronExpression})`);
  }

  async unscheduleJob(jobId) {
    const jobKey = jobId.toString();
    
    if (this.jobs.has(jobKey)) {
      const jobEntry = this.jobs.get(jobKey);
      jobEntry.task.stop();
      this.jobs.delete(jobKey);
      console.log(`[CronManager] Unscheduled job: ${jobId}`);
    }
  }

  async rescheduleJob(scheduledJob) {
    await this.unscheduleJob(scheduledJob._id);
    await this.scheduleJob(scheduledJob);
  }

  async executeJob(scheduledJob) {
    const startTime = Date.now();
    let runRecord;
    
    try {
      console.log(`[CronManager] Executing job: ${scheduledJob.name}`);
      
      const handler = actionHandlers[scheduledJob.action.type];
      
      if (!handler) {
        throw new Error(`Unknown action type: ${scheduledJob.action.type}`);
      }
      
      const result = await handler.execute(
        scheduledJob.action.config,
        {},
        scheduledJob.workspaceId
      );
      
      const duration = Date.now() - startTime;
      
      await scheduledJob.markSuccess(result);
      
      runRecord = await ScheduledJobRun.create({
        scheduledJobId: scheduledJob._id,
        workspaceId: scheduledJob.workspaceId,
        triggeredAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        status: 'success',
        actionResult: result
      });
      
      console.log(`[CronManager] Job ${scheduledJob.name} completed successfully in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await scheduledJob.markFailed(error.message);
      
      runRecord = await ScheduledJobRun.create({
        scheduledJobId: scheduledJob._id,
        workspaceId: scheduledJob.workspaceId,
        triggeredAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        status: 'failed',
        error: error.message
      });
      
      console.error(`[CronManager] Job ${scheduledJob.name} failed:`, error.message);
    }
  }

  async detectMissedJobs() {
    const activeJobs = await ScheduledJob.find({
      isActive: true,
      lastRunAt: { $exists: true }
    });
    
    const missedJobs = [];
    const now = new Date();
    
    for (const job of activeJobs) {
      if (job.lastRunAt) {
        const lastRunTime = new Date(job.lastRunAt).getTime();
        const nowTime = now.getTime();
        
        if (nowTime - lastRunTime > 3600000) {
          missedJobs.push(job);
        }
      }
    }
    
    if (missedJobs.length > 0) {
      console.log(`[CronManager] Found ${missedJobs.length} jobs that may have missed while server was down`);
      
      for (const job of missedJobs) {
        console.log(`[CronManager] Checking missed job: ${job.name}, last run: ${job.lastRunAt}`);
      }
    }
  }

  getJobCount() {
    return this.jobs.size;
  }

  listJobs() {
    const jobs = [];
    for (const [id, entry] of this.jobs) {
      jobs.push({
        id: entry.scheduledJob._id,
        name: entry.scheduledJob.name,
        cronExpression: entry.scheduledJob.cronExpression,
        timezone: entry.scheduledJob.timezone,
        isActive: entry.scheduledJob.isActive
      });
    }
    return jobs;
  }
}

const cronManager = new CronManager();

module.exports = cronManager;