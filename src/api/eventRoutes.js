const express = require('express');
const router = express.Router();
const WebhookEvent = require('../models/WebhookEvent');
const WebhookDelivery = require('../models/WebhookDelivery');
const Workspace = require('../models/Workspace');
const { authenticate } = require('../middleware/auth');
const { dispatchEvent, retryDelivery } = require('../services/webhookService');

console.log('[EventRoutes] Loading...');
console.log('[EventRoutes] dispatchEvent:', typeof dispatchEvent);

// Auth middleware
router.use(authenticate);

// POST /:workspaceSlug/events - Dispatch event
router.post('/:workspaceSlug/events', async (req, res) => {
  console.log('[EventRoutes] POST /:workspaceSlug/events called');
  
  try {
    const { workspaceSlug } = req.params;
    const { type, payload = {} } = req.body;
    
    console.log('[EventRoutes] workspaceSlug:', workspaceSlug);
    console.log('[EventRoutes] type:', type);
    console.log('[EventRoutes] user:', req.user?.email);
    
    if (!type) {
      return res.status(400).json({ error: 'Event type is required' });
    }
    
    // Find workspace
    const workspace = await Workspace.findOne({ slug: workspaceSlug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found: ' + workspaceSlug });
    }
    
    // Check membership
    const isMember = workspace.members.some(m => m.userId.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('[EventRoutes] Calling dispatchEvent...');
    
    // Dispatch event
    const result = await dispatchEvent(workspace._id, type, payload, 'api');
    
    console.log('[EventRoutes] Result:', result);
    
    res.status(201).json({
      eventId: result.eventId,
      deliveriesQueued: result.deliveryCount
    });
  } catch (error) {
    console.error('[EventRoutes] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /:workspaceSlug/events - List events
router.get('/:workspaceSlug/events', async (req, res) => {
  try {
    const { workspaceSlug } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    const workspace = await Workspace.findOne({ slug: workspaceSlug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    if (!workspace.members || !Array.isArray(workspace.members)) {
      return res.status(500).json({ error: 'Workspace has no members array' });
    }
    
    const isMember = workspace.members.some(m => m.userId.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!workspace._id) {
      return res.status(500).json({ error: 'Workspace has no _id' });
    }
    
    const events = await WebhookEvent.find({ workspaceId: workspace._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await WebhookEvent.countDocuments({ workspaceId: workspace._id });
    
    res.json({
      events,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    console.error('[EventRoutes] GET Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /:workspaceSlug/events/:eventId - Get event
router.get('/:workspaceSlug/events/:eventId', async (req, res) => {
  try {
    const { workspaceSlug, eventId } = req.params;
    
    const workspace = await Workspace.findOne({ slug: workspaceSlug });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    const isMember = workspace.members.some(m => m.userId.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const event = await WebhookEvent.findOne({ _id: eventId, workspaceId: workspace._id });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const deliveries = await WebhookDelivery.find({ eventId: event._id })
      .sort({ createdAt: -1 });
    
    res.json({ event, deliveries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:workspaceSlug/deliveries/:deliveryId/retry - Retry delivery
router.post('/:workspaceSlug/deliveries/:deliveryId/retry', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    
    const delivery = await WebhookDelivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    const result = await retryDelivery(deliveryId);
    res.json({ delivery: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

console.log('[EventRoutes] Routes defined');
module.exports = router;
