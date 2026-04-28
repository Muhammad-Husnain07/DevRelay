const { Worker } = require('bullmq');
const axios = require('axios');
const { redisClient } = require('../config/redis');
const Job = require('../models/Job');
const { getEmitter } = require('../socket/emitter');
const { incrementCounter } = require('../services/metricsService');

const connection = {
  connection: redisClient,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false
};

let genericJobWorker = null;
let restartTimeout = null;

function start() {
  if (genericJobWorker) return genericJobWorker;
  
  try {
    genericJobWorker = new Worker('generic-job', processJob, {
      connection,
      concurrency: 10,
      limiter: {
        max: 20,
        duration: 1000
      }
    });
  } catch (err) {
    console.error('[GenericJobWorker] Failed to start:', err.message);
    scheduleRestart();
    return null;
  }

  genericJobWorker.on('completed', (job) => {
    console.log(`[Worker] Generic job ${job.id} completed`);
  });

  genericJobWorker.on('failed', (job, error) => {
    console.error(`[Worker] Generic job ${job.id} failed:`, error.message);
  });

  genericJobWorker.on('error', (error) => {
    console.error('[Worker] Generic job worker error:', error.message);
    scheduleRestart();
  });

  console.log('[GenericJobWorker] Started');
  return genericJobWorker;
}

function scheduleRestart() {
  if (restartTimeout) return;
  restartTimeout = setTimeout(() => {
    restartTimeout = null;
    genericJobWorker = null;
    console.log('[GenericJobWorker] Attempting restart...');
    start();
  }, 5000);
}

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
  const { jobId, handler, payload, workspaceId, definitionId, maxAttempts, timeout, userId } = job.data;
  
  let jobRecord;
  let emitter;
  const startTime = Date.now();
  
  try {
    jobRecord = await Job.findById(jobId);
    if (!jobRecord) {
      console.error(`[GenericJobWorker] Job not found: ${jobId}`);
      return;
    }
    
    emitter = getEmitter();
    if (emitter) emitter.emitToUser(userId, 'job:started', { jobId, name: handler });
    
    await jobRecord.markStarted();
    
    const handlerFn = handlers[handler];
    
    if (!handlerFn) {
      throw new Error(`Unknown handler: ${handler}`);
    }
    
    const result = await handlerFn(payload);
    const duration = Date.now() - startTime;
    
    await jobRecord.markCompleted(result);
    if (workspaceId) await incrementCounter(workspaceId, 'jobs');
    
    if (emitter) {
      emitter.emitToUser(userId, 'job:completed', { jobId, result, duration });
      emitter.emitToWorkspace(workspaceId, 'metrics:tick', { jobs: 1, type: 'job' });
    }
    
    console.log(`[GenericJobWorker] Job ${jobId} completed successfully`);
    
    return result;
    
  } catch (error) {
    console.error(`[GenericJobWorker] Job ${jobId} failed:`, error.message);
    
    if (jobRecord) {
      await jobRecord.markFailed(error.message, error.stack);
    }
    
    if (emitter) {
      emitter.emitToUser(userId, 'job:failed', { jobId, error: error.message });
    }
    
    throw error;
  }
}

function registerHandler(name, fn) {
  handlers[name] = fn;
}

module.exports = {
  start,
  registerHandler,
  handlers
};