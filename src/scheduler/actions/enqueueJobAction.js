const { enqueueJob } = require('../../services/jobService');

async function execute(config, payload = {}, workspaceId) {
  const { jobName, jobPayload, priority } = config;
  
  const job = await enqueueJob(workspaceId, jobName, jobPayload || payload, {
    priority: priority || 'normal'
  });
  
  return {
    jobId: job._id,
    jobName: job.name
  };
}

module.exports = { execute };