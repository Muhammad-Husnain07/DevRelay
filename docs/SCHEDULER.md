# Scheduler Guide

## Overview

DevRelay's Cron Scheduler allows you to schedule jobs to run automatically at specified intervals using cron expressions.

## Features

- **5-field cron** - Standard cron (minute, hour, day, month, weekday)
- **6-field cron** - With seconds support (second, minute, hour, day, month, weekday)
- **Multiple action types** - HTTP requests, enqueue jobs, webhook events
- **Timezone support** - Run jobs in your local timezone
- **History tracking** - View execution history and status
- **Auto-recovery** - Detects and runs missed jobs on restart

## Cron Expression Format

### 5-field (Standard)
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7)
│ │ │ │ │
* * * * *
```

### 6-field (With Seconds)
```
┌───────────── second (0 - 59)
│ ┌───────────── minute (0 - 59)
│ │ ┌───────────── hour (0 - 23)
│ │ │ ┌───────────── day of month (1 - 31)
│ │ │ │ ┌───────────── month (1 - 12)
│ │ │ │ │ ┌───────────── day of week (0 - 7)
│ │ │ │ │ │
* * * * * *
```

### Common Examples

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/30 * * * * *` | Every 30 seconds |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Every day at midnight |
| `0 9 * * *` | Every day at 9 AM |
| `0 0 * * 1` | Every Monday at midnight |
| `0 0 1 * *` | First day of every month |

## Creating Scheduled Jobs

### Via API

```bash
curl -X POST http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Backup",
    "cronExpression": "0 2 * * *",
    "timezone": "UTC",
    "action": {
      "type": "http-request",
      "url": "https://api.example.com/backup",
      "method": "POST"
    }
  }'
```

### Via UI

1. Navigate to **Scheduler** in the sidebar
2. Click **Create Scheduled Job**
3. Fill in:
   - Name - Job identifier
   - Cron Expression - Use presets or custom
   - Timezone - Select timezone
   - Action Type - Choose what happens
4. Click **Create**

## Action Types

### 1. HTTP Request

Makes an HTTP call to an external URL.

```json
{
  "type": "http-request",
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": { "Authorization": "Bearer token" },
  "body": "{\"key\": \"value\"}"
}
```

### 2. Enqueue Job

Adds a job to the BullMQ queue for processing.

```json
{
  "type": "enqueue-job",
  "handler": "send-email",
  "config": {
    "to": "user@example.com",
    "subject": "Scheduled Report",
    "body": "Your report is ready"
  }
}
```

**Available Handlers:**
- `log-message` - Log a message
- `send-email` - Send an email
- `http-request` - Make HTTP request
- `webhook-call` - Call a webhook

### 3. Webhook Event

Dispatches a webhook event to your configured endpoints.

```json
{
  "type": "webhook-event",
  "eventType": "daily.summary",
  "payload": { "date": "2024-01-15" }
}
```

## Validate Cron Expression

```bash
curl -X POST http://localhost:3000/api/v1/scheduler/validate-cron \
  -H "Content-Type: application/json" \
  -d '{"expression": "*/5 * * * *"}'
```

Response:
```json
{
  "valid": true,
  "description": "Every 5 minutes",
  "nextRuns": ["2024-01-15T10:05:00Z", "2024-01-15T10:10:00Z"],
  "is6Field": false
}
```

## Managing Scheduled Jobs

### List Jobs
```bash
curl http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs \
  -H "Authorization: Bearer $TOKEN"
```

### Get Job Details
```bash
curl http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs/{id} \
  -H "Authorization: Bearer $TOKEN"
```

### Toggle Job
```bash
curl -X POST http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs/{id}/toggle \
  -H "Authorization: Bearer $TOKEN"
```

### Run Now (Manual Trigger)
```bash
curl -X POST http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs/{id}/run-now \
  -H "Authorization: Bearer $TOKEN"
```

### Delete Job
```bash
curl -X DELETE http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs/{id} \
  -H "Authorization: Bearer $TOKEN"
```

### Get Execution History
```bash
curl http://localhost:3000/api/workspaces/demo-workspace/scheduled-jobs/{id}/history?limit=20 \
  -H "Authorization: Bearer $TOKEN"
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `timeout` | Job execution timeout (ms) | 30000 |
| `maxConsecutiveFailures` | Auto-pause after failures | 5 |
| `timezone` | Cron timezone | UTC |

## Best Practices

1. **Test with `* * * * *`** - Run every minute while testing
2. **Use descriptive names** - Easy to identify in UI
3. **Set reasonable timeouts** - For long-running jobs
4. **Monitor failures** - Check history for errors
5. **Use timezone** - Align with your business hours