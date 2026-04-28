const express = require('express');
const InboundWebhook = require('../models/InboundWebhook');
const { verifyInboundWebhook, extractEventType, transformPayload } = require('../services/signatureVerifier');
const { dispatchEvent } = require('../services/webhookService');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');
const IORedis = require('ioredis');

const redisClient = new IORedis({
  host: 'redis',
  port: 6379,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 3000)
});

const router = express.Router();

const MAX_REQUEST_HISTORY = 20;

router.post('/receive/:slug', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const inbound = await InboundWebhook.findOne({ slug: req.params.slug });
    
    if (!inbound) {
      return res.status(404).json({ error: 'Inbound webhook not found' });
    }
    
    if (!inbound.isActive) {
      return res.status(410).json({ error: 'Inbound webhook is disabled' });
    }
    
    const rawBody = req.body;
    const bodyStr = rawBody instanceof Buffer 
      ? rawBody.toString('utf8') 
      : (typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
    
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = value;
    }
    
    const signatureResult = await verifyInboundWebhook(inbound, rawBody, headers);
    
    if (!signatureResult.valid) {
      await storeRequest(inbound, req, bodyStr, 'failed-signature');
      return res.status(401).json({ error: signatureResult.error || 'Invalid signature' });
    }
    
    let payload;
    try {
      payload = JSON.parse(bodyStr);
    } catch {
      payload = { raw: bodyStr };
    }
    
    const transformedPayload = transformPayload(inbound.transformScript, payload);
    const eventType = extractEventType(inbound, transformedPayload);
    
    await storeRequest(inbound, req, bodyStr, 'success');
    await inbound.incrementRequestCount();
    
    const result = await dispatchEvent(inbound.workspaceId, eventType, transformedPayload, 'inbound');
    
    res.status(200).json({
      received: true,
      eventId: result.eventId,
      eventType
    });
  } catch (error) {
    console.error('Inbound webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function storeRequest(inbound, req, body, status) {
  try {
    const key = `inbound:${inbound._id}:requests`;
    
    const requestData = {
      timestamp: new Date().toISOString(),
      status,
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: body.substring(0, 10000),
      ip: req.ip || req.connection?.remoteAddress
    };
    
    await redisClient.lpush(key, JSON.stringify(requestData));
    await redisClient.ltrim(key, 0, MAX_REQUEST_HISTORY - 1);
    await redisClient.expire(key, 86400);
  } catch (error) {
    console.error('Store request error:', error.message);
  }
}

router.get('/:workspaceSlug/inbound', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const webhooks = await InboundWebhook.find({ workspaceId: req.workspace._id })
      .sort({ createdAt: -1 });
    
    res.json({ inboundWebhooks: webhooks.map(w => w.getPublic()) });
  } catch (error) {
    console.error('List inbound error:', error);
    res.status(500).json({ error: 'Failed to list inbound webhooks' });
  }
});

router.post('/:workspaceSlug/inbound', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const { name, slug, method, signatureHeader, signatureAlgorithm, signatureFormat, signaturePrefix, transformScript, eventTypeField, defaultEventType } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const existing = await InboundWebhook.findOne({ slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
    if (existing) {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    
    const inbound = await InboundWebhook.create({
      workspaceId: req.workspace._id,
      name,
      slug,
      method,
      signatureHeader,
      signatureAlgorithm: signatureAlgorithm || 'sha256',
      signatureFormat: signatureFormat || 'hex',
      signaturePrefix: signaturePrefix || '',
      transformScript,
      eventTypeField: eventTypeField || 'type',
      defaultEventType: defaultEventType || 'webhook.received'
    });
    
    const rawSecret = inbound.generateSecret();
    await inbound.save();
    
    res.status(201).json({
      inboundWebhook: inbound.getPublic(),
      rawSecret,
      message: 'Store this secret securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Create inbound error:', error);
    res.status(500).json({ error: 'Failed to create inbound webhook' });
  }
});

router.get('/:workspaceSlug/inbound/:id', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const inbound = await InboundWebhook.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!inbound) {
      return res.status(404).json({ error: 'Inbound webhook not found' });
    }
    
    res.json({ inboundWebhook: inbound.getPublic() });
  } catch (error) {
    console.error('Get inbound error:', error);
    res.status(500).json({ error: 'Failed to get inbound webhook' });
  }
});

router.put('/:workspaceSlug/inbound/:id', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const inbound = await InboundWebhook.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!inbound) {
      return res.status(404).json({ error: 'Inbound webhook not found' });
    }
    
    const { name, method, signatureHeader, signatureAlgorithm, signatureFormat, signaturePrefix, transformScript, eventTypeField, defaultEventType, isActive } = req.body;
    
    if (name) inbound.name = name;
    if (method) inbound.method = method;
    if (signatureHeader) inbound.signatureHeader = signatureHeader;
    if (signatureAlgorithm) inbound.signatureAlgorithm = signatureAlgorithm;
    if (signatureFormat) inbound.signatureFormat = signatureFormat;
    if (signaturePrefix) inbound.signaturePrefix = signaturePrefix;
    if (transformScript !== undefined) inbound.transformScript = transformScript;
    if (eventTypeField) inbound.eventTypeField = eventTypeField;
    if (defaultEventType) inbound.defaultEventType = defaultEventType;
    if (typeof isActive === 'boolean') inbound.isActive = isActive;
    
    await inbound.save();
    
    res.json({ inboundWebhook: inbound.getPublic() });
  } catch (error) {
    console.error('Update inbound error:', error);
    res.status(500).json({ error: 'Failed to update inbound webhook' });
  }
});

router.delete('/:workspaceSlug/inbound/:id', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const inbound = await InboundWebhook.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!inbound) {
      return res.status(404).json({ error: 'Inbound webhook not found' });
    }
    
    inbound.isActive = false;
    await inbound.save();
    
    res.json({ message: 'Inbound webhook deleted' });
  } catch (error) {
    console.error('Delete inbound error:', error);
    res.status(500).json({ error: 'Failed to delete inbound webhook' });
  }
});

router.post('/:workspaceSlug/inbound/:id/rotate-secret', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const inbound = await InboundWebhook.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!inbound) {
      return res.status(404).json({ error: 'Inbound webhook not found' });
    }
    
    const rawSecret = inbound.generateSecret();
    await inbound.save();
    
    res.json({
      rawSecret,
      message: 'Store this secret securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Rotate secret error:', error);
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
});

router.get('/:workspaceSlug/inbound/:id/requests', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const inbound = await InboundWebhook.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!inbound) {
      return res.status(404).json({ error: 'Inbound webhook not found' });
    }
    
    const key = `inbound:${inbound._id}:requests`;
    const requests = await redisClient.lrange(key, 0, MAX_REQUEST_HISTORY - 1);
    
    const parsed = requests
      .map(r => {
        try {
          return JSON.parse(r);
        } catch {
          return r;
        }
      })
      .filter(Boolean);
    
    res.json({ requests: parsed });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

module.exports = router;