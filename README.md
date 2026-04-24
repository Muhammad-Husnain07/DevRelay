# DevRelay

![CI](https://github.com/Muhammad-Husnain07/DevRelay/workflows/CI/badge.svg)
![Security](https://github.com/Muhammad-Husnain07/DevRelay/workflows/Security/badge.svg)
![Node.js CI](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

Self-hosted backend infrastructure platform with webhook delivery, job queues, cron scheduling, API gateway, and real-time monitoring.

## Features

- **Webhook Endpoints** — Register endpoints, receive webhooks with HMAC signature verification, automatic delivery with retries
- **Job Queue** — Generic job processing with BullMQ, multiple handler types, priority support
- **Cron Scheduler** — Schedule jobs with cron expressions, HTTP actions, missed job detection
- **Email Templates** — Nodemailer + Ethereal, Handlebars templating, queued delivery
- **API Gateway** — Proxy requests to upstream services, JWT/API key auth, rate limiting (Token Bucket), consumer quotas
- **Real-time Monitoring** — Socket.io events, live metrics, time series data
- **Alerting** — Configurable rules, multiple notification channels, cooldown management

## Quick Start

### Docker Compose (Development)

```bash
docker compose up
```

Visit http://localhost:3000

### Manual Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## API Documentation

Interactive API docs: http://localhost:3000/api/docs

Raw OpenAPI spec: http://localhost:3000/api/docs.json

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017/devrelay` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | - |

## Project Structure

```
src/
├── api/              # Express routes
├── config/           # Configuration (env, database, redis, queues)
├── controllers/      # Request handlers
├── gateway/          # API gateway proxy middleware
├── middleware/       # Express middleware (auth, rate limiting)
├── models/           # Mongoose models
├── scheduler/        # Cron job manager
├── services/         # Business logic services
├── socket/           # Socket.io server and emitter
├── utils/            # Utility functions
├── workers/          # BullMQ workers
├── app.js            # Server startup
└── server.js         # Express app setup
```

## SDK Usage

```javascript
const { DevRelayClient } = require('@devrelay/sdk');

const client = new DevRelayClient({
  apiKey: 'dr_sk_...',
  workspaceSlug: 'my-workspace',
  baseUrl: 'https://api.devrelay.io'
});

// Dispatch webhook event
await client.events.dispatch('order.created', { orderId: '123', amount: 99.99 });

// Enqueue background job
const job = await client.jobs.enqueue('send-invoice', { orderId: '123' });

// Check job status
const status = await client.jobs.status(job.id);

// Create scheduled job
await client.scheduler.create({
  name: 'Daily Report',
  cronExpression: '0 9 * * *',
  action: { type: 'http-request', config: { url: 'https://example.com/report' } }
});
```

## Testing

```bash
npm test                 # Run all tests
npm run test:coverage    # With coverage report
```

## License

MIT