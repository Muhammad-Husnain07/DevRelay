const mongoose = require('mongoose');

async function createScheduledJobs() {
  const mongoUri = 'mongodb://mongo:27017/devrelay';
  await mongoose.connect(mongoUri);
  
  const db = mongoose.connection;
  const Workspace = db.collection('workspaces');
  const ScheduledJob = db.collection('scheduledjobs');
  
  const workspace = await Workspace.findOne({ slug: 'demo-workspace' });
  if (!workspace) {
    console.log('Workspace not found');
    await mongoose.disconnect();
    return;
  }
  
  const workspaceId = workspace._id;
  
  const scheduledJobs = [
    {
      workspaceId,
      name: 'Daily Backup Notification',
      description: 'Send daily backup status email',
      cronExpression: '0 9 * * *',
      timezone: 'UTC',
      action: {
        type: 'enqueue-job',
        config: {
          jobName: 'daily-backup-email',
          handler: 'send-email',
          payload: {
            to: 'admin@example.com',
            subject: 'Daily Backup Report',
            body: 'Backup completed successfully'
          }
        }
      },
      isActive: true,
      nextRunAt: new Date(Date.now() + 3600000 * 9),
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      workspaceId,
      name: 'Hourly Health Check',
      description: 'Check system health every hour',
      cronExpression: '0 * * * *',
      timezone: 'UTC',
      action: {
        type: 'http-request',
        config: {
          url: 'https://httpbin.org/get',
          method: 'GET'
        }
      },
      isActive: true,
      nextRunAt: new Date(Date.now() + 3600000),
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      workspaceId,
      name: 'Weekly Report Webhook',
      description: 'Send weekly analytics to webhook',
      cronExpression: '0 10 * * 1',
      timezone: 'UTC',
      action: {
        type: 'webhook-event',
        config: {
          url: 'https://silly-ocean-12.webhook.cool',
          event: 'weekly.report',
          data: { report: 'analytics', period: '7d' }
        }
      },
      isActive: false,
      nextRunAt: null,
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      workspaceId,
      name: 'Cleanup Old Logs',
      description: 'Clean up logs older than 30 days',
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
      action: {
        type: 'enqueue-job',
        config: {
          jobName: 'cleanup-logs',
          handler: 'log-message',
          payload: {
            message: 'Starting log cleanup task',
            level: 'info'
          }
        }
      },
      isActive: true,
      nextRunAt: new Date(Date.now() + 3600000 * 26),
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      workspaceId,
      name: 'User Welcome Email',
      description: 'Send welcome email to new users',
      cronExpression: '*/5 * * * *',
      timezone: 'UTC',
      action: {
        type: 'enqueue-job',
        config: {
          jobName: 'welcome-email',
          handler: 'send-email',
          payload: {
            to: 'newuser@example.com',
            subject: 'Welcome to DevRelay!',
            body: 'Thanks for signing up!'
          }
        }
      },
      isActive: true,
      nextRunAt: new Date(Date.now() + 300000),
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  for (const job of scheduledJobs) {
    await ScheduledJob.updateOne(
      { name: job.name, workspaceId },
      { $set: job },
      { upsert: true }
    );
    console.log(`Created/updated: ${job.name}`);
  }
  
  const jobs = await ScheduledJob.find({ workspaceId });
  console.log(`\nTotal scheduled jobs: ${jobs.length}`);
  
  await mongoose.disconnect();
}

createScheduledJobs().catch(console.error);