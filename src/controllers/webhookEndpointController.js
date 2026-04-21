const WebhookEndpoint = require('../models/WebhookEndpoint');
const WebhookDelivery = require('../models/WebhookDelivery');

exports.createEndpoint = async (req, res) => {
  try {
    const { name, url, events = ['*'], rateLimitPerMinute, timeoutMs, headers } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    
    const endpoint = await WebhookEndpoint.create({
      workspaceId: req.workspace._id,
      name,
      url,
      events,
      rateLimitPerMinute,
      timeoutMs,
      headers
    });
    
    const rawSecret = endpoint.generateSecret();
    await endpoint.save();
    
    res.status(201).json({
      endpoint: endpoint.getPublic(),
      rawSecret,
      message: 'Store this secret securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Create endpoint error:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
};

exports.listEndpoints = async (req, res) => {
  try {
    const endpoints = await WebhookEndpoint.find({ workspaceId: req.workspace._id })
      .sort({ createdAt: -1 });
    
    res.json({ endpoints: endpoints.map(e => e.getPublic()) });
  } catch (error) {
    console.error('List endpoints error:', error);
    res.status(500).json({ error: 'Failed to list endpoints' });
  }
};

exports.getEndpoint = async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    res.json({ endpoint: endpoint.getPublic() });
  } catch (error) {
    console.error('Get endpoint error:', error);
    res.status(500).json({ error: 'Failed to get endpoint' });
  }
};

exports.updateEndpoint = async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    const { name, url, events, rateLimitPerMinute, timeoutMs, headers, isActive } = req.body;
    
    if (name) endpoint.name = name;
    if (url) endpoint.url = url;
    if (events) endpoint.events = events;
    if (rateLimitPerMinute) endpoint.rateLimitPerMinute = rateLimitPerMinute;
    if (timeoutMs) endpoint.timeoutMs = timeoutMs;
    if (headers) endpoint.headers = new Map(Object.entries(headers));
    if (typeof isActive === 'boolean') endpoint.isActive = isActive;
    
    await endpoint.save();
    
    res.json({ endpoint: endpoint.getPublic() });
  } catch (error) {
    console.error('Update endpoint error:', error);
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
};

exports.deleteEndpoint = async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    endpoint.isActive = false;
    await endpoint.save();
    
    res.json({ message: 'Endpoint deleted successfully' });
  } catch (error) {
    console.error('Delete endpoint error:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
};

exports.rotateSecret = async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    const rawSecret = endpoint.generateSecret();
    await endpoint.save();
    
    res.json({
      rawSecret,
      message: 'Store this new secret securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Rotate secret error:', error);
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
};

exports.testEndpoint = async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    const testPayload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      workspaceId: req.workspace._id.toString()
    };
    
    const delivery = await WebhookDelivery.create({
      endpointId: endpoint._id,
      workspaceId: req.workspace._id,
      status: 'pending',
      requestBody: testPayload
    });
    
    await dispatchTestDelivery(delivery._id, endpoint._id);
    
    res.json({
      message: 'Test delivery queued',
      deliveryId: delivery._id
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Failed to test endpoint' });
  }
};

async function dispatchTestDelivery(deliveryId, endpointId) {
  const { webhookDeliveryQueue } = require('../config/queues');
  const WebhookEndpoint = require('../models/WebhookEndpoint');
  const WebhookDelivery = require('../models/WebhookDelivery');
  
  const endpoint = await WebhookEndpoint.findById(endpointId);
  const delivery = await WebhookDelivery.findById(deliveryId);
  
  const axios = require('axios');
  const crypto = require('crypto');
  
  const payload = delivery.requestBody;
  const signature = crypto
    .createHmac('sha256', endpoint.secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(endpoint.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-DevRelay-Signature': `sha256=${signature}`,
        'X-DevRelay-Event': 'test.ping',
        'X-DevRelay-Delivery-Id': delivery._id.toString()
      },
      timeout: endpoint.timeoutMs || 30000
    });
    
    delivery.responseStatus = response.status;
    delivery.responseTimeMs = Date.now() - startTime;
    delivery.status = response.status < 400 ? 'success' : 'failed';
    await delivery.save();
    
  } catch (error) {
    delivery.responseTimeMs = Date.now() - startTime;
    delivery.status = 'failed';
    delivery.error = error.message;
    await delivery.save();
  }
}

exports.getEndpointStats = async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    res.json({ stats: endpoint.stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

exports.getEndpointDeliveries = async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const deliveries = await WebhookDelivery.find({ endpointId: endpoint._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await WebhookDelivery.countDocuments({ endpointId: endpoint._id });
    
    res.json({
      deliveries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ error: 'Failed to get deliveries' });
  }
};