const request = require('supertest');
const app = require('../src/server');
const userFactory = require('./factories/userFactory');
const workspaceFactory = require('./factories/workspaceFactory');
const { getAuthHeader } = require('./helpers/auth');

describe('Workspace API', () => {
  let user;
  let workspace;
  let token;

  beforeEach(async () => {
    user = await userFactory.create();
    workspace = await workspaceFactory.create(user._id);
    token = await getAuthHeader(user);
  });

  describe('GET /api/workspaces', () => {
    test('returns workspace list for authenticated user', async () => {
      const res = await request(app).get('/api/workspaces').set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body.workspaces).toBeDefined();
    });

    test('returns 401 for unauthenticated user', async () => {
      const res = await request(app).get('/api/workspaces');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/workspaces', () => {
    test('creates new workspace', async () => {
      const res = await request(app).post('/api/workspaces').send({ name: 'Test Workspace' }).set('Authorization', token);
      expect(res.status).toBe(201);
      expect(res.body.workspace).toBeDefined();
    });

    test('returns 400 for missing name', async () => {
      const res = await request(app).post('/api/workspaces').send({}).set('Authorization', token);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/workspaces/:slug', () => {
    test('deletes workspace as owner', async () => {
      const res = await request(app).delete(`/api/workspaces/${workspace.slug}`).set('Authorization', token);
      expect(res.status).toBe(200);
    });
  });
});