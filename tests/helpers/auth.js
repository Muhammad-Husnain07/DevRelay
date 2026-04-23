const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Workspace = require('../src/models/Workspace');

let testUser = null;
let testWorkspace = null;

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

const createTestUser = async (overrides = {}) => {
  const { faker } = require('@faker-js/faker');
  const user = await User.create({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'TestPassword123!',
    ...overrides
  });
  return user;
};

const createTestWorkspace = async (userId, overrides = {}) => {
  const { faker } = require('@faker-js/faker');
  const workspace = await Workspace.create({
    name: faker.company.name(),
    ownerId: userId,
    members: [{ userId, role: 'owner' }],
    ...overrides
  });
  return workspace;
};

const getAuthHeader = async (user) => {
  const token = generateToken(user);
  return `Bearer ${token}`;
};

const createTestConsumer = async (workspaceId) => {
  const Consumer = require('../src/models/Consumer');
  const { faker } = require('@faker-js/faker');
  return Consumer.create({
    workspaceId,
    name: faker.company.name(),
    key: `test-${faker.string.uuid()}`,
    isActive: true
  });
};

module.exports = {
  generateToken,
  createTestUser,
  createTestWorkspace,
  getAuthHeader,
  createTestConsumer
};