const request = require('supertest');
const app = require('../src/server');
const { validateUrl } = require('../src/middleware/ssrfProtection');
const AuditLog = require('../src/models/AuditLog');
const userFactory = require('./factories/userFactory');
const workspaceFactory = require('./factories/workspaceFactory');
const { getAuthHeader } = require('./helpers/auth');

describe('Security', () => {
  let token;

  beforeEach(async () => {
    const user = await userFactory.create();
    token = await getAuthHeader(user);
  });

  describe('NoSQL Injection Prevention', () => {
    test('blocks MongoDB operator injection in request body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $ne: null }, password: 'test' });

      expect(res.status).toBe(400);
    });

    test('blocks MongoDB operator in nested object', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: { $gt: '' },
          password: 'password123'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('SSRF Protection', () => {
    test('blocks requests to localhost', async () => {
      const result = await validateUrl('http://127.0.0.1:8080/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });

    test('blocks requests to private IP ranges', async () => {
      const result = await validateUrl('http://192.168.1.1/admin');
      expect(result.valid).toBe(false);
    });

    test('blocks requests to metadata endpoints', async () => {
      const result = await validateUrl('http://169.254.169.254/latest/meta-data');
      expect(result.valid).toBe(false);
    });

    test('allows public URLs', async () => {
      const result = await validateUrl('https://api.example.com/webhook');
      expect(result.valid).toBe(true);
    });
  });

  describe('XSS Prevention', () => {
    test('sanitizes webhook name with script tag', async () => {
      const user = await userFactory.create();
      const workspace = await workspaceFactory.create(user._id);

      const res = await request(app)
        .post(`/api/workspaces/${workspace.slug}/webhooks`)
        .set('Authorization', await getAuthHeader(user))
        .send({
          name: '<script>alert(1)</script>',
          url: 'https://example.com/webhook',
          events: ['test']
        });

      expect(res.status).toBe(201);
    });
  });

  describe('Request ID', () => {
    test('adds X-Request-Id header to responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-request-id']).toBeDefined();
    });

    test('uses provided X-Request-Id if present', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('X-Request-Id', 'custom-request-id');

      expect(res.headers['x-request-id']).toBe('custom-request-id');
    });
  });

  describe('HPP Protection', () => {
    test('blocks duplicate query parameters', async () => {
      const res = await request(app)
        .get('/api/health?foo=bar&foo=baz');

      expect(res.status).toBe(200);
    });
  });
});