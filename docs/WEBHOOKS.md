# Webhooks Guide

## Overview

DevRelay provides a complete webhook infrastructure for sending and receiving webhooks with signature verification, automatic retries, and delivery tracking.

## Sending Webhooks (Outbound)

### Register an Endpoint

```bash
curl -X POST http://localhost:3000/api/workspaces/my-workspace/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payment Handler",
    "url": "https://api.example.com/webhooks/payments",
    "events": ["payment.created", "payment.failed"],
    "secret": "whsec_your_secret_key"
  }'
```

### Events

- `*` - all events
- Specific: `user.created`, `order.completed`, etc.

### Dispatch an Event

```javascript
const response = await fetch(
  'http://localhost:3000/api/workspaces/my-workspace/events',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: 'order.created',
      payload: { orderId: '123', amount: 99.99 }
    })
  }
);

const { eventId, deliveriesQueued } = await response.json();
```

## Receiving Webhooks (Inbound)

### Create Inbound Webhook

```bash
curl -X POST http://localhost:3000/api/workspaces/my-workspace/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub Inbound",
    "url": "https://your-app.com/webhooks/github",
    "events": ["push", "pull_request"],
    "isInbound": true
  }'
```

### Receiving Endpoint

```javascript
app.post('/receive/:slug', express.raw({ type: '*/*' }), async (req, res) => {
  const signature = req.headers['x-devrelay-signature'];
  const timestamp = req.headers['x-devrelay-timestamp'];
  
  // Verify HMAC-SHA256
  const isValid = verifySignature(req.body, signature, timestamp, secret);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const payload = JSON.parse(req.body.toString());
  console.log('Received webhook:', payload);
  
  res.status(200).json({ received: true });
});

function verifySignature(body, signature, timestamp, secret) {
  const crypto = require('crypto');
  const signed = timestamp + '.' + JSON.stringify(body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signed)
    .digest('hex');
  return signature === expected;
}
```

## Signature Verification

DevRelay signs all outbound webhooks with HMAC-SHA256:

```
Header: X-DevRelay-Signature: sha256=<signature>
Header: X-DevRelay-Timestamp: <timestamp>
```

**Payload format:**
```json
{
  "event": "order.created",
  "timestamp": 1699876543,
  "data": { "orderId": "123" }
}
```

**Verification:**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  const data = timestamp + '.' + JSON.stringify(payload);
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

## Delivery Tracking

### Get Delivery Status

```bash
curl http://localhost:3000/api/workspaces/my-workspace/webhooks/{id}/deliveries \
  -H "Authorization: Bearer $TOKEN"
```

### Response

```json
{
  "deliveries": [
    {
      "id": "507f1f77bcf86cd799439011",
      "eventId": "507f1f77bcf86cd799439022",
      "status": "success",
      "statusCode": 200,
      "duration": 245,
      "Attempts": 1,
      "responseBody": "OK",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Retries

DevRelay automatically retries failed deliveries with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: 1 second
- Attempt 3: 2 seconds
- Attempt 4: 4 seconds
- Attempt 5: 8 seconds (max)

## Testing Locally

### Using ngrok

```bash
# Expose local server
ngrok http 3000

# Update webhook URL to ngrok URL
curl -X PUT http://localhost:3000/api/workspaces/my-workspace/webhooks/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-ngrok.ngrok.io/webhook"}'
```

### Using webhook.site

```bash
# Create webhook at https://webhook.site
# Update endpoint URL
curl -X PUT http://localhost:3000/api/workspaces/my-workspace/webhooks/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://webhook.site/your-unique-id"}'
```

## Best Practices

1. **Always verify signatures** - don't process unverified webhooks
2. **Respond quickly** - return 200 within 2 seconds
3. **Queue heavy processing** - use DevRelay jobs for async work
4. **Monitor failures** - setup alerts for high failure rates
5. **Use idempotency** - process same event multiple times safely