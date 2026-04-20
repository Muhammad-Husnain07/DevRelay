const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevRelay API',
      version: '1.0.0',
      description: 'Self-hosted backend infrastructure platform with webhook delivery, job queues, cron scheduling, and API gateway',
      contact: {
        name: 'Muhammad Husnain',
        email: 'muhammad.husnain.dev@gmail.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            plan: { type: 'string', enum: ['free', 'pro'] },
            avatar: { type: 'string' },
            githubUsername: { type: 'string' }
          }
        },
        Workspace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            plan: { type: 'string', enum: ['free', 'pro'] },
            settings: {
              type: 'object',
              properties: {
                webhookTimeout: { type: 'number' },
                maxRetries: { type: 'number' },
                rateLimit: { type: 'number' }
              }
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        ApiKeyRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            scopes: { type: 'array', items: { type: 'string' } },
            expiresInDays: { type: 'number' }
          }
        },
        ApiKeyResponse: {
          type: 'object',
          properties: {
            rawKey: { type: 'string' },
            key: { type: 'object' },
            message: { type: 'string' }
          }
        },
        ApiKeysListResponse: {
          type: 'object',
          properties: {
            keys: { type: 'array' }
          }
        },
        MessageResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    security: [{
      bearerAuth: [],
      apiKey: []
    }]
  },
  apis: [
    path.join(__dirname, '../api/*.js'),
    path.join(__dirname, '../controllers/*.js')
  ]
};

const specs = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DevRelay API Docs'
  }));

  app.get('/api/docs.json', (req, res) => {
    res.json(specs);
  });
}

module.exports = { setupSwagger, specs };