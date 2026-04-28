const { dispatchEvent } = require('../../services/webhookService');

async function execute(config, payload = {}, workspaceId) {
  console.log('[WebhookEventAction] config:', JSON.stringify(config));
  
  const { eventType, payload: eventPayload } = config;
  
  const result = await dispatchEvent(workspaceId, eventType, eventPayload || payload, 'schedule');
  
  return {
    eventId: result.eventId,
    deliveriesQueued: result.deliveryCount
  };
}

module.exports = { execute };