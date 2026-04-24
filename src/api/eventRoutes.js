const express = require('express');
const router = express.Router();
const WebhookEvent = require('../models/WebhookEvent');

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/events:
 *   post:
 *     summary: Create a webhook event
 *     description: Emit a new webhook event for a workspace
 *     tags: [Events]
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
 *             properties:
 *               event:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       201:
 *         description: Event created
 */
router.post('/:workspaceSlug/events', async (req, res) => {
  try {
    const { type, payload = {} } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Event type is required' });
    }
    
    const result = await dispatchEvent(req.workspace._id, type, payload, 'api');
    
    res.status(201).json({
      eventId: result.eventId,
      deliveriesQueued: result.deliveryCount
    });
  } catch (error) {
    console.error('Trigger event error:', error);
    res.status(500).json({ error: 'Failed to trigger event' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceSlug}/events:
 *   get:
 *     summary: List webhook events
 *     description: Get all events for a workspace
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: workspaceSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of events
 */
router.get('/:workspaceSlug/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const events = await WebhookEvent.find({ workspaceId: req.workspace._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await WebhookEvent.countDocuments({ workspaceId: req.workspace._id });
    
    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

/**
 * GET /api/workspaces/{workspaceSlug}/events/{eventId}
 * @summary Get event details with delivery attempts
 * @tags Webhooks
 * @param {string} workspaceSlug.path.required - Workspace slug
 * @param {string} eventId.path.required - Event ID
 * @return {EventDetailResponse} 200 - Event details
 */
router.get('/:workspaceSlug/events/:eventId', async (req, res) => {
  try {
    const event = await WebhookEvent.findOne({
      _id: req.params.eventId,
      workspaceId: req.workspace._id
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const deliveries = await WebhookDelivery.find({ eventId: event._id })
      .sort({ createdAt: -1 });
    
    res.json({ event, deliveries });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

/**
 * POST /api/workspaces/{workspaceSlug}/deliveries/{deliveryId}/retry
 * @summary Manually retry a failed delivery
 * @tags Webhooks
 * @param {string} workspaceSlug.path.required - Workspace slug
 * @param {string} deliveryId.path.required - Delivery ID
 * @return {DeliveryResponse} 200 - Delivery queued
 */
router.post('/:workspaceSlug/deliveries/:deliveryId/retry', async (req, res) => {
  try {
    const delivery = await WebhookDelivery.findById(req.params.deliveryId);
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    if (delivery.workspaceId.toString() !== req.workspace._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const retried = await retryDelivery(delivery._id);
    
    res.json({ delivery: retried });
  } catch (error) {
    console.error('Retry delivery error:', error);
    res.status(500).json({ error: 'Failed to retry delivery' });
  }
});

module.exports = router;