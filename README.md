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

## Architecture Notes

### Webhook Delivery
- Events dispatched via `WebhookEvent` model
- Delivery workers fetch pending deliveries, make HTTP requests with HMAC-SHA256 signatures
- Signature in `X-DevRelay-Signature` header
- Retry with exponential backoff (max 5 attempts)

### Job Queue
- BullMQ with 4 queues: `webhook-delivery`, `email`, `scheduler`, `generic-job`
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