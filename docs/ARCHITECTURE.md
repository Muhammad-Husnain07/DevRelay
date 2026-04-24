# DevRelay Architecture

## System Overview

DevRelay is a self-hosted backend infrastructure platform providing webhook delivery, job queues, cron scheduling, API gateway, real-time monitoring, and alerting.

## Core Subsystems

### 1. Webhook Delivery System

**Components:**
- `WebhookEndpoint` model - stores endpoint config
- `WebhookEvent` model - individual events
- `WebhookDelivery` model - delivery attempts
- `webhookDeliveryWorker` - BullMQ worker

**Flow:**
```
Client → POST /events → WebhookEvent.create()
  → Worker picks up → HMAC signature → HTTP POST to endpoint
  → Track response → Update delivery status
```

**Signature Verification:**
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');
// Header: X-DevRelay-Signature: sha256=<signature>
```

### 2. Job Queue System

**Components:**
- BullMQ with 4 queues
- `Job` model
- Generic job handlers

**Queue Configuration:**
```javascript
const queues = {
  webhookDelivery: new Queue('webhook-delivery', { attempts: 5 }),
  email: new Queue('email', { attempts: 3 }),
  scheduler: new Queue('scheduler', { attempts: 3 }),
  genericJob: new Queue('generic-job', { attempts: 3 })
};
```

**Priority Support:**
- `-1` = Low (batch processing)
- `0` = Normal (default)
- `1` = High (user-initiated)
- `2` = Critical (payment, auth)

### 3. API Gateway

**Components:**
- `GatewayRoute` model
- `GatewayLog` model
- Proxy middleware
- Rate limiting plugins

**Middleware Chain:**
```
Request → Auth → Rate Limit → Proxy → Upstream → Response
```

**Token Bucket Algorithm:**
```javascript
// Redis Lua script for atomic rate limiting
const lua = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local fill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local tokens = tonumber(redis.call('get', key) or capacity)
local last = tonumber(redis.call('get', key .. ':last') or now)
local new_tokens = math.min(capacity, tokens + (now - last) * fill_rate / 60)

if new_tokens >= 1 then
  redis.call('set', key, new_tokens - 1)
  redis.call('set', key .. ':last', now)
  return {1, new_tokens, 0}
end
return {0, new_tokens, math.ceil((1 - new_tokens) / fill_rate * 60)}
`;
```

### 4. Real-time Monitoring

**Components:**
- Socket.io server
- `metricsService` - Redis-backed counters
- `metricsAggregator` - periodic aggregation

**Socket Events:**
```javascript
// Server-side emit
socket.to(workspaceId).emit('delivery:status', {
  eventId,
  status: 'success',
  duration: 245
});

// Client-side listen
socket.on('delivery:status', (data) => {
  console.log('Delivery:', data.status);
});
```

### 5. Alerting System

**Components:**
- `AlertRule` model
- `Alert` model
- `alertEngine` - rule evaluation
- Channel handlers (email, webhook, socket)

**Evaluator Functions:**
```javascript
const evaluators = {
  webhook_failure_rate: async (workspaceId, threshold) => {
    const stats = await GatewayLog.computeStats(workspaceId);
    return (stats.failed / stats.total) * 100 > threshold;
  },
  queue_depth: async (workspaceId, threshold) => {
    const queue = getQueues().webhookDelivery;
    const waiting = await queue.getWaitingCount();
    return waiting > threshold;
  },
  email_bounce_rate: async (workspaceId, threshold) => {
    // Similar pattern
  }
};
```

## Data Models

### Workspace (Multi-tenant)

```javascript
const workspaceSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  ownerId: { type: ObjectId, ref: 'User' },
  members: [{
    userId: { type: ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member'] }
  }],
  isActive: { type: Boolean, default: true }
});
```

### Security Features

1. **SSRF Protection** - validate URLs before making requests
2. **NoSQL Injection** - `express-mongo-sanitize`
3. **Encryption** - AES-256-GCM for sensitive data
4. **Audit Logs** - track admin actions

## Performance Optimization

1. **Redis Caching** - workspace data with 60s TTL
2. **Connection Pooling** - MongoDB max 20 connections
3. **Indexing** - frequently queried fields
4. **Lazy Loading** - large payloads

## Deployment

### Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/devrelay
      - REDIS_URL=redis://redis:6379
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_started

  mongo:
    image: mongo:7
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Production Considerations

1. **HTTPS** - behind reverse proxy (nginx)
2. **Secrets** - use Docker secrets or env vars
3. **Monitoring** - Prometheus + Grafana
4. **Logging** - structured JSON logs
5. **Backups** - MongoDB oplog