const { Worker } = require('bullmq');
const { redisClient } = require('../config/redis');
const emailService = require('../services/emailService');
const EmailTemplate = require('../models/EmailTemplate');
const { renderTemplate } = require('../utils/templateEngine');

const connection = {
  connection: redisClient,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false
};

let emailWorker = null;
let restartTimeout = null;

function start() {
  if (emailWorker) return emailWorker;
  
  try {
    emailWorker = new Worker('email', processEmailJob, {
      connection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000
      }
    });
  } catch (err) {
    console.error('[EmailWorker] Failed to start:', err.message);
    scheduleRestart();
    return null;
  }

  emailWorker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed`);
  });

  emailWorker.on('failed', (job, error) => {
    console.error(`[EmailWorker] Job ${job.id} failed:`, error.message);
  });

  emailWorker.on('error', (error) => {
    console.error('[EmailWorker] Worker error:', error.message);
    scheduleRestart();
  });

  console.log('[EmailWorker] Started');
  return emailWorker;
}

function scheduleRestart() {
  if (restartTimeout) return;
  restartTimeout = setTimeout(() => {
    restartTimeout = null;
    emailWorker = null;
    console.log('[EmailWorker] Attempting restart...');
    start();
  }, 5000);
}

async function processEmailJob(job) {
  const { templateSlug, workspaceId, to, variables, attachments } = job.data;
  
  const template = await EmailTemplate.findOne({
    workspaceId,
    slug: templateSlug
  });
  
  if (!template) {
    throw new Error(`Email template not found: ${templateSlug}`);
  }
  
  if (!template.isActive) {
    throw new Error(`Email template is inactive: ${templateSlug}`);
  }
  
  const renderedSubject = renderTemplate(template.subject, variables);
  const renderedHtml = renderTemplate(template.htmlBody, variables);
  const renderedText = template.textBody 
    ? renderTemplate(template.textBody, variables) 
    : null;
  
  const result = await emailService.sendEmail({
    to,
    subject: renderedSubject,
    html: renderedHtml,
    text: renderedText,
    attachments
  });
  
  return result;
}

module.exports = { start, processEmailJob };