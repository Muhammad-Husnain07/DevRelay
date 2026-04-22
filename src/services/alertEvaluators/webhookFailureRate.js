const WebhookDelivery = require('../../models/WebhookDelivery');

const evaluate = async (workspaceId, windowMinutes = 5) => {
  const since = new Date(Date.now() - windowMinutes * 60000);

  const [total, failed] = await Promise.all([
    WebhookDelivery.countDocuments({ workspaceId, createdAt: { $gte: since } }),
    WebhookDelivery.countDocuments({ workspaceId, status: 'failed', createdAt: { $gte: since } })
  ]);

  if (total === 0) return 0;
  return (failed / total) * 100;
};

module.exports = { evaluate };