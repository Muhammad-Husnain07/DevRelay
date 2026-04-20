const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/server');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth API', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', testUser.email);
      expect(res.body.user).toHaveProperty('name', testUser.name);
    });

    it('should fail with duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email already registered');
    });

    it('should fail without required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', testUser.email);
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: testUser.password });

      expect(res.status).toBe(401);
    });

    it('should fail without credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('JWT Token', () => {
    it('should generate valid JWT with correct payload', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const token = res.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devrelay-default-secret-key-change-me');

      expect(decoded).toHaveProperty('email', testUser.email);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('plan', 'free');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'test', email: 'test@test.com', plan: 'free' },
        process.env.JWT_SECRET || 'devrelay-default-secret-key-change-me',
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token expired');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      token = res.body.token;
    });

    it('should return user profile with valid JWT', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('email', testUser.email);
    });

    it('should fail without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });

  describe('API Keys', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      token = res.body.token;
    });

    it('should generate API key', async () => {
      const res = await request(app)
        .post('/api/auth/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My API Key', scopes: ['webhooks:read'] });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('rawKey');
      expect(res.body).toHaveProperty('prefix');
      expect(res.body).toHaveProperty('message');
    });

    it('should list API keys', async () => {
      await request(app)
        .post('/api/auth/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Key 1' });

      const res = await request(app)
        .get('/api/auth/keys')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.keys).toHaveLength(1);
      expect(res.body.keys[0]).toHaveProperty('prefix');
    });

    it('should revoke API key', async () => {
      const keyRes = await request(app)
        .post('/api/auth/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Key to Revoke' });

      const prefix = keyRes.body.prefix;

      const res = await request(app)
        .delete(`/api/auth/keys/${prefix}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const listRes = await request(app)
        .get('/api/auth/keys')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.body.keys).toHaveLength(0);
    });
  });
});