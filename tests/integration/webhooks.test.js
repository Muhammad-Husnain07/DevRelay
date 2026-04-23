const request = require('supertest');
const app = require('../src/server');
const userFactory = require('./factories/userFactory');
const workspaceFactory = require('./factories/workspaceFactory');
const webhookFactory = require('./factories/webhookFactory');
const { getAuthHeader } = require('./helpers/auth');
const WebhookEndpoint = require('../src/models/WebhookEndpoint');
const WebhookDelivery = require('../src/models/WebhookDelivery');

describe('Webhooks API', () => {
  let user;
  let workspace;
  let token;
  let endpoint;

  beforeEach(async () => {
    user = await userFactory.create();
    workspace = await workspaceFactory.create(user._id);
    token = await getAuthHeader(user);
    endpoint = await webhookFactory.create(workspace._id);
  });

  describe('GET /api/workspaces/:slug/webhooks', () => {
    test('returns webhooks list', async () => {
      const res = await request(app).get(`/api/workspaces/${workspace.slug}/webhooks`).set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body.endpoints).toBeDefined();
    });
  });

  describe('POST /api/workspaces/:slug/webhooks', () => {
    test('creates webhook endpoint', async () => {
      const res = await request(app).post(`/api/workspaces/${workspace.slug}/webhooks`).send({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['test.event']
      }).set('Authorization', token);
      expect(res.status).toBe(201);
      expect(res.body.endpoint).toBeDefined();
    });

    test('returns 400 for missing url', async () => {
      const res = await request(app).post(`/api/workspaces/${workspace.slug}/webhooks`).send({
        name: 'Test'
      }).set('Authorization', token);
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/workspaces/:slug/webhooks/:id', () => {
    test('updates webhook endpoint', async () => {
      const res = await request(app).put(`/api/workspaces/${workspace.slug}/webhooks/${endpoint._id}`).send({
        name: 'Updated Name'
      }).set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body.endpoint.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/workspaces/:slug/webhooks/:id', () => {
    test('deletes webhook endpoint', async () => {
      const res = await request(app).delete(`/api/workspaces/${workspace.slug}/webhooks/${endpoint._id}`).set('Authorization', token);
      expect(res.status).toBe(200);
    });
  });
});

describe('Webhook Delivery', () => {
  let user;
  let workspace;
  let token;
  let endpoint;

  beforeEach(async () => {
    user = await userFactory.create();
    workspace = await workspaceFactory.create(user._id);
    token = await getAuthHeader(user);
    endpoint = await webhookFactory.create(workspace._id);
  });

  test('creates delivery record on dispatch', async () => {
    const res = await request(app).post(`/api/workspaces/${workspace.slug}/webhooks/${endpoint._id}/dispatch`).send({
      event: 'test.event',
      data: { message: 'test' }
    }).set('Authorization', token);
    expect(res.status).toBe(202);
    expect(res.body.delivery).toBeDefined();
  });

  test('verifies signature', async () => {
    const crypto = require('crypto');
    const payload = { event: 'test.event', data: { message: 'test' } };
    const signature = crypto.createHmac('sha256', endpoint.secret).update(JSON.stringify(payload)).digest('hex');
    const res = await request(app).post(`/api/workspaces/${workspace.slug}/webhooks/${endpoint._id}/dispatch`).set('X-DevRelay-Signature', `sha256=${signature}`).send(payload).set('Authorization', token);
    expect(res.status).toBe(202);
  });
});