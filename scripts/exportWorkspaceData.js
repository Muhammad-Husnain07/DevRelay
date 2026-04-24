require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const Workspace = require('../src/models/Workspace');
const WebhookEndpoint = require('../src/models/WebhookEndpoint');
const WebhookDelivery = require('../src/models/WebhookDelivery');
const WebhookEvent = require('../src/models/WebhookEvent');
const Job = require('../src/models/Job');
const ScheduledJob = require('../src/models/ScheduledJob');
const ScheduledJobRun = require('../src/models/ScheduledJobRun');
const AlertRule = require('../src/models/AlertRule');
const Alert = require('../src/models/Alert');
const Consumer = require('../src/models/Consumer');
const GatewayRoute = require('../src/models/GatewayRoute');
const GatewayLog = require('../src/models/GatewayLog');

async function exportWorkspace() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devrelay');
  console.log('Connected to MongoDB');

  const workspaceSlug = process.argv[2];
  const outputFile = process.argv[3] || `${workspaceSlug}-export.json`;

  if (!workspaceSlug) {
    console.log('Usage: node exportWorkspaceData.js <workspace-slug> [output-file]');
    console.log('Exports all workspace data as JSON');
    await mongoose.disconnect();
    return;
  }

  const workspace = await Workspace.findOne({ slug: workspaceSlug });
  if (!workspace) {
    console.error(`Workspace not found: ${workspaceSlug}`);
    await mongoose.disconnect();
    return;
  }

  console.log(`Exporting workspace: ${workspace.name} (${workspace._id})`);

  const [
    endpoints,
    jobs,
    scheduledJobs,
    alertRules,
    consumers,
    gatewayRoutes
  ] = await Promise.all([
    WebhookEndpoint.find({ workspaceId: workspace._id }),
    Job.find({ workspaceId: workspace._id }),
    ScheduledJob.find({ workspaceId: workspace._id }),
    AlertRule.find({ workspaceId: workspace._id }),
    Consumer.find({ workspaceId: workspace._id }),
    GatewayRoute.find({ workspaceId: workspace._id })
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    workspace: workspace.toObject(),
    webhookEndpoints: endpoints.map(e => e.toObject()),
    jobs: jobs.map(j => j.toObject()),
    scheduledJobs: scheduledJobs.map(sj => sj.toObject()),
    alertRules: alertRules.map(a => a.toObject()),
    consumers: consumers.map(c => c.toObject()),
    gatewayRoutes: gatewayRoutes.map(r => r.toObject()),
    summary: {
      webhookEndpoints: endpoints.length,
      jobs: jobs.length,
      scheduledJobs: scheduledJobs.length,
      alertRules: alertRules.length,
      consumers: consumers.length,
      gatewayRoutes: gatewayRoutes.length
    }
  };

  fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
  console.log(`Exported to: ${outputFile}`);
  console.log(`Summary:`, exportData.summary);

  await mongoose.disconnect();
  console.log('Done');
}

exportWorkspace().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});