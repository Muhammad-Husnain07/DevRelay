const mongoose = require('mongoose');

const variableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  required: { type: Boolean, default: false },
  defaultValue: { type: String },
  description: { type: String }
}, { _id: false });

const emailTemplateSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlBody: {
    type: String,
    required: true
  },
  textBody: {
    type: String
  },
  variables: [variableSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

emailTemplateSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });

emailTemplateSchema.statics.getDefaults = function(workspaceId) {
  return [
    {
      workspaceId,
      name: 'Welcome Email',
      slug: 'welcome',
      subject: 'Welcome to {{workspaceName}}',
      htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <h1>Welcome to {{workspaceName}}!</h1>
  <p>Hello {{userName}},</p>
  <p>Thank you for joining! We're excited to have you on board.</p>
  <p>Get started by visiting your dashboard at:</p>
  <p><a href="{{dashboardUrl}}">Dashboard</a></p>
  <p>Best regards,<br>The {{workspaceName}} Team</p>
</body>
</html>`,
      textBody: `Welcome to {{workspaceName}}!\n\nHello {{userName}},\n\nThank you for joining! We're excited to have you on board.\n\nGet started by visiting your dashboard.\n\nBest regards,\nThe {{workspaceName}} Team`,
      variables: [
        { name: 'userName', required: true, description: 'User display name' },
        { name: 'workspaceName', required: true, description: 'Workspace name' },
        { name: 'dashboardUrl', required: false, defaultValue: '#', description: 'Link to dashboard' }
      ]
    },
    {
      workspaceId,
      name: 'Alert Notification',
      slug: 'alert',
      subject: 'Alert: {{alertTitle}}',
      htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <h2>{{alertTitle}}</h2>
  <p><strong>Severity:</strong> {{severity}}</p>
  <p>{{alertMessage}}</p>
  <hr>
  <p><small>This is an automated alert from {{workspaceName}}</small></p>
</body>
</html>`,
      textBody: `Alert: {{alertTitle}}\n\nSeverity: {{severity}}\n\n{{alertMessage}}\n\n---\nAutomated alert from {{workspaceName}}`,
      variables: [
        { name: 'alertTitle', required: true, description: 'Alert heading' },
        { name: 'alertMessage', required: true, description: 'Alert message body' },
        { name: 'severity', required: false, defaultValue: 'info', description: 'Severity level' },
        { name: 'workspaceName', required: false, description: 'Workspace name' }
      ]
    },
    {
      workspaceId,
      name: 'Weekly Report',
      slug: 'report',
      subject: 'Weekly Report for {{reportDate}}',
      htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <h1>Weekly Report</h1>
  <p>Report Date: {{reportDate}}</p>
  <h2>Summary</h2>
  <ul>
    <li>Total Events: {{totalEvents}}</li>
    <li>Successful Deliveries: {{successfulDeliveries}}</li>
    <li>Failed Deliveries: {{failedDeliveries}}</li>
  </ul>
  <p>View full details in your <a href="{{dashboardUrl}}">dashboard</a>.</p>
</body>
</html>`,
      textBody: `Weekly Report for {{reportDate}}\n\nSummary:\n- Total Events: {{totalEvents}}\n- Successful: {{successfulDeliveries}}\n- Failed: {{failedDeliveries}}`,
      variables: [
        { name: 'reportDate', required: true, description: 'Date of the report' },
        { name: 'totalEvents', required: true, description: 'Total event count' },
        { name: 'successfulDeliveries', required: true, description: 'Successful deliveries count' },
        { name: 'failedDeliveries', required: true, description: 'Failed deliveries count' },
        { name: 'dashboardUrl', required: false, defaultValue: '#', description: 'Dashboard link' }
      ]
    }
  ];
};

emailTemplateSchema.methods.getPublic = function() {
  return {
    id: this._id,
    workspaceId: this.workspaceId,
    name: this.name,
    slug: this.slug,
    subject: this.subject,
    variables: this.variables,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);