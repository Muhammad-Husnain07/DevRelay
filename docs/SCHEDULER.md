# Scheduler Guide

## Overview

DevRelay's Cron Scheduler allows you to schedule jobs to run automatically at specified intervals using cron expressions.

## Features

- **5-field cron** - Standard cron (minute, hour, day, month, weekday)
- **6-field cron** - With seconds support (second, minute, hour, day, month, weekday)
- **Multiple action types** - HTTP requests, enqueue jobs, webhook events
- **Timezone support** - Run jobs in your local timezone
- **History tracking** - View execution history and status

## Cron Expression Format

### 5-field (Standard)
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ day of week (0-7, 0 and 7 are Sunday)
│ │ │ └─── month (1-12)
│ │ └───── day of month (1-31)
│ └─────── hour (0-23)
└───────── minute (0-59)
```

### 6-field (With Seconds)
```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─ day of week (0-7)
│ │ │ │ └─── month (1-12)
│ │ │ └───── day of month (1-31)
│ │ └─────── hour (0-23)
│ └───────── minute (0-59)
└─────────── second (0-59)
```

### Common Examples

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/30 * * * * *` | Every 30 seconds |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Daily at midnight |
| `0 9 * * *` | Daily at 9 AM |

## Action Types

### 1. HTTP Request
```json
{
  "type": "http-request",
  "url": "https://api.example.com/webhook",
  "method": "POST"
}
```

### 2. Enqueue Job
```json
{
  "type": "enqueue-job",
  "handler": "send-email",
  "config": { "to": "user@example.com", "subject": "Report" }
}
```

### 3. Webhook Event
```json
{
  "type": "webhook-event",
  "eventType": "daily.summary",
  "payload": { "date": "2024-01-15" }
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces/:slug/scheduled-jobs` | List jobs |
| POST | `/api/workspaces/:slug/scheduled-jobs` | Create job |
| GET | `/api/workspaces/:slug/scheduled-jobs/:id` | Get job |
| PUT | `/api/workspaces/:slug/scheduled-jobs/:id` | Update job |
| DELETE | `/api/workspaces/:slug/scheduled-jobs/:id` | Delete job |
| POST | `/api/workspaces/:slug/scheduled-jobs/:id/toggle` | Pause/Resume |
| POST | `/api/workspaces/:slug/scheduled-jobs/:id/run-now` | Trigger now |
| GET | `/api/workspaces/:slug/scheduled-jobs/:id/history` | History |
| POST | `/api/v1/scheduler/validate-cron` | Validate expression |

## Validate Cron

```bash
curl -X POST http://localhost:3000/api/v1/scheduler/validate-cron \
  -H "Content-Type: application/json" \
  -d '{"expression": "*/5 * * * *"}'
```