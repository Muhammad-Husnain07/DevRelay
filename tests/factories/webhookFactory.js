const { faker } = require('@faker-js/faker');
const WebhookEndpoint = require('../../src/models/WebhookEndpoint');
const crypto = require('crypto');

const webhookFactory = {
  build: (workspaceId, overrides = {}) => ({
    workspaceId,
    name: faker.string.alphanumeric(10),
    url: faker.internet.url(),
    secret: crypto.randomBytes(32).toString('hex'),
    events: ['test.event'],
    isActive: true,
    timeoutMs: 30000,
    headers: new Map(),
    ...overrides
  }),

  create: async (workspaceId, overrides = {}) => {
    const data = webhookFactory.build(workspaceId, overrides);
    return WebhookEndpoint.create(data);
  }
};

module.exports = webhookFactory;