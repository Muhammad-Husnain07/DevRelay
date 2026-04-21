const { Worker } = require('bullmq');
const axios = require('axios');
const crypto = require('crypto');
const { redisClient } = require('./redis');
const WebhookEndpoint = require('../models/WebhookEndpoint');
const WebhookDelivery = require('../models/WebhookDelivery');
const WebhookEvent = require('../models/WebhookEvent');

const connection = {
  connection: redisClient,
  maxRetriesPerRequest: null
};

async function deliverWebhook(job) {
  const { deliveryId, endpointId, eventId } = job.data;
  
  let delivery;
  let endpoint;
  let event;
  
  try {
    delivery = await WebhookDelivery.findById(deliveryId);
    if (!delivery) {
      console.error(`[WebhookDelivery] Delivery not found: ${deliveryId}`);
      return;
    }
    
    endpoint = await WebhookEndpoint.findById(endpointId);
    if (!endpoint) {
      await markDeliveryFailed(delivery, 'Endpoint not found');
      return;
    }
    
    if (!endpoint.isActive) {
      await markDeliveryFailed(delivery, 'Endpoint is inactive');
      return;
    }
    
    event = await WebhookEvent.findById(eventId);
    const payload = delivery.requestBody;
    const signature = crypto
      .createHmac('sha256', endpoint.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const headers = {
      'Content-Type': 'application/json',
      'X-DevRelay-Signature': `sha256=${signature}`,
      'X-DevRelay-Event': event?.type || 'test.event',
      'X-DevRelay-Delivery-Id': delivery._id.toString(),
      'X-DevRelay-Timestamp': Date.now().toString()
    };
    
    if (endpoint.headers && endpoint.headers.size > 0) {
      for (const [key, value] of endpoint.headers) {
        headers[key] = value;
      }
    }
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(endpoint.url, payload, {
        headers,
        timeout: endpoint.timeoutMs || 30000,
        validateStatus: () => true
      });
      
      const responseTimeMs = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 300;
      
      delivery.responseStatus = response.status;
      delivery.responseBody = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);
      delivery.responseTimeMs = responseTimeMs;
      delivery.status = isSuccess ? 'success' : 'failed';
      
      await delivery.save();
      await endpoint.updateStats(isSuccess, responseTimeMs);
      
      if (event) {
        if (isSuccess) {
          event.markDelivered();
        } else {
          event.markFailed();
        }
        await event.save();
      }
      
      console.log(`[WebhookDelivery] ${deliveryId} → ${endpoint.url} ${response.status} (${responseTimeMs}ms)`);
      
    } catch (axiosError) {
      const responseTimeMs = Date.now() - startTime;
      await markDeliveryFailed(delivery, axiosError.message);
      await endpoint.updateStats(false, responseTimeMs);
    }
    
  } catch (error) {
    console.error(`[WebhookDelivery] Error processing ${deliveryId}:`, error.message);
    if (delivery) {
      await markDeliveryFailed(delivery, error.message);
    }
  }
}

async function markDeliveryFailed(delivery, errorMessage) {
  delivery.status = 'failed';
  delivery.error = errorMessage;
  await delivery.save();
}

const webhookDeliveryWorker = new Worker('webhook-delivery', deliverWebhook, {
  connection,
  concurrency: 10,
  limiter: {
    max: 10,
    duration: 1000
  }
});

webhookDeliveryWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

webhookDeliveryWorker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job.id} failed:`, error.message);
});

webhookDeliveryWorker.on('error', (error) => {
  console.error('[Worker] Worker error:', error.message);
});

module.exports = {
  webhookDeliveryWorker,
  deliverWebhook
};