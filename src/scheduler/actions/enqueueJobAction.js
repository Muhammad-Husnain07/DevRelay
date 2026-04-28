const { enqueueJob } = require('../../services/jobService');

async function execute(config, payload = {}, workspaceId) {
  console.log('[EnqueueJobAction] config:', JSON.stringify(config));
  
  let handler = config.handler || 'log-message';
  let handlerConfig = config.config || config;
  
  let jobPayloadFinal = {};
  
  if (handler === 'log-message') {
    jobPayloadFinal = { 
      handler: 'log-message', 
      message: handlerConfig.message || 'Scheduled task completed' 
    };
  } else if (handler === 'send-email') {
    jobPayloadFinal = { 
      handler: 'send-email', 
      to: handlerConfig.to || '', 
      subject: handlerConfig.subject || '', 
      body: handlerConfig.body || '' 
    };
  } else if (handler === 'http-request') {
    jobPayloadFinal = { 
      handler: 'http-request', 
      url: handlerConfig.url || '', 
      method: handlerConfig.method || 'GET' 
    };
  } else if (handler === 'webhook-call') {
    jobPayloadFinal = { 
      handler: 'webhook-call', 
      url: handlerConfig.url || '', 
      payload: handlerConfig.payload || {} 
    };
  } else {
    jobPayloadFinal = { handler: handler, ...handlerConfig };
  }
  
  // Use a unique job name per handler type so JobDefinition gets correct handler
  const jobName = `scheduler-${handler}`;
  
  console.log('[EnqueueJobAction] Enqueueing job:', jobName, 'handler:', handler, JSON.stringify(jobPayloadFinal));
  
  const job = await enqueueJob(workspaceId, jobName, jobPayloadFinal, {
    priority: 'normal',
    handler: handler  // Pass handler explicitly to JobDefinition
  });

  return {
    jobId: job._id,
    jobName: job.name
  };
}

module.exports = { execute };