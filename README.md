# DevRelay

[![CI](https://github.com/Muhammad-Husnain07/DevRelay/actions/workflows/ci.yml/badge.svg)](https://github.com/Muhammad-Husnain07/DevRelay/actions)
[![Security](https://github.com/Muhammad-Husnain07/DevRelay/actions/workflows/security.yml/badge.svg)](https://github.com/Muhammad-Husnain07/DevRelay/actions)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-brightblue)](https://docker.com)

Self-hosted backend infrastructure platform — webhooks, job queues, cron scheduling, API gateway, alerts & real-time monitoring.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DevRelay Architecture                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐  │
│   │  Client  │───▶│  Express  │───▶│  Socket  │◀───│  Socket  │  │
│   │   Apps   │    │   API     │    │  .io    │    │   Client │  │
│   └──────────┘    └────┬────┘    └──────────┘    └──────────┘  │
│                          │                                        │
│         ┌───────────────┼───────────────┐                          │
│         │               │               │                          │
│    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                │
│    │ MongoDB │    │  Redis  │    │   Bull  │                │
│    │   (7)   │    │   (7)   │    │   MQ    │                │
│    └─────────┘    └─────────┘    └─────────┘                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Webhooks** | Register endpoints, HMAC signatures, auto-retry, delivery status tracking |
| **Job Queues** | BullMQ-based, priority queues, delayed jobs, failed job replay |
| **Cron Scheduler** | Cron expressions, HTTP actions, missed job detection |
| **API Gateway** | Proxy to upstream, JWT/API key auth, Token Bucket rate limiting |
| **Real-time** | Socket.io events, live metrics, time series data |
| **Alerts** | Rate/failure rules, multi-channel (email/webhook), cooldowns |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Web Framework | Express.js |
| Database | MongoDB 7 (Mongoose) |
| Cache/Queue | Redis 7 (ioredis + BullMQ) |
| Real-time | Socket.io |
| Auth | JWT + GitHub OAuth |
| Email | Nodemailer + Ethereal |
| Testing | Jest + Supertest |

## Quick Start (5 Minutes)

### Option 1: Automated Setup (Recommended)
```bash
# Clone the project
git clone https://github.com/Muhammad-Husnain07/DevRelay.git
cd DevRelay

# Run the easy setup script
node scripts/setup.js
```

### Option 2: Manual Setup
```bash
# 1. Clone and enter directory
git clone https://github.com/Muhammad-Husnain07/DevRelay.git
cd DevRelay

# 2. Copy environment file (already done - .env included)
#    Edit .env if you want to customize settings

# 3. Start all services
docker compose up -d

# 4. Wait ~15 seconds for services to start, then seed demo data
docker compose exec app node scripts/seed.js

# 5. Open in browser
open http://localhost:3000
```

### Default Login
- **Email:** demo@devrelay.io
- **Password:** demo123

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|----------|----------|
| `PORT` | Server port | `3000` | No |
| `NODE_ENV` | Environment | `development` | No |
| `MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017/devrelay` | Yes |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRES_IN` | JWT expiry | `7d` | No |
| `GITHUB_CLIENT_ID` | GitHub OAuth App ID | - | No |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Secret | - | No |
| `SMTP_HOST` | SMTP server | - | No |
| `SMTP_PORT` | SMTP port | `587` | No |
| `SMTP_USER` | SMTP username | - | No |
| `SMTP_PASS` | SMTP password | - | No |

## API Overview

| Endpoint Group | Base Path | Description |
|---------------|-----------|-------------|
| Auth | `/api/auth` | Register, login, OAuth |
| Workspaces | `/api/workspaces` | Multi-tenant workspaces |
| Webhooks | `/api/workspaces/:slug/webhooks` | Outbound webhook endpoints |
| Inbound | `/receive/:slug` | Inbound webhook receiver |
| Events | `/api/workspaces/:slug/events` | Event dispatch |
| Jobs | `/api/workspaces/:slug/jobs` | Job queue management |
| Scheduler | `/api/workspaces/:slug/scheduled-jobs` | Cron job scheduling |
| Email | `/api/workspaces/:slug/email-templates` | Email template management |
| Gateway | `/api/workspaces/:slug/gateway` | API gateway routes |
| Metrics | `/api/workspaces/:slug/metrics` | Real-time metrics |
| Alerts | `/api/workspaces/:slug/alerts` | Alert rules |
| Admin | `/api/admin` | System administration |

**API Docs**: http://localhost:3000/api/docs/

---

## UI Features Guide

This section documents each screen in the DevRelay UI and how to use its features.

### Navigation Sidebar

The sidebar provides access to all main features:
- **Dashboard** - Overview and statistics
- **Webhooks** - Outbound webhook management
- **Inbound** - Receive incoming webhooks
- **Jobs** - Background job queue
- **Scheduler** - Cron job scheduling
- **Gateway** - API gateway configuration
- **Alerts** - Alert rules and notifications
- **Events** - Event log viewer
- **Settings** - Workspace and user settings

---

### 1. Dashboard

**Purpose:** Real-time overview of your workspace activity and health.

**Features:**
- **Stat Cards** - Shows key metrics:
  - Deliveries Today - Number of webhooks delivered
  - Jobs Processed - Background jobs completed
  - Cron Jobs Active - Number of scheduled jobs running
  - Gateway Requests - API gateway requests count
- **Queue Depth Chart** - Live visualization of pending jobs in each queue
- **Live Activity Feed** - Real-time updates of deliveries and jobs
- **System Status** - Shows API, Database, Job Queue, WebSocket status
- **Firing Alerts** - Displays currently triggered alert rules

**How to Use:**
1. Open Dashboard to see workspace overview
2. Stat cards show today's metrics (refreshed every 30 seconds)
3. Queue depth chart updates every 10 seconds
4. Live activity shows real-time webhook delivery and job status

---

### 2. Webhooks

**Purpose:** Manage outbound webhook endpoints for sending data to external services.

**Features:**
- **Create Webhook** - Register new webhook endpoints with:
  - Name - Friendly identifier
  - URL - Destination endpoint
  - Secret - For HMAC signature verification
  - Events - Filter which events trigger this endpoint
- **Delivery Tracking** - View all delivery attempts with:
  - Status (success/failed/pending)
  - HTTP status code
  - Duration
  - Response body
- **Test Webhook** - Send a test event to verify endpoint
- **Rotate Secret** - Generate new webhook secret

**How to Use:**
1. Navigate to **Webhooks** page
2. Click **Create Webhook** button
3. Enter endpoint details (name, URL, secret)
4. Optionally filter events or leave as `*` for all events
5. Click **Create** - endpoint is ready
6. Click **Test** to send a test payload
7. View delivery history in the endpoint detail page

**Dispatching Events:**
```javascript
// Send events to your webhook endpoints
POST /api/workspaces/{slug}/events
{
  "event": "order.created",
  "payload": { "orderId": "123", "amount": 99.99 }
}
```

---

### 3. Inbound

**Purpose:** Receive webhooks from external services (GitHub, Stripe, etc.)

**Features:**
- **Create Inbound Endpoint** - Generate a unique URL to receive webhooks
- **Request Logging** - View all incoming requests with headers and body
- **Replay Requests** - Replay a previous request to test your handlers
- **Verification** - Verify incoming webhook signatures

**How to Use:**
1. Navigate to **Inbound** page
2. Click **Create Inbound** to generate a receiver URL
3. Configure your external service (GitHub, Stripe, etc.) to send webhooks to your unique URL
4. View incoming requests in the **Requests** tab
5. Click on any request to see headers, body, and response
6. Use **Replay** to test request handling

**Receiving Webhooks:**
```
URL Format: https://your-server/receive/{workspace-slug}/{endpoint-id}
Example: https://devrelay.example.com/receive/my-workspace/inbound_123
```

---

### 4. Jobs

**Purpose:** Manage background job processing for async tasks.

**Features:**
- **Job Queue** - View all jobs (waiting, active, completed, failed)
- **Create Job** - Enqueue new jobs with:
  - Name - Job type identifier
  - Payload - Job data (JSON)
  - Priority - -1 (low), 0 (normal), 1 (high), 2 (critical)
  - Delay - Delay execution by milliseconds
- **Job Details** - View job status, progress, result, and error messages
- **Retry Failed** - Manually retry failed jobs
- **Cancel** - Delete pending jobs

**Priority Levels:**
| Priority | Value | Use Case |
|----------|-------|----------|
| Low | -1 | Batch processing, cleanup |
| Normal | 0 | Default jobs |
| High | 1 | User-initiated actions |
| Critical | 2 | Payments, authentication |

**How to Use:**
1. Navigate to **Jobs** page
2. Click **Create Job** to add a new job
3. Enter job name and payload (JSON)
4. Optionally set priority or delay
5. Click **Create** - job is added to queue
6. Monitor job status in the list view
7. Click on a job to see details, progress, and results
8. For failed jobs, click **Retry** to re-run

---

### 5. Scheduler

**Purpose:** Automate tasks using cron expressions for recurring jobs.

**Features:**
- **Cron Expressions** - Support for 5-field and 6-field (with seconds) expressions
- **Action Types:**
  - HTTP Request - Call external APIs
  - Enqueue Job - Add jobs to the queue
  - Webhook Event - Trigger webhook dispatch
- **Timezone Support** - Run jobs in your local timezone
- **History** - View execution history with success/failure status
- **Run Now** - Manually trigger a scheduled job
- **Toggle** - Enable/disable scheduled jobs without deleting
- **Missed Job Detection** - Automatically runs missed jobs on server restart

**Common Cron Expressions:**
| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 9 * * *` | Every day at 9 AM |
| `0 0 * * *` | Every day at midnight |
| `0 0 * * 1` | Every Monday at midnight |

**How to Use:**
1. Navigate to **Scheduler** page
2. Click **Create Scheduled Job**
3. Enter job details:
   - Name - Descriptive identifier
   - Cron Expression - Use preset or enter custom
   - Timezone - Select your timezone
   - Action Type - Choose what happens when job runs
4. Configure action (URL for HTTP, handler for jobs, etc.)
5. Click **Create** - job is scheduled
6. View execution history in the job detail page
7. Use **Run Now** to manually trigger
8. Use **Toggle** to pause/resume without deleting

---

### 6. Gateway (API Gateway)

**Purpose:** Create API routes that proxy requests to upstream services with rate limiting and authentication.

**Features:**
- **Route Management** - Create API routes with:
  - Path - URL path (e.g., `/api/users`)
  - Method - HTTP method (GET, POST, PUT, DELETE, etc.)
  - Upstream URL - Target service URL
  - Auth Type - None or Consumer API Key
- **Consumer Management** - Manage API consumers with:
  - API Key - Unique key for authentication
  - Secret - For key verification (stored as SHA256 hash)
  - Quota - Request limit per time period
  - Usage - Real-time quota tracking
- **Request Logging** - View all gateway requests with:
  - Status code (filter by 2xx, 4xx, 5xx)
  - Route path (filter by route)
  - Duration and response size
- **Rate Limiting** - Token Bucket algorithm per consumer

**Auth Types:**
| Type | Description |
|------|-------------|
| None | No authentication required |
| Consumer API Key | Requires `X-API-Key` header |

**How to Use:**
1. Navigate to **Gateway** page
2. **Create Route:**
   - Click **Add Route**
   - Enter path, method, upstream URL
   - Select auth type
   - Click **Create**
3. **Add Consumer:**
   - Go to **Consumers** tab
   - Click **Add Consumer**
   - Enter name and quota
   - Copy the generated API key (shown once)
4. **Test Route:**
   ```bash
   curl -H "X-API-Key: key-xxxxx" \
     https://your-gateway-url/gw/your-route-path
   ```
5. **View Logs:**
   - Go to **Logs** tab
   - Filter by route path or status code
   - View request details, duration, response size

---

### 7. Alerts

**Purpose:** Monitor system metrics and get notified when thresholds are exceeded.

**Features:**
- **Alert Rules** - Create rules with:
  - Name - Descriptive identifier
  - Metric Type - Webhook failure rate, Job failure rate, Queue depth
  - Condition - Threshold value (e.g., > 25%)
  - Evaluation Window - Time period to evaluate
- **Alert History** - View triggered alerts with:
  - Status (firing/resolved)
  - Timestamp
  - Actual values at trigger time
- **Notification Channels:**
  - Email - Send alerts to workspace members
  - Webhook - Send alerts to configured URL

**Metric Types:**
| Type | Description |
|------|-------------|
| Webhook Failure Rate | % of failed webhook deliveries |
| Job Failure Rate | % of failed background jobs |
| Queue Depth | Number of waiting jobs in queue |

**How to Use:**
1. Navigate to **Alerts** page
2. **Create Alert Rule:**
   - Click **Create Alert Rule**
   - Enter name and description
   - Select metric type
   - Set threshold (e.g., 25%)
   - Choose evaluation window
   - Enable/disable notifications
3. **View Alerts:**
   - Active alerts show in Dashboard
   - Full history in Alerts page
4. **Manage Alerts:**
   - Toggle rules on/off
   - Edit threshold and conditions
   - Delete rules

---

### 8. Events

**Purpose:** View and debug event dispatch history.

**Features:**
- **Event Log** - View all dispatched events with:
  - Event type
  - Payload
  - Delivery status
  - Timestamp
- **Event Details** - View event payload and all delivery attempts
- **Filter** - Search events by type or status

**How to Use:**
1. Navigate to **Events** page
2. View list of all dispatched events
3. Click on an event to see:
   - Full payload
   - Which endpoints received it
   - Delivery status for each endpoint
4. Use search/filter to find specific events

---

### 9. Settings

**Purpose:** Configure workspace and user settings.

**Tabs:**
- **General** - Workspace name, description
- **Members** - Manage team members (owner, admin, member roles)
- **API Keys** - Create and manage workspace API keys
- **Notifications** - Configure email preferences
- **Danger Zone** - Delete workspace (requires confirmation)

**Member Roles:**
| Role | Permissions |
|------|-------------|
| Owner | Full access, can delete workspace |
| Admin | Manage all resources, members |
| Member | View resources, create/update own |

**How to Use:**
1. Navigate to **Settings** page
2. **General:** Edit workspace name and description
3. **Members:**
   - Invite members by email
   - Change member roles
   - Remove members
4. **API Keys:**
   - Create new API key
   - Copy key (shown once)
   - Revoke keys when no longer needed
5. **Danger Zone:** Only for workspace deletion

---

## Architecture Notes

### Webhook Delivery
- Events dispatched via `WebhookEvent` model
- Delivery workers fetch pending deliveries, make HTTP requests with HMAC-SHA256 signatures
- Signature in `X-DevRelay-Signature` header
- Retry with exponential backoff (max 5 attempts)

### Job Queue
- BullMQ with 4 queues: `webhook`, `email`, `scheduler`, `job`
- Priority support via `priority` field (-1 low, 0 normal, 1 high, 2 critical)
- Delayed jobs via `scheduledFor` timestamp

### Cron Scheduler
- `node-cron` for expression parsing
- `ScheduledJob` model stores all cron jobs
- Missed job detection on restart
- Support for **5-field** (minute, hour, day, month, weekday) and **6-field** (with seconds)
- Multiple action types: HTTP Request, Enqueue Job (log-message, send-email, http-request, webhook-call), Webhook Event
- Real-time execution history and status tracking

### API Gateway
- Express router proxies requests
- Routes stored in `GatewayRoute` model
- Token Bucket algorithm for rate limiting
- Per-consumer quotas via `Consumer` model

### Real-time Monitoring
- Socket.io namespace per workspace
- Events: `delivery:status`, `job:progress`, `alert:fired`
- Redis-backed metrics aggregation

### Alerting
- Metrics queried from Redis
- Evaluators: `webhook_failure_rate`, `queue_depth`, `email_bounce_rate`
- Channels: `email`, `webhook`, `socket`

## Performance Benchmarks

| Metric | Result |
|--------|--------|
| Health check | <5ms |
| Event dispatch | <15ms |
| Job enqueue | <10ms |
| Concurrent connections | 1000+ |
| Webhook delivery | 500/sec |

## Testing

```bash
# Run all tests
npm test

# With coverage
npm run test:coverage

# Specific file
npx jest tests/api/webhookRoutes.test.js
```

## SDK Usage

```javascript
const { DevRelayClient } = require('@devrelay/sdk');

const client = new DevRelayClient({
  apiKey: 'dr_sk_...',
  workspaceSlug: 'my-workspace',
  baseUrl: 'https://api.devrelay.io'
});

// 1. Dispatch an event
await client.events.dispatch('order.created', { orderId: '123' });

// 2. Enqueue a job
const job = await client.jobs.enqueue('send-invoice', { orderId: '123' });

// 3. Check job status
const status = await client.jobs.status(job.id);

// 4. Create scheduled job
await client.scheduler.create({
  name: 'Daily Report',
  cronExpression: '0 9 * * *',
  action: { type: 'http', url: 'https://example.com/report' }
});

// 5. Send email template
await client.email.send('welcome', {
  user_name: 'John',
  workspace_name: 'Acme'
});
```

---

## Test Results

### Scheduler Module Testing (April 2024)

| Test | Status | Notes |
|------|--------|-------|
| Cron Validation (5-field) | ✅ PASS | `* * * * *` validates correctly |
| Cron Validation (6-field) | ✅ PASS | `*/30 * * * * *` validates correctly |
| Create HTTP Request Job | ✅ PASS | Creates with URL, method |
| Create Enqueue Job (log-message) | ✅ PASS | Creates with handler config |
| Create Enqueue Job (send-email) | ✅ PASS | Creates with to/subject/body |
| Create Webhook Event Job | ✅ PASS | Creates with eventType/payload |
| Execute Job (Run Now) | ✅ PASS | Triggers immediately |
| Job Execution via Worker | ✅ PASS | LogHandler outputs message |

**Test Output:**
```
✅ Login OK
✅ HTTP Request Job created: Test HTTP Job
✅ Enqueue Job (log-message) created: Test Log Job
✅ Enqueue Job (send-email) created: Test Email Job
✅ Webhook Event Job created: Test Event Job
✅ All jobs executed
[LogHandler] [info] Final test from scheduler!
[GenericJobWorker] Job completed successfully
```

## Troubleshooting

### Common Issues

**Containers won't start:**
```bash
# Check if ports are already in use
docker compose ps

# Check logs for errors
docker compose logs app
```

**MongoDB connection refused:**
```bash
# Wait for MongoDB to be ready
docker compose logs mongo

# Restart services
docker compose restart
```

**Redis connection issues:**
```bash
# Check Redis status
docker compose exec redis redis-cli ping

# Restart Redis
docker compose restart redis
```

**Need to reset everything:**
```bash
# Stop all containers and remove volumes
docker compose down -v

# Start fresh
docker compose up -d
docker compose exec app node scripts/seed.js
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all services |
| `docker compose down` | Stop all services |
| `docker compose logs -f` | View live logs |
| `docker compose logs -f app` | View app logs only |
| `docker compose ps` | Check service status |
| `docker compose exec app sh` | Shell into app container |
| `docker compose restart` | Restart all services |

## License

[MIT](LICENSE)