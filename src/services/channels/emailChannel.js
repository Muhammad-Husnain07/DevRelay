const { queueEmailNow } = require('../../services/emailQueueService');

const send = async (alert, config) => {
  const { to, templateSlug = 'alert', variables = {} } = config;

  await queueEmailNow({
    to,
    templateSlug,
    variables: {
      ...variables,
      alertMessage: alert.message,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      firedAt: alert.createdAt
    }
  });
};

module.exports = send;