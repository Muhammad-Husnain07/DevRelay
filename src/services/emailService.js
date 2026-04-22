const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const env = require('./env');

let transporter = null;
let testAccount = null;

async function createTransport() {
  try {
    if (env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass) {
      transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: parseInt(env.smtpPort),
        secure: env.smtpPort === '465',
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass
        }
      });
      console.log('[Email] Using configured SMTP');
    } else {
      testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('[Email] Using Ethereal test account');
    }

    const info = await transporter.verify();
    console.log('[Email] Transport verified:', info);
    return transporter;
  } catch (error) {
    console.error('[Email] Transport setup error:', error.message);
    return null;
  }
}

async function sendEmail({ to, subject, html, text, attachments }) {
  if (!transporter) {
    await createTransport();
  }

  const info = await transporter.sendMail({
    from: env.smtpUser || '"DevRelay" <noreply@devrelay.local>',
    to,
    subject,
    text: text || html.replace(/<[^>]*>/g, ''),
    html,
    attachments: attachments || []
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl,
    sentAt: new Date()
  };
}

async function renderTemplate(template, variables) {
  try {
    const compiled = handlebars.compile(template);
    return compiled(variables || {});
  } catch (error) {
    console.error('[Email] Template render error:', error.message);
    return template;
  }
}

module.exports = {
  createTransport,
  sendEmail,
  renderTemplate,
  getTransporter: () => transporter
};