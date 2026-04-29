const { enqueueJob } = require('../../services/jobService');

async function execute(config, payload = {}, workspaceId) {
  const { name: jobName, handler, payload: jobPayload, priority } = config;
  
  const job = await enqueueJob(workspaceId, jobName, jobPayload || payload, {
    priority: priority || 'normal',
    handler: handler || 'log-message'
  });
  
  return {
    jobId: job._id,
    jobName: job.name
  };
}

module.exports = { execute };