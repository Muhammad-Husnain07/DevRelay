# Jobs Guide

## Overview

DevRelay provides a generic job queue system built on BullMQ for processing background tasks with priority, delays, and retry support.

## Enqueuing Jobs

### Basic Job

```bash
curl -X POST http://localhost:3000/api/workspaces/my-workspace/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "send-welcome-email",
    "payload": {
      "userId": "123",
      "email": "user@example.com"
    }
  }'
```

### Job with Priority

```bash
# Priority: -1 (low), 0 (normal), 1 (high), 2 (critical)
curl -X POST http://localhost:3000/api/workspaces/my-workspace/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "process-payment",
    "payload": { "orderId": "456" },
    "priority": 2
  }'
```

### Delayed Job

```bash
curl -X POST http://localhost:3000/api/workspaces/my-workspace/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "reminder-email",
    "payload": { "appointmentId": "789" },
    "delay": 3600000  # 1 hour in milliseconds
  }'
```

## Job Handlers

### Register Handler

```javascript
// src/services/jobHandlers.js
module.exports = {
  'send-welcome-email': async (job) => {
    const { userId, email } = job.data;
    
    await sendEmail({
      to: email,
      subject: 'Welcome!',
      template: 'welcome',
      variables: { userId }
    });
    
    return { sent: true };
  },
  
  'process-payment': async (job) => {
    const { orderId } = job.data;
    
    const result = await paymentGateway.charge(orderId);
    
    if (result.status === 'failed') {
      throw new Error('Payment failed');
    }
    
    return { success: true, transactionId: result.id };
  },
  
  'generate-report': async (job) => {
    const { reportType, dateRange } = job.data;
    
    const report = await generateReport(reportType, dateRange);
    
    await saveReport(report);
    
    return { reportId: report.id };
  }
};
```

### Handler Registration

```javascript
// src/workers/genericJobWorker.js
const jobHandlers = require('../services/jobHandlers');

async function startWorker() {
  const worker = new Worker('job', async (job) => {
    const handler = jobHandlers[job.name];
    
    if (!handler) {
      throw new Error(`No handler for job: ${job.name}`);
    }
    
    return await handler(job);
  }, {
    connection: redisClient,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000
    }
  });
  
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });
  
  return worker;
}
```

## Checking Job Status

### Get Job Details

```bash
curl http://localhost:3000/api/workspaces/my-workspace/jobs/{id} \
  -H "Authorization: Bearer $TOKEN"
```

### Response

```json
{
  "job": {
    "id": "507f1f77bcf86cd799439011",
    "name": "send-welcome-email",
    "status": "completed",
    "progress": 100,
    "result": { "sent": true },
    "attempts": 1,
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:30:05Z"
  }
}
```

### Get Job Stats

```bash
curl http://localhost:3000/api/workspaces/my-workspace/jobs/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Response

```json
{
  "stats": {
    "waiting": 10,
    "active": 5,
    "completed": 100,
    "failed": 3,
    "total": 118
  }
}
```

## Retrying Failed Jobs

### Manual Retry

```bash
curl -X POST http://localhost:3000/api/workspaces/my-workspace/jobs/{id}/retry \
  -H "Authorization: Bearer $TOKEN"
```

### Bulk Retry All Failed

```bash
curl -X POST http://localhost:3000/api/admin/queues/generic-job/retry-failed \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Canceling Jobs

### Delete Pending Job

```bash
curl -X DELETE http://localhost:3000/api/workspaces/my-workspace/jobs/{id} \
  -H "Authorization: Bearer $TOKEN"
```

## Queue Configuration

### Priorities

| Priority | Value | Use Case |
|----------|-------|---------|
| Low | -1 | Batch processing, cleanup |
| Normal | 0 | Default jobs |
| High | 1 | User-initiated actions |
| Critical | 2 | Payments, auth |

### Concurrency

```javascript
const worker = new Worker('job', handler, {
  concurrency: 10,        // 10 concurrent jobs
  limiter: {
    max: 100,            // 100 jobs
    duration: 1000       // per second
  }
});
```

### Rate Limiting

```javascript
const queue = new Queue('job', {
  limiter: {
    max: 100,
    duration: 60000  // 100 jobs per minute
  }
});
```

## Best Practices

1. **Idempotency** - jobs should be safe to run multiple times
2. **Small payloads** - store large data in database, pass ID
3. **Error handling** - throw meaningful errors for retry logic
4. **Progress tracking** - update progress for long-running jobs
5. **Timeouts** - set reasonable timeout values