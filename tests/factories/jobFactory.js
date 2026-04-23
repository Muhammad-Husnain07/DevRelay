const { faker } = require('@faker-js/faker');
const Job = require('../../src/models/Job');

const jobFactory = {
  build: (workspaceId, overrides = {}) => ({
    workspaceId,
    name: faker.string.alphanumeric(10),
    definitionId: faker.string.uuid(),
    handler: 'log-message',
    payload: { message: faker.lorem.sentence() },
    status: 'waiting',
    priority: 'normal',
    maxAttempts: 3,
    currentAttempt: 0,
    ...overrides
  }),

  create: async (workspaceId, overrides = {}) => {
    const data = jobFactory.build(workspaceId, overrides);
    return Job.create(data);
  }
};

module.exports = jobFactory;