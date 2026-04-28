const express = require('express');
const router = express.Router();
const WebhookEndpoint = require('../models/WebhookEndpoint');
const WebhookDelivery = require('../models/WebhookDelivery');
const { authenticate } = require('../middleware/auth');
const { resolveWorkspace } = require('../middleware/workspace');

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/webhooks:
 *   get:
 *     summary: List webhook endpoints
 *     description: Get all webhook endpoints for a workspace
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of webhook endpoints
 */
router.get('/:workspaceSlug/webhooks', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const endpoints = await WebhookEndpoint.find({ workspaceId: req.workspace._id })
      .sort({ createdAt: -1 });
    
    res.json({ endpoints: endpoints.map(e => e.getPublic()) });
  } catch (error) {
    console.error('List endpoints error:', error);
    res.status(500).json({ error: 'Failed to list endpoints' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/webhooks:
 *   post:
 *     summary: Create a webhook endpoint
 *     description: Create a new webhook endpoint for receiving events
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceSlug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url]
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               rateLimitPerMinute:
 *                 type: number
 *               timeoutMs:
 *                 type: number
 *     responses:
 *       201:
 *         description: Endpoint created
 */
router.post('/:workspaceSlug/webhooks', authenticate, resolveWorkspace, async (req, res) => {
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
});

/**
 * GET /api/workspaces/{workspaceSlug}/webhooks/{id}
 * @summary Get webhook endpoint
 * @tags Webhooks
 * @security bearerAuth
 * @response {WebhookResponse} 200 - Endpoint details
 */
router.get('/:workspaceSlug/webhooks/:id', authenticate, resolveWorkspace, async (req, res) => {
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
});

/**
 * PUT /api/workspaces/{workspaceSlug}/webhooks/{id}
 * @summary Update webhook endpoint
 * @tags Webhooks
 * @security bearerAuth
 */
router.put('/:workspaceSlug/webhooks/:id', authenticate, resolveWorkspace, async (req, res) => {
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
});

/**
 * DELETE /api/workspaces/{workspaceSlug}/webhooks/{id}
 * @summary Delete webhook endpoint
 * @tags Webhooks
 * @security bearerAuth
 */
router.delete('/:workspaceSlug/webhooks/:id', authenticate, resolveWorkspace, async (req, res) => {
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
});

/**
 * POST /api/workspaces/{workspaceSlug}/webhooks/{id}/rotate-secret
 * @summary Rotate webhook secret
 * @tags Webhooks
 * @security bearerAuth
 */
router.post('/:workspaceSlug/webhooks/:id/rotate-secret', authenticate, resolveWorkspace, async (req, res) => {
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
});

/**
 * POST /api/workspaces/{workspaceSlug}/webhooks/{id}/test
 * @summary Test webhook endpoint
 * @tags Webhooks
 * @security bearerAuth
 */
router.post('/:workspaceSlug/webhooks/:id/test', authenticate, resolveWorkspace, async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id
    });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const crypto = require('crypto');
    const axios = require('axios');

    const secretKey = Buffer.from(endpoint.secret, 'hex');
    
    const testPayload = {
      event: 'test.delivery',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery from DevRelay',
        workspace: req.workspace.name,
        endpoint: endpoint.name
      }
    };

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(testPayload))
      .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'X-DevRelay-Signature': `sha256=${signature}`,
      'X-DevRelay-Event': 'test.delivery',
      'X-DevRelay-Test': 'true'
    };

    if (endpoint.headers && endpoint.headers.size > 0) {
      for (const [key, value] of endpoint.headers) {
        headers[key] = value;
      }
    }

    const startTime = Date.now();
    let responseStatus = null;
    let responseBody = null;
    let errorMessage = null;

    try {
      const response = await axios.post(endpoint.url, testPayload, {
        headers,
        timeout: endpoint.timeoutMs || 30000,
        validateStatus: () => true
      });
      responseStatus = response.status;
      responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (axiosError) {
      errorMessage = axiosError.message;
    }

    const responseTimeMs = Date.now() - startTime;
    const isSuccess = responseStatus >= 200 && responseStatus < 300;

    await endpoint.updateStats(isSuccess, responseTimeMs);

    if (errorMessage) {
      return res.status(200).json({
        success: false,
        responseTimeMs,
        error: errorMessage,
        message: 'Test delivery failed'
      });
    }

    res.json({
      success: isSuccess,
      responseTimeMs,
      responseStatus,
      responseBody: responseBody ? (responseBody.substring(0, 500) || 'No response body') : 'No response body',
      message: isSuccess ? 'Test delivery successful' : 'Test delivery failed'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Failed to test endpoint' });
  }
});

/**
 * GET /api/workspaces/{workspaceSlug}/webhooks/{id}/stats
 * @summary Get webhook endpoint stats
 * @tags Webhooks
 * @security bearerAuth
 */
router.get('/:workspaceSlug/webhooks/:id/stats', authenticate, resolveWorkspace, async (req, res) => {
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
});

/**
 * GET /api/workspaces/{workspaceSlug}/webhooks/{id}/deliveries
 * @summary Get webhook endpoint delivery logs
 * @tags Webhooks
 * @security bearerAuth
 */
router.get('/:workspaceSlug/webhooks/:id/deliveries', authenticate, resolveWorkspace, async (req, res) => {
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
});

module.exports = router;