const WebhookEndpoint = require('../../models/WebhookEndpoint');

const evaluate = async (workspaceId) => {
  const endpoints = await WebhookEndpoint.find({ workspaceId, isActive: true, consecutiveFailures: { $gt: 0 } });
  if (!endpoints.length) return 0;
  return Math.max(...endpoints.map(e => e.consecutiveFailures));
};

module.exports = { evaluate };