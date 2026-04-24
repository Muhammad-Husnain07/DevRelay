# Security Guide

## Overview

DevRelay implements multiple security layers to protect your infrastructure and data.

## Authentication

### JWT Tokens

```javascript
// Token generation
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: user._id, workspaceId: workspace._id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Token verification
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### API Keys

```javascript
// Generate API key
const key = 'dr_sk_' + crypto.randomBytes(24).toString('hex');

// Verify in middleware
async function authenticateApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  const consumer = await Consumer.findOne({ keyId: key });
  
  if (!consumer || !consumer.isActive) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.consumer = consumer;
  next();
}
```

### GitHub OAuth

```javascript
// OAuth callback stores GitHub ID
const user = await User.create({
  name: profile.displayName,
  email: profile.emails[0].value,
  github: {
    id: profile.id,
    username: profile.username
  }
});
```

## Webhook Signatures

### HMAC-SHA256

```javascript
const crypto = require('crypto');

function createSignature(payload, timestamp, secret) {
  const data = `${timestamp}.${JSON.stringify(payload)}`;
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

function verifySignature(payload, signature, timestamp, secret) {
  const expected = createSignature(payload, timestamp, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

## SSRF Protection

```javascript
// Prevent requests to internal networks
function validateUrl(url) {
  const hostname = new URL(url).hostname;
  const ip = dns.lookup(hostname);
  
  // Block localhost
  if (['localhost', '127.0.0.1', '::1'].includes(ip)) {
    throw new Error('Blocked: localhost');
  }
  
  // Block private ranges
  if (ip.startsWith('10.') || 
      ip.startsWith('192.168.') ||
      ip.startsWith('172.16.')) {
    throw new Error('Blocked: private network');
  }
  
  // Block metadata endpoints
  if (hostname === 'metadata.google.internal') {
    throw new Error('Blocked: metadata endpoint');
  }
}
```

## Data Encryption

### AES-256-GCM

```javascript
const crypto = require('crypto');

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
}

function decrypt(encryptedData, key) {
  const [ivHex, encrypted, authTagHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

## Rate Limiting

### Token Bucket Algorithm

```javascript
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

## Audit Logging

```javascript
// Track admin actions
await AuditLog.create({
  action: 'workspace.update',
  userId: adminUser._id,
  workspaceId: workspace._id,
  details: { field: 'name', oldValue: old, newValue: new },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

## Security Headers

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'same-origin' }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
```

## NoSQL Injection Prevention

```javascript
// Uses express-mongo-sanitize
app.use(mongoSanitize());

// Blocks $ characters in user input
// { $gt: '' } → { gt: '' }
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `GITHUB_CLIENT_SECRET` | OAuth secret | No |
| `SMTP_PASS` | Email password | No |

## Reporting Security Issues

If you find a security vulnerability, please report it responsibly:

1. **Don't** create a public GitHub issue
2. **Email**: muhammad.husnain.dev@gmail.com
3. **Include**: Description, steps to reproduce, potential impact
4. **Response**: Within 48 hours

## Compliance

- **Data Encryption**: All sensitive data encrypted at rest
- **Audit Logs**: All admin actions logged
- **Access Control**: Role-based (owner, admin, member)
- **Network Isolation**: Docker network in production