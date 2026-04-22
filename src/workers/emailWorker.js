const { Worker } = require('bullmq');
const { redisClient } = require('../config/redis');
const emailService = require('../services/emailService');
const EmailTemplate = require('../models/EmailTemplate');
const { renderTemplate } = require('../utils/templateEngine');

const connection = {
  connection: redisClient,
  maxRetriesPerRequest: null
};

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

const emailWorker = new Worker('email', processEmailJob, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000
  }
});

emailWorker.on('completed', (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed`);
});

emailWorker.on('failed', (job, error) => {
  console.error(`[EmailWorker] Job ${job.id} failed:`, error.message);
});

emailWorker.on('error', (error) => {
  console.error('[EmailWorker] Worker error:', error.message);
});

module.exports = { emailWorker, processEmailJob };