const { emailQueue } = require('../config/queues');

async function queueEmail({ workspaceId, templateSlug, to, variables = {}, attachments, delay }) {
  const jobOptions = {};
  
  if (delay) {
    jobOptions.delay = delay;
  }
  
  const job = await emailQueue.add('send', {
    workspaceId: workspaceId.toString(),
    templateSlug,
    to,
    variables,
    attachments
  }, jobOptions);
  
  return {
    jobId: job.id,
    queuedAt: new Date()
  };
}

async function sendEmailNow({ to, subject, html, text }) {
  const emailService = require('./emailService');
  
  const result = await emailService.sendEmail({ to, subject, html, text });
  
  return result;
}

module.exports = {
  queueEmail,
  sendEmailNow
};