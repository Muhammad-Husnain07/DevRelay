const { Worker } = require('bullmq');
const axios = require('axios');
const { redisClient } = require('./redis');
const Job = require('../models/Job');

const connection = {
  connection: redisClient,
  maxRetriesPerRequest: null
};

const handlers = {
  'http-request': async (payload) => {
    const { url, method = 'GET', headers = {}, body } = payload;
    
    const response = await axios({
      url,
      method,
      headers,
      data: body,
      timeout: 30000,
      validateStatus: () => true
    });
    
    return {
      statusCode: response.status,
      body: response.data,
      headers: response.headers
    };
  },
  
  'send-email': async (payload) => {
    const { to, subject, text, html } = payload;
    
    console.log(`[EmailHandler] Sending email to ${to}: ${subject}`);
    
    return {
      sent: true,
      to,
      subject
    };
  },
  
  'log-message': async (payload) => {
    const { level = 'info', message, data } = payload;
    
    console.log(`[LogHandler] [${level}] ${message}`, data || '');
    
    return {
      logged: true,
      level,
      message
    };
  },
  
  'webhook-call': async (payload) => {
    const { url, event, data } = payload;
    
    const response = await axios.post(url, { event, data }, {
      timeout: 15000
    });
    
    return {
      delivered: true,
      url,
      event
    };
  }
};

async function processJob(job) {
  const { jobId, handler, payload, workspaceId, definitionId, maxAttempts, timeout } = job.data;
  
  let jobRecord;
  
  try {
    jobRecord = await Job.findById(jobId);
    if (!jobRecord) {
      console.error(`[GenericJobWorker] Job not found: ${jobId}`);
      return;
    }
    
    await jobRecord.markStarted();
    
    const handlerFn = handlers[handler];
    
    if (!handlerFn) {
      throw new Error(`Unknown handler: ${handler}`);
    }
    
    const result = await handlerFn(payload);
    
    await jobRecord.markCompleted(result);
    
    console.log(`[GenericJobWorker] Job ${jobId} completed successfully`);
    
    return result;
    
  } catch (error) {
    console.error(`[GenericJobWorker] Job ${jobId} failed:`, error.message);
    
    if (jobRecord) {
      await jobRecord.markFailed(error.message, error.stack);
    }
    
    throw error;
  }
}

const genericJobWorker = new Worker('generic-job', processJob, {
  connection,
  concurrency: 10,
  limiter: {
    max: 20,
    duration: 1000
  }
});

genericJobWorker.on('completed', (job) => {
  console.log(`[Worker] Generic job ${job.id} completed`);
});

genericJobWorker.on('failed', (job, error) => {
  console.error(`[Worker] Generic job ${job.id} failed:`, error.message);
});

genericJobWorker.on('error', (error) => {
  console.error('[Worker] Generic job worker error:', error.message);
});

function registerHandler(name, fn) {
  handlers[name] = fn;
}

module.exports = {
  genericJobWorker,
  registerHandler,
  handlers
};