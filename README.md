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

## Quick Start

```bash
# Clone and start
git clone https://github.com/Muhammad-Husnain07/DevRelay.git
cd DevRelay

# Start infrastructure
docker compose up -d

# Seed sample data (optional)
docker compose exec app node scripts/seed.js

# Access
open http://localhost:3000
```

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
- HTTP actions to external endpoints

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

## Demo & Testing Guide

### Starting the Application

**Backend (Docker):**
```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f api
```

**Frontend:**
```bash
cd ui
npm run dev
# Access at http://localhost:5173 (or next available port)
```

**Login Credentials:**
- Email: `demo@devrelay.io`
- Password: `demo123`

---

### Testing Each Feature

#### 1. Authentication
```bash
# Login via API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@devrelay.io","password":"demo123"}'

# Response: { "token": "eyJ...", "user": {...} }
```

#### 2. Webhooks (Outbound)
```bash
# Create endpoint via UI: Webhooks → Add Endpoint
# Or via API:
curl -X POST http://localhost:3000/api/workspaces/demo-workspace/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Endpoint",
    "url": "https://httpbin.org/post",
    "events": ["*"],
    "secret": "whsec_test123"
  }'
```

#### 3. Inbound Webhooks
```bash
# Start smee client (forward webhooks to local):
npx smee -u https://smee.io/mshhOZhKWjgfoMU -t http://localhost:3000/receive/demo-workspace

# Send test webhook:
curl -X POST https://smee.io/mshhOZhKWjgfoMU \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{"message":"hello"}}'

# Check in UI: Inbound page
```

#### 4. Jobs Queue
```bash
# Via UI: Jobs → Create Job
# Or via API:
curl -X POST http://localhost:3000/api/workspaces/demo-workspace/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Process Order",
    "queue": "webhook-delivery",
    "data": {"orderId": "123"},
    "priority": 0
  }'
```

#### 5. Cron Scheduler
```bash
# Via UI: Scheduler → Add Scheduled Job
# Or via API:
curl -X POST http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Backup",
    "cronExpression": "0 9 * * *",
    "action": {"type":"http","url":"https://httpbin.org/post"}
  }'
```

#### 6. API Gateway
```bash
# Create route via UI: Gateway → Add Route
# Then test:
curl http://localhost:3000/gw/demo-workspace/your-route

# Test rate limiting (default: 100/min):
for i in {1..110}; do curl -I http://localhost:3000/gw/demo-workspace/test; done
# After 100 requests, you'll get 429 Too Many Requests
```

#### 7. Alerts
```bash
# Via UI: Alerts → Add Rule
# Or via API:
curl -X POST http://localhost:3000/api/workspaces/demo-workspace/alerts/rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Failure Rate",
    "conditionType": "failureRate",
    "conditionConfig": {"threshold": 10},
    "action": {"type":"email","config":{"to":"admin@example.com"}}
  }'
```

---

### Quick Test Script

Run all API tests:
```bash
node scripts/testAll.js
```

Expected output:
- AUTH: PASS
- Workspaces: 200
- Webhooks: 200 (endpoints: [])
- Inbound: 200 (1 webhook)
- Jobs: 200 (jobs: [])
- Scheduler: 200 (scheduledJobs: [])
- Alerts: 200 (alerts: [])
- API Gateway: 200 (routes: [])
- Members: 200 (1 member - owner)
- API Keys: 200 (keys: [])

---

### Troubleshooting

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Login fails | Reseed: `docker exec devrelay-app-1 node scripts/addDemo.js` |
| Inbound not working | Create inbound webhook via UI or API |
| Rate limiting kicks in | Wait 1 minute or adjust limit in settings |
| Queue workers unavailable | Workers connect on startup - restart container |

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

---

## License

[MIT](LICENSE)