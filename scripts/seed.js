require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../src/models/User");
const Workspace = require("../src/models/Workspace");
const WebhookEndpoint = require("../src/models/WebhookEndpoint");
const WebhookDelivery = require("../src/models/WebhookDelivery");
const WebhookEvent = require("../src/models/WebhookEvent");
const Job = require("../src/models/Job");
const ScheduledJob = require("../src/models/ScheduledJob");
const EmailTemplate = require("../src/models/EmailTemplate");
const GatewayRoute = require("../src/models/GatewayRoute");
const Consumer = require("../src/models/Consumer");
const AlertRule = require("../src/models/AlertRule");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://mongo:27017/devrelay";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("[Seed] Mongo connected:", mongoose.connection.readyState);

  await clearCollections();

  let admin, user1, user2;

  try {
    ({ admin, user1, user2 } = await createUsers());
  } catch (err) {
    console.error("[Seed] User creation failed:", err);
    process.exit(1);
  }

  const workspaces = await createWorkspaces(admin, user1, user2);

  for (const ws of workspaces) {
    await createWebhookEndpoints(ws);
    await createInboundWebhooks(ws);
    await createWebhookEvents(ws);
    await createJobs(ws);
    await createScheduledJobs(ws);
    await createEmailTemplates(ws);
    await createGatewayRoutes(ws);
    await createConsumers(ws);
    await createAlertRules(ws);
  }

  console.log("[Seed] ✓ Seed data created successfully");

  const stats = await getStats();
  console.log("\n[Seed] Statistics:");
  console.log(`  Users: ${stats.users}`);
  console.log(`  Workspaces: ${stats.workspaces}`);
  console.log(`  Webhook Endpoints: ${stats.webhookEndpoints}`);
  console.log(`  Inbound Webhooks: ${stats.inboundWebhooks}`);
  console.log(`  Webhook Events: ${stats.webhookEvents}`);
  console.log(`  Jobs: ${stats.jobs}`);
  console.log(`  Scheduled Jobs: ${stats.scheduledJobs}`);
  console.log(`  Email Templates: ${stats.emailTemplates}`);
  console.log(`  Gateway Routes: ${stats.gatewayRoutes}`);
  console.log(`  Consumers: ${stats.consumers}`);
  console.log(`  Alert Rules: ${stats.alertRules}`);

  await mongoose.disconnect();
  console.log("[Seed] Disconnected");
  process.exit(0);
}

async function clearCollections() {
  console.log("[Seed] Clearing collections...");
  await User.deleteMany({});
  await Workspace.deleteMany({});
  await WebhookEndpoint.deleteMany({});
  await WebhookDelivery.deleteMany({});
  await WebhookEvent.deleteMany({});
  await Job.deleteMany({});
  await ScheduledJob.deleteMany({});
  await EmailTemplate.deleteMany({});
  await GatewayRoute.deleteMany({});
  await Consumer.deleteMany({});
  await AlertRule.deleteMany({});
}

async function createUsers() {
  console.log("[Seed] Creating users...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  const admin = await User.create({
    name: "Admin User",
    email: "admin@devrelay.io",
    password: adminPassword,
    isActive: true,
    role: "admin",
  });

  const user1 = await User.create({
    name: "John Doe",
    email: "john@example.com",
    password: userPassword,
    isActive: true,
    github: { id: "12345", username: "johndoe" },
  });

  const user2 = await User.create({
    name: "Jane Smith",
    email: "jane@example.com",
    password: userPassword,
    isActive: true,
    github: { id: "67890", username: "janesmith" },
  });
console.log('[Seed] Users inserted:', await User.countDocuments());
  console.log(`  ✓ Created 3 users (admin, john, jane)`);
  return { admin, user1, user2 };
}

async function createWorkspaces(admin, user1, user2) {
  console.log("[Seed] Creating workspaces...");

  const ws1 = await Workspace.create({
    name: "Acme Corp",
    slug: "acme",
    ownerId: user1._id,
    members: [
      { userId: user1._id, role: "owner" },
      { userId: admin._id, role: "admin" },
    ],
    isActive: true,
  });

  const ws2 = await Workspace.create({
    name: "TechStart Inc",
    slug: "techstart",
    ownerId: user2._id,
    members: [
      { userId: user2._id, role: "owner" },
      { userId: admin._id, role: "member" },
    ],
    isActive: true,
  });

  console.log(`  ✓ Created 2 workspaces (acme, techstart)`);
  return [ws1, ws2];
}

async function createWebhookEndpoints(workspace) {
  const owner = workspace.members.find((m) => m.role === "owner");

  const endpoints = [
    {
      workspaceId: workspace._id,
      name: "All Events Webhook",
      url: "https://httpbin.org/post",
      events: ["*"],
      secret: "whsec_" + Math.random().toString(36).substring(2, 18),
      ownerId: owner.userId,
      isActive: true,
      rateLimitPerMinute: 60,
      timeoutMs: 30000,
    },
    {
      workspaceId: workspace._id,
      name: "Payment Events Handler",
      url: "https://httpbin.org/anything/payment",
      events: ["payment.created", "payment.failed", "payment.refunded"],
      secret: "whsec_" + Math.random().toString(36).substring(2, 18),
      ownerId: owner.userId,
      isActive: true,
      rateLimitPerMinute: 100,
      timeoutMs: 15000,
    },
    {
      workspaceId: workspace._id,
      name: "Failing Webhook (Test)",
      url: "https://httpbin.org/status/500",
      events: ["user.created"],
      secret: "whsec_" + Math.random().toString(36).substring(2, 18),
      ownerId: owner.userId,
      isActive: true,
      rateLimitPerMinute: 10,
      timeoutMs: 5000,
    },
  ];

  await WebhookEndpoint.insertMany(endpoints);
  console.log(`  ✓ Created 3 webhook endpoints for ${workspace.slug}`);
}

async function createInboundWebhooks(workspace) {
  const owner = workspace.members.find((m) => m.role === "owner");

  await WebhookEndpoint.create({
    workspaceId: workspace._id,
    name: "GitHub Inbound",
    url: "https://httpbin.org/post",
    events: ["push", "pull_request"],
    secret: "whsec_" + Math.random().toString(36).substring(2, 18),
    ownerId: owner.userId,
    isActive: true,
    isInbound: true,
  });
}

async function createWebhookEvents(workspace) {
  const endpoints = await WebhookEndpoint.find({ workspace: workspace._id });
  const events = [
    { type: "user.created", source: "api", status: "success" },
    { type: "payment.created", source: "api", status: "success" },
    { type: "payment.failed", source: "api", status: "failed" },
    { type: "user.created", source: "api", status: "partial" },
    { type: "order.created", source: "api", status: "pending" },
  ];

  for (const eventData of events) {
    await WebhookEvent.create({
      workspaceId: workspace._id,
      type: eventData.type,
      source: eventData.source,
      payload: {
        user_id: Math.floor(Math.random() * 1000),
        event: eventData.type,
      },
    });
  }
}

async function createJobs(workspace) {
  const owner = workspace.members.find((m) => m.role === "owner");

  const jobs = [
    { name: "send-welcome-email", status: "completed", priority: 1 },
    { name: "process-payment", status: "completed", priority: 2 },
    { name: "sync-gitHub", status: "failed", priority: 1 },
    { name: "generate-report", status: "waiting", priority: 0 },
    { name: "cleanup-data", status: "waiting", priority: -1 },
  ];

  for (const job of jobs) {
    await Job.create({
      workspaceId: workspace._id,
      name: job.name,
      payload: { data: "sample payload" },
      status: job.status,
      priority: job.priority,
      ownerId: owner.userId,
      attempts: job.status === "failed" ? 3 : 1,
    });
  }
}

async function createScheduledJobs(workspace) {
  const owner = workspace.members.find((m) => m.role === "owner");

  const jobs = [
    {
      name: "Daily Backup",
      cron: "0 2 * * *",
      description: "Run daily backup at 2am",
    },
    {
      name: "Weekly Report",
      cron: "0 8 * * 1",
      description: "Send weekly report every Monday",
    },
    {
      name: "Every 5 Minutes",
      cron: "*/5 * * * *",
      description: "Heartbeat check every 5 minutes",
    },
  ];

  for (const job of jobs) {
    await ScheduledJob.create({
      workspaceId: workspace._id,
      name: job.name,
      cronExpression: job.cron,
      description: job.description,
      endpoint: "https://httpbin.org/get",
      method: "GET",
      isActive: true,
      ownerId: owner.userId,
    });
  }
}

async function createEmailTemplates(workspace) {
  const owner = workspace.members.find((m) => m.role === "owner");

  const templates = [
    {
      name: "Welcome Email",
      subject: "Welcome to {{workspace_name}}!",
      body: `<h1>Welcome, {{user_name}}!</h1>
<p>Thanks for joining {{workspace_name}}!</p>
<p>Get started by creating your first webhook.</p>`,
      variables: ["user_name", "workspace_name"],
      ownerId: owner.userId,
      workspaceId: workspace._id,
    },
    {
      name: "Alert Notification",
      subject: "[Alert] {{alert_type}} - {{workspace_name}}",
      body: `<h1>Alert: {{alert_type}}</h1>
<p>{{message}}</p>
<p>Workspace: {{workspace_name}}</p>`,
      variables: ["alert_type", "message", "workspace_name"],
      ownerId: owner.userId,
      workspaceId: workspace._id,
    },
  ];

  await EmailTemplate.insertMany(templates);
  console.log(`  ✓ Created 2 email templates for ${workspace.slug}`);
}

async function createGatewayRoutes(workspace) {
  const owner = workspace.members.find((m) => m.role === "owner");

  const routes = [
    {
      workspaceId: workspace._id,
      path: "/api/users",
      target: "https://httpbin.org/anything/users",
      method: "GET",
      rateLimit: 100,
      isActive: true,
      priority: 1,
      ownerId: owner.userId,
    },
    {
      workspaceId: workspace._id,
      path: "/api/products",
      target: "https://httpbin.org/anything/products",
      method: "GET",
      rateLimit: 50,
      isActive: true,
      priority: 2,
      ownerId: owner.userId,
    },
  ];

  await GatewayRoute.insertMany(routes);
}

async function createConsumers(workspace) {
  const owner = workspace.members.find((m) => m.role === "owner");

  const consumers = [
    {
      workspaceId: workspace._id,
      name: "Basic Client",
      keyId: "key_" + Math.random().toString(36).substring(2, 10),
      rateLimit: 100,
      monthlyRequests: 10000,
      quotaType: "monthly",
      isActive: true,
      ownerId: owner.userId,
    },
    {
      workspaceId: workspace._id,
      name: "Premium Client",
      keyId: "key_" + Math.random().toString(36).substring(2, 10),
      rateLimit: 1000,
      monthlyRequests: 1000000,
      quotaType: "monthly",
      isActive: true,
      ownerId: owner.userId,
    },
  ];

  await Consumer.insertMany(consumers);
}

async function createAlertRules(workspace) {
  const owner = workspace.members.find((m) => m.role === "owner");

  const rules = [
    {
      workspaceId: workspace._id,
      name: "High Webhook Failure Rate",
      metric: "webhook_failure_rate",
      threshold: 10,
      condition: "gt",
      cooldownMinutes: 15,
      channels: ["email"],
      isActive: true,
      ownerId: owner.userId,
    },
    {
      workspaceId: workspace._id,
      name: "Queue Depth Alert",
      metric: "queue_depth",
      threshold: 1000,
      condition: "gt",
      cooldownMinutes: 5,
      channels: ["email", "webhook"],
      isActive: true,
      ownerId: owner.userId,
    },
  ];

  await AlertRule.insertMany(rules);
}

async function getStats() {
  const [
    users,
    workspaces,
    webhookEndpoints,
    inboundWebhooks,
    webhookEvents,
    jobs,
    scheduledJobs,
    emailTemplates,
    gatewayRoutes,
    consumers,
    alertRules,
  ] = await Promise.all([
    User.countDocuments(),
    Workspace.countDocuments(),
    WebhookEndpoint.countDocuments({ isInbound: false }),
    WebhookEndpoint.countDocuments({ isInbound: true }),
    WebhookEvent.countDocuments(),
    Job.countDocuments(),
    ScheduledJob.countDocuments(),
    EmailTemplate.countDocuments(),
    GatewayRoute.countDocuments(),
    Consumer.countDocuments(),
    AlertRule.countDocuments(),
  ]);

  return {
    users,
    workspaces,
    webhookEndpoints,
    inboundWebhooks,
    webhookEvents,
    jobs,
    scheduledJobs,
    emailTemplates,
    gatewayRoutes,
    consumers,
    alertRules,
  };
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
