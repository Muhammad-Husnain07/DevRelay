const request = require('supertest');
const app = require('../src/server');
const userFactory = require('./factories/userFactory');
const workspaceFactory = require('./factories/workspaceFactory');
const jobFactory = require('./factories/jobFactory');
const { getAuthHeader } = require('./helpers/auth');

describe('Jobs API', () => {
  let user;
  let workspace;
  let token;
  let job;

  beforeEach(async () => {
    user = await userFactory.create();
    workspace = await workspaceFactory.create(user._id);
    token = await getAuthHeader(user);
    job = await jobFactory.create(workspace._id);
  });

  describe('GET /api/workspaces/:slug/jobs', () => {
    test('returns jobs list', async () => {
      const res = await request(app).get(`/api/workspaces/${workspace.slug}/jobs`).set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeDefined();
    });
  });

  describe('POST /api/workspaces/:slug/jobs', () => {
    test('creates new job', async () => {
      const res = await request(app).post(`/api/workspaces/${workspace.slug}/jobs`).send({
        name: 'test-job',
        handler: 'log-message',
        payload: { message: 'Hello' }
      }).set('Authorization', token);
      expect(res.status).toBe(201);
      expect(res.body.job).toBeDefined();
    });
  });

  describe('GET /api/workspaces/:slug/jobs/:id', () => {
    test('returns job details', async () => {
      const res = await request(app).get(`/api/workspaces/${workspace.slug}/jobs/${job._id}`).set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body.job).toBeDefined();
    });
  });

  describe('DELETE /api/workspaces/:slug/jobs/:id', () => {
    test('deletes job', async () => {
      const res = await request(app).delete(`/api/workspaces/${workspace.slug}/jobs/${job._id}`).set('Authorization', token);
      expect(res.status).toBe(200);
    });
  });
});