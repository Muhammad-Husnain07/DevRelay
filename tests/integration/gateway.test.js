const request = require('supertest');
const app = require('../src/server');
const userFactory = require('./factories/userFactory');
const workspaceFactory = require('./factories/workspaceFactory');
const { getAuthHeader, createTestConsumer } = require('./helpers/auth');
const GatewayRoute = require('../src/models/GatewayRoute');
const Consumer = require('../src/models/Consumer');

describe('Gateway API', () => {
  let user;
  let workspace;
  let token;
  let route;
  let consumer;

  beforeEach(async () => {
    user = await userFactory.create();
    workspace = await workspaceFactory.create(user._id);
    token = await getAuthHeader(user);
    route = await GatewayRoute.create({
      workspaceId: workspace._id,
      name: 'Test Route',
      path: '/api/test',
      upstream: { url: 'http://localhost:9999' },
      isActive: true,
      priority: 1
    });
    consumer = await createTestConsumer(workspace._id);
  });

  describe('GET /api/workspaces/:slug/gateway/routes', () => {
    test('returns routes list', async () => {
      const res = await request(app).get(`/api/workspaces/${workspace.slug}/gateway/routes`).set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body.routes).toBeDefined();
    });
  });

  describe('POST /api/workspaces/:slug/gateway/routes', () => {
    test('creates route', async () => {
      const res = await request(app).post(`/api/workspaces/${workspace.slug}/gateway/routes`).send({
        name: 'New Route',
        path: '/api/new',
        upstream: { url: 'http://localhost:9998' }
      }).set('Authorization', token);
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/workspaces/:slug/gateway/consumers', () => {
    test('returns consumers list', async () => {
      const res = await request(app).get(`/api/workspaces/${workspace.slug}/gateway/consumers`).set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body.consumers).toBeDefined();
    });
  });

  describe('PUT /api/workspaces/:slug/gateway/consumers/:id', () => {
    test('updates consumer', async () => {
      const res = await request(app).put(`/api/workspaces/${workspace.slug}/gateway/consumers/${consumer._id}`).send({
        rateLimits: { requestsPerMinute: 50 }
      }).set('Authorization', token);
      expect(res.status).toBe(200);
    });
  });
});