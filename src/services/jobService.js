const Job = require('../models/Job');
const JobDefinition = require('../models/JobDefinition');
const { genericJobQueue } = require('../config/queues');

async function enqueueJob(workspaceId, name, payload = {}, options = {}) {
  const { priority = 'normal', delay, scheduledFor, maxAttempts } = options;
  
  let definition = await JobDefinition.findOne({
    workspaceId,
    name
  });
  
  if (!definition) {
    definition = await JobDefinition.create({
      workspaceId,
      name,
      handler: options.handler || 'log-message',
      description: options.description || '',
      defaultPriority: priority,
      maxAttempts: maxAttempts || 3,
      defaultTimeout: options.timeout || 30000
    });
  }
  
  const priorityNumber = Job.getPriorityNumber(priority);
  
  const job = await Job.create({
    workspaceId,
    definitionId: definition._id,
    name,
    payload,
    priority: priorityNumber,
    maxAttempts: maxAttempts || definition.maxAttempts,
    status: delay || scheduledFor ? 'delayed' : 'waiting',
    scheduledFor: scheduledFor || (delay ? new Date(Date.now() + delay) : null)
  });
  
  const bullOptions = {
    jobId: job._id.toString(),
    priority: priorityNumber,
    attempts: maxAttempts || definition.maxAttempts,
    timeout: definition.defaultTimeout
  };
  
  if (delay || scheduledFor) {
    const delayMs = scheduledFor 
      ? new Date(scheduledFor).getTime() - Date.now()
      : delay;
    bullOptions.delay = Math.max(0, delayMs);
  }
  
  const bullJob = await genericJobQueue.add(name, {
    jobId: job._id.toString(),
    handler: definition.handler,
    payload,
    workspaceId: workspaceId.toString(),
    definitionId: definition._id.toString(),
    maxAttempts: bullOptions.attempts,
    timeout: bullOptions.timeout
  }, bullOptions);
  
  job.bullJobId = bullJob.id;
  await job.save();
  
  return job;
}

async function cancelJob(jobId) {
  const job = await Job.findById(jobId);
  
  if (!job) {
    throw new Error('Job not found');
  }
  
  if (!['waiting', 'delayed'].includes(job.status)) {
    throw new Error('Cannot cancel job that is already running or completed');
  }
  
  try {
    if (job.bullJobId) {
      const bullJob = await genericJobQueue.getJob(job.bullJobId);
      if (bullJob) {
        await bullJob.remove();
      }
    }
  } catch (error) {
    console.error('Error removing from queue:', error.message);
  }
  
  job.status = 'paused';
  await job.save();
  
  return job;
}

async function retryJob(jobId) {
  const job = await Job.findById(jobId);
  
  if (!job) {
    throw new Error('Job not found');
  }
  
  if (job.status !== 'failed') {
    throw new Error('Can only retry failed jobs');
  }
  
  const bullOptions = {
    jobId: job._id.toString(),
    priority: job.priority,
    attempts: job.maxAttempts
  };
  
  const bullJob = await genericJobQueue.add(job.name, {
    jobId: job._id.toString(),
    handler: 'log-message',
    payload: job.payload,
    workspaceId: job.workspaceId.toString(),
    definitionId: job.definitionId?.toString(),
    maxAttempts: job.maxAttempts
  }, bullOptions);
  
  job.status = 'waiting';
  job.bullJobId = bullJob.id;
  job.attempts = 0;
  job.error = undefined;
  job.stackTrace = undefined;
  job.failedAt = undefined;
  await job.save();
  
  return job;
}

async function getJobStatus(jobId) {
  const job = await Job.findById(jobId);
  
  if (!job) {
    return null;
  }
  
  let bullJob = null;
  if (job.bullJobId) {
    try {
      bullJob = await genericJobQueue.getJob(job.bullJobId);
    } catch (error) {
      // Job may have been removed from queue
    }
  }
  
  return {
    job: job.getPublic(),
    queueStatus: bullJob ? {
      status: bullJob.status,
      progress: bullJob.progress,
      finishedOn: bullJob.finishedOn
    } : null
  };
}

async function getJobStats(workspaceId) {
  const stats = await Job.aggregate([
    { $match: { workspaceId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const statusCounts = {};
  let totalDuration = 0;
  let completedCount = 0;
  
  stats.forEach(s => {
    statusCounts[s._id] = s.count;
  });
  
  const completedJobs = await Job.find({
    workspaceId,
    status: 'completed',
    duration: { $exists: true }
  });
  
  completedJobs.forEach(job => {
    totalDuration += job.duration;
    completedCount++;
  });
  
  const avgDuration = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0;
  const totalJobs = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const failedCount = statusCounts.failed || 0;
  const failureRate = totalJobs > 0 ? ((failedCount / totalJobs) * 100).toFixed(2) : 0;
  
  return {
    byStatus: statusCounts,
    totalJobs,
    avgDurationMs: avgDuration,
    failureRate: parseFloat(failureRate)
  };
}

module.exports = {
  enqueueJob,
  cancelJob,
  retryJob,
  getJobStatus,
  getJobStats
};