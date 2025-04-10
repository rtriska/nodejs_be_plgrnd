import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Node.js Backend API',
    version: '1.0.0',
    description: 'This is a REST API application made with Express and documented with Swagger',
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
    contact: {
      name: 'API Support',
      url: 'https://example.com',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    schemas: {
      Article: {
        type: 'object',
        required: ['title'],
        properties: {
          id: {
            type: 'integer',
            description: 'The auto-generated id of the article',
          },
          title: {
            type: 'string',
            description: 'The title of the article',
          },
          shortDescription: {
            type: 'string',
            description: 'A short description of the article',
          },
          description: {
            type: 'string',
            description: 'The full description of the article',
          },
          image: {
            type: 'string',
            description: 'Base64 encoded image data for the article',
          },
          imageAlt: {
            type: 'string',
            description: 'Alternative text for the image',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'The date the article was created',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'The date the article was last updated',
          },
        },
        example: {
          id: 1,
          title: 'Sample Article',
          shortDescription: 'This is a sample article',
          description: 'This is the full description of the sample article.',
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          imageAlt: 'Sample image for the article',
          createdAt: '2025-04-03T04:30:00.000Z',
          updatedAt: '2025-04-03T04:30:00.000Z',
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
          },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
