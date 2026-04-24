const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevRelay API',
      version: '1.0.0',
      description: 'Self-hosted backend infrastructure platform with webhook delivery, job queues, cron scheduling, and API gateway. Provides webhook endpoints, generic job processing, scheduled tasks, email templates, API gateway with rate limiting, and real-time alerting.',
      contact: {
        name: 'Muhammad Husnain',
        email: 'muhammad.husnain.dev@gmail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.devrelay.io',
        description: 'Production server'
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication and user management' },
      { name: 'Workspaces', description: 'Multi-tenant workspace operations' },
      { name: 'Webhooks', description: 'Webhook endpoints and deliveries' },
      { name: 'Events', description: 'Inbound webhook events' },
      { name: 'Jobs', description: 'Generic job queue processing' },
      { name: 'Scheduler', description: 'Cron job scheduling' },
      { name: 'Email', description: 'Email templates and queue' },
      { name: 'Gateway', description: 'API gateway and proxying' },
      { name: 'Metrics', description: 'Real-time metrics and statistics' },
      { name: 'Alerts', description: 'Alert rules and history' }
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
          name: 'X-API-Key',
          description: 'API key authentication'
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
        },
        WebhookEndpoint: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
            events: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
            timeoutMs: { type: 'number' }
          }
        },
        Job: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['waiting', 'processing', 'completed', 'failed'] },
            handler: { type: 'string' },
            result: { type: 'object' }
          }
        },
        ScheduledJob: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            cronExpression: { type: 'string' },
            isActive: { type: 'boolean' }
          }
        },
        GatewayRoute: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            path: { type: 'string' },
            upstream: { type: 'object' },
            isActive: { type: 'boolean' }
          }
        },
        AlertRule: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            condition: { type: 'object' },
            severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
            isActive: { type: 'boolean' }
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
  try {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'DevRelay API Docs'
    }));

    app.get('/api/docs.json', (req, res) => {
      res.json(specs);
    });
    
    console.log('[Swagger] API docs available at /api/docs');
  } catch (err) {
    console.error('[Swagger] Setup failed:', err.message);
  }
}

module.exports = { setupSwagger, specs };