const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplate');
const { queueEmail, sendEmailNow } = require('../services/emailQueueService');
const emailService = require('../services/emailService');
const { renderTemplate, validateVariables } = require('../utils/templateEngine');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

router.use(authenticate);
router.use('/:workspaceSlug', resolveWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/email-templates:
 *   get:
 *     summary: List email templates
 *     description: Get all email templates for a workspace
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of email templates
 */
router.get('/:workspaceSlug/email-templates', async (req, res) => {
  try {
    const templates = await EmailTemplate.find({ workspaceId: req.workspace._id })
      .sort({ createdAt: -1 });
    
    res.json({ templates: templates.map(t => t.getPublic()) });
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/email-templates
 * @summary Create email template
 * @tags Email
 * @security bearerAuth
 */
router.post('/:workspaceSlug/email-templates', async (req, res) => {
  try {
    const { name, slug, subject, htmlBody, textBody, variables } = req.body;
    
    if (!name || !slug || !subject || !htmlBody) {
      return res.status(400).json({ error: 'Name, slug, subject, and htmlBody are required' });
    }
    
    const template = await EmailTemplate.create({
      workspaceId: req.workspace._id,
      name,
      slug,
      subject,
      htmlBody,
      textBody,
      variables: variables || []
    });
    
    res.status(201).json({ template: template.getPublic() });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Template slug already exists' });
    }
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * PUT /api/workspaces/{workspaceSlug}/email-templates/:id
 * @summary Update email template
 * @tags Email
 * @security bearerAuth
 */
router.put('/:workspaceSlug/email-templates/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { name, subject, htmlBody, textBody, variables, isActive } = req.body;
    
    if (name) template.name = name;
    if (subject) template.subject = subject;
    if (htmlBody) template.htmlBody = htmlBody;
    if (textBody !== undefined) template.textBody = textBody;
    if (variables) template.variables = variables;
    if (typeof isActive === 'boolean') template.isActive = isActive;
    
    await template.save();
    
    res.json({ template: template.getPublic() });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/workspaces/{workspaceSlug}/email-templates/:id
 * @summary Delete email template
 * @tags Email
 * @security bearerAuth
 */
router.delete('/:workspaceSlug/email-templates/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    await template.deleteOne();
    
    res.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/email-templates/:id/preview
 * @summary Preview email template with variables
 * @tags Email
 * @security bearerAuth
 */
router.post('/:workspaceSlug/email-templates/:id/preview', async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { variables = {} } = req.body;
    
    const validation = validateVariables(template, variables);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }
    
    const renderedSubject = renderTemplate(template.subject, variables);
    const renderedHtml = renderTemplate(template.htmlBody, variables);
    const renderedText = template.textBody 
      ? renderTemplate(template.textBody, variables) 
      : null;
    
    res.json({
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to render preview' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/email-templates/:id/send-test
 * @summary Send test email
 * @tags Email
 * @security bearerAuth
 */
router.post('/:workspaceSlug/email-templates/:id/send-test', async (req, res) => {
  try {
    const { testEmail, variables = {} } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ error: 'testEmail is required' });
    }
    
    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const renderedSubject = renderTemplate(`[TEST] ${template.subject}`, variables);
    const renderedHtml = renderTemplate(template.htmlBody, variables);
    const renderedText = template.textBody 
      ? renderTemplate(template.textBody, variables) 
      : null;
    
    const result = await emailService.sendEmail({
      to: testEmail,
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText
    });
    
    res.json({
      message: 'Test email sent',
      previewUrl: result.previewUrl,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Send test error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/emails/send
 * @summary Queue an email
 * @tags Email
 * @security bearerAuth
 */
router.post('/:workspaceSlug/emails/send', async (req, res) => {
  try {
    const { templateSlug, to, variables, delay, sendNow } = req.body;
    
    if (!templateSlug || !to) {
      return res.status(400).json({ error: 'templateSlug and to are required' });
    }
    
    if (sendNow) {
      const template = await EmailTemplate.findOne({
        workspaceId: req.workspace._id,
        slug: templateSlug
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      const renderedSubject = renderTemplate(template.subject, variables);
      const renderedHtml = renderTemplate(template.htmlBody, variables);
      const renderedText = template.textBody 
        ? renderTemplate(template.textBody, variables) 
        : null;
      
      const result = await sendEmailNow({
        to,
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText
      });
      
      res.json({
        message: 'Email sent',
        messageId: result.messageId,
        previewUrl: result.previewUrl
      });
    } else {
      const result = await queueEmail({
        workspaceId: req.workspace._id,
        templateSlug,
        to,
        variables,
        delay
      });
      
      res.status(201).json({
        message: 'Email queued',
        jobId: result.jobId
      });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;