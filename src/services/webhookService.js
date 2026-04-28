const WebhookEndpoint = require('../models/WebhookEndpoint');
const WebhookDelivery = require('../models/WebhookDelivery');
const WebhookEvent = require('../models/WebhookEvent');
const { webhookDeliveryQueue } = require('../config/queues');

async function dispatchEvent(workspaceId, eventType, payload, source = 'api') {
  console.log('[WebhookService] dispatchEvent called', { workspaceId, eventType, source });
  
  // Create event
  const event = await WebhookEvent.create({
    workspaceId,
    type: eventType,
    payload,
    source,
    status: 'pending'
  });
  
  // Find matching endpoints
  const endpoints = await WebhookEndpoint.find({
    workspaceId,
    isActive: true,
    $or: [
      { events: eventType },
      { events: '*' }
    ]
  });
  
  console.log('[WebhookService] Found endpoints:', endpoints.length);
  
  if (endpoints.length === 0) {
    event.status = 'delivered';
    event.deliveryCount = 0;
    await event.save();
    return { eventId: event._id, deliveryCount: 0 };
  }
  
  // Create deliveries and enqueue them
  const deliveries = [];
  for (const endpoint of endpoints) {
    const delivery = await WebhookDelivery.create({
      endpointId: endpoint._id,
      eventId: event._id,
      workspaceId,
      status: 'pending',
      requestBody: payload,
      requestHeaders: {
        'X-DevRelay-Event': eventType
      }
    });
    
    // Enqueue for delivery
    await webhookDeliveryQueue.add('deliver', {
      deliveryId: delivery._id.toString(),
      endpointId: endpoint._id.toString(),
      eventId: event._id.toString(),
      userId: null
    }, {
      jobId: `delivery-${delivery._id}`
    });
    
    deliveries.push(delivery);
  }
  
  event.status = 'delivered';
  event.deliveryCount = deliveries.length;
  await event.save();
  
  return { 
    eventId: event._id, 
    deliveryCount: deliveries.length 
  };
}

async function retryDelivery(deliveryId) {
  const delivery = await WebhookDelivery.findById(deliveryId);
  if (!delivery) {
    throw new Error('Delivery not found');
  }
  
  const endpoint = await WebhookEndpoint.findById(delivery.endpointId);
  if (!endpoint) {
    throw new Error('Endpoint not found');
  }
  
  delivery.status = 'pending';
  delivery.attempt = 1;
  delivery.error = undefined;
  await delivery.save();
  
  // Re-enqueue for delivery
  await webhookDeliveryQueue.add('deliver', {
    deliveryId: delivery._id.toString(),
    endpointId: endpoint._id.toString(),
    eventId: delivery.eventId.toString(),
    userId: null
  }, {
    jobId: `retry-${delivery._id}`
  });
  
  return delivery;
}

module.exports = { dispatchEvent, retryDelivery };
