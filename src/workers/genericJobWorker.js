const { Worker } = require('bullmq');
const axios = require('axios');
const { redisClient } = require('../config/redis');
const Job = require('../models/Job');
const { getEmitter } = require('../socket/emitter');
const { incrementCounter } = require('../services/metricsService');
const nodemailer = require('nodemailer');

const connection = {
  host: 'redis',
  port: 6379
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
    const { to, subject, text, html, body } = payload;
    
    console.log(`[EmailHandler] Sending email to ${to}: ${subject || 'No subject'}`);
    
    try {
      const nodemailer = require('nodemailer');
      const env = require('../config/env');
      
      console.log('[EmailHandler] SMTP config:', { host: env.smtpHost, port: env.smtpPort, user: env.smtpUser, passLen: env.smtpPass?.length });
      
      const transporter = nodemailer.createTransport({
        host: env.smtpHost || 'smtp.gmail.com',
        port: parseInt(env.smtpPort) || 465,
        secure: true,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass
        }
      });
      
      await transporter.verify();
      console.log('[EmailHandler] SMTP verified');
      
      const info = await transporter.sendMail({
        from: env.smtpUser || 'DevRelay <noreply@devrelay.local>',
        to,
        subject: subject || 'DevRelay Notification',
        html: html || `<p>${text || body || ''}</p>`,
        text: text || body
      });
      
      console.log(`[EmailHandler] Email sent: ${info.messageId}`);
      
      await transporter.close();
      
      return {
        sent: true,
        to,
        subject: subject || 'DevRelay Notification',
        messageId: info.messageId
      };
    } catch (error) {
      console.error(`[EmailHandler] Failed to send email:`, error.message, error.stack);
      throw error;
    }
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

function start() {
  console.log('[Worker] Generic job worker started');
}

module.exports = {
  genericJobWorker,
  registerHandler,
  handlers,
  start
};