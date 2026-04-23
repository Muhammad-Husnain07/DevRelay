const { faker } = require('@faker-js/faker');
const User = require('../../src/models/User');

const userFactory = {
  build: (overrides = {}) => ({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'TestPassword123!',
    plan: 'free',
    ...overrides
  }),

  create: async (overrides = {}) => {
    const data = userFactory.build(overrides);
    return User.create(data);
  }
};

module.exports = userFactory;