const { faker } = require('@faker-js/faker');
const Workspace = require('../../src/models/Workspace');

const workspaceFactory = {
  build: (ownerId, overrides = {}) => ({
    name: faker.company.name(),
    slug: faker.string.alphanumeric(8).toLowerCase(),
    ownerId,
    members: [{ userId: ownerId, role: 'owner' }],
    ...overrides
  }),

  create: async (ownerId, overrides = {}) => {
    const data = workspaceFactory.build(ownerId, overrides);
    return Workspace.create(data);
  }
};

module.exports = workspaceFactory;