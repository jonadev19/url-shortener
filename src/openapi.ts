export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'URL Shortener API',
    version: '1.0.0',
    description: 'API for creating, managing, and resolving shortened URLs.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  paths: {
    '/api/shorten': {
      post: {
        summary: 'Create a short URL',
        operationId: 'shortenUrl',
        tags: ['Links'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://example.com/very/long/path',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Short URL created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    short_url: {
                      type: 'string',
                      example: 'http://localhost:3000/abc123',
                    },
                    original_url: {
                      type: 'string',
                      example: 'https://example.com/very/long/path',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Missing required field',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/links': {
      get: {
        summary: 'List all links',
        operationId: 'listLinks',
        tags: ['Links'],
        responses: {
          '200': {
            description: 'Array of all shortened links',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Link' },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/links/{short_code}': {
      delete: {
        summary: 'Delete a link',
        operationId: 'deleteLink',
        tags: ['Links'],
        parameters: [
          {
            name: 'short_code',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'abc123' },
            description: 'The short code of the link to delete',
          },
        ],
        responses: {
          '204': {
            description: 'Link deleted successfully',
          },
          '404': {
            description: 'Link not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/{id}': {
      get: {
        summary: 'Redirect to original URL',
        operationId: 'redirectToUrl',
        tags: ['Redirect'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'abc123' },
            description: 'The short code to resolve',
          },
        ],
        responses: {
          '302': {
            description: 'Redirects to the original URL',
          },
          '404': {
            description: 'Short code not found',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        operationId: 'healthCheck',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Server is running',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Link: {
        type: 'object',
        properties: {
          short_url: {
            type: 'string',
            example: 'http://localhost:3000/abc123',
          },
          original_url: {
            type: 'string',
            example: 'https://example.com/very/long/path',
          },
          clicks: {
            type: 'integer',
            example: 42,
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error',
          },
          message: {
            type: 'string',
            example: 'The url field is required.',
          },
        },
      },
    },
  },
};
