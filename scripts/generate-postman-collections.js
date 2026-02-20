#!/usr/bin/env node

/**
 * Generate Postman Collections from OpenAPI/Swagger specs
 *
 * This script reads OpenAPI/Swagger YAML files and generates comprehensive
 * Postman collections with examples, tests, and documentation.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Collection template
const createCollection = (name, description, baseUrl) => ({
  info: {
    name,
    description,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    version: '1.0.0',
  },
  variable: [
    { key: 'base_url', value: baseUrl, type: 'string' },
    { key: 'auth_token', value: '', type: 'string' },
    { key: 'user_id', value: '', type: 'string' },
  ],
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{auth_token}}', type: 'string' }],
  },
  item: [],
});

// Convert OpenAPI path to Postman request
const convertPathToRequest = (path, method, operation, servers) => {
  const request = {
    name: operation.summary || `${method.toUpperCase()} ${path}`,
    request: {
      method: method.toUpperCase(),
      header: [{ key: 'Content-Type', value: 'application/json' }],
      url: {
        raw: `{{base_url}}${path}`,
        host: ['{{base_url}}'],
        path: path.split('/').filter(p => p),
      },
      description: operation.description || operation.summary || '',
    },
    response: [],
  };

  // Add authentication if required
  if (operation.security && operation.security.length > 0) {
    // Auth is inherited from collection
  } else {
    request.request.auth = { type: 'noauth' };
  }

  // Add path parameters
  if (operation.parameters) {
    const pathParams = operation.parameters.filter(p => p.in === 'path');
    if (pathParams.length > 0) {
      request.request.url.variable = pathParams.map(p => ({
        key: p.name,
        value: p.example || p.schema?.example || `{${p.name}}`,
        description: p.description,
      }));
    }

    // Add query parameters
    const queryParams = operation.parameters.filter(p => p.in === 'query');
    if (queryParams.length > 0) {
      request.request.url.query = queryParams.map(p => ({
        key: p.name,
        value: p.example || p.schema?.example || p.schema?.default || '',
        description: p.description,
        disabled: !p.required,
      }));
    }
  }

  // Add request body
  if (operation.requestBody) {
    const content = operation.requestBody.content?.['application/json'];
    if (content) {
      const example =
        content.example || content.examples?.default?.value || generateExample(content.schema);
      request.request.body = {
        mode: 'raw',
        raw: JSON.stringify(example, null, 2),
        options: {
          raw: {
            language: 'json',
          },
        },
      };
    }
  }

  // Add test scripts
  request.event = [
    {
      listen: 'test',
      script: {
        exec: generateTestScript(operation),
        type: 'text/javascript',
      },
    },
  ];

  // Add response examples
  if (operation.responses) {
    Object.entries(operation.responses).forEach(([statusCode, response]) => {
      if (response.content?.['application/json']) {
        const example =
          response.content['application/json'].example ||
          response.content['application/json'].examples?.default?.value ||
          generateResponseExample(response.content['application/json'].schema, statusCode);

        request.response.push({
          name: `${statusCode} - ${response.description}`,
          originalRequest: { ...request.request },
          status: getStatusText(statusCode),
          code: parseInt(statusCode),
          _postman_previewlanguage: 'json',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          body: JSON.stringify(example, null, 2),
        });
      }
    });
  }

  return request;
};

// Generate example from schema
const generateExample = schema => {
  if (!schema) return {};

  if (schema.example) return schema.example;
  if (schema.examples && schema.examples.length > 0) return schema.examples[0];

  if (schema.type === 'object' && schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      if (prop.example !== undefined) {
        example[key] = prop.example;
      } else if (prop.default !== undefined) {
        example[key] = prop.default;
      } else {
        example[key] = generateExampleValue(prop);
      }
    });
    return example;
  }

  return generateExampleValue(schema);
};

// Generate example value based on type
const generateExampleValue = schema => {
  if (!schema) return null;

  switch (schema.type) {
    case 'string':
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
      if (schema.format === 'date') return '2026-01-01';
      if (schema.format === 'date-time') return '2026-01-01T00:00:00.000Z';
      if (schema.enum) return schema.enum[0];
      return 'string';
    case 'number':
    case 'integer':
      return schema.minimum || 0;
    case 'boolean':
      return true;
    case 'array':
      return schema.items ? [generateExampleValue(schema.items)] : [];
    case 'object':
      return generateExample(schema);
    default:
      return null;
  }
};

// Generate response example
const generateResponseExample = (schema, statusCode) => {
  const code = parseInt(statusCode);

  if (code >= 200 && code < 300) {
    return {
      success: true,
      data: generateExample(schema?.properties?.data || {}),
      metadata: {
        timestamp: '2026-02-19T10:00:00.000Z',
        request_id: 'req_123456',
        version: '1.0.0',
      },
    };
  } else {
    return {
      success: false,
      error: {
        code: getErrorCode(code),
        message: getErrorMessage(code),
      },
      metadata: {
        timestamp: '2026-02-19T10:00:00.000Z',
        request_id: 'req_123456',
        version: '1.0.0',
      },
    };
  }
};

// Generate test script
const generateTestScript = operation => {
  const tests = [
    `// Validate status code`,
    `pm.test('Status code is successful', function () {`,
    `    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);`,
    `});`,
    ``,
    `// Validate response structure`,
    `if (pm.response.code === 200 || pm.response.code === 201) {`,
    `    pm.test('Response has success field', function () {`,
    `        const jsonData = pm.response.json();`,
    `        pm.expect(jsonData).to.have.property('success');`,
    `    });`,
    `    `,
    `    pm.test('Response has metadata', function () {`,
    `        const jsonData = pm.response.json();`,
    `        pm.expect(jsonData).to.have.property('metadata');`,
    `        pm.expect(jsonData.metadata).to.have.property('timestamp');`,
    `        pm.expect(jsonData.metadata).to.have.property('request_id');`,
    `    });`,
    `}`,
    ``,
    `// Response time check`,
    `pm.test('Response time is acceptable', function () {`,
    `    pm.expect(pm.response.responseTime).to.be.below(5000);`,
    `});`,
  ];

  // Add token storage for login endpoints
  if (operation.operationId === 'loginUser' || operation.operationId === 'registerUser') {
    tests.push(
      ``,
      `// Store authentication token`,
      `if (pm.response.code === 200 || pm.response.code === 201) {`,
      `    const jsonData = pm.response.json();`,
      `    if (jsonData.access_token) {`,
      `        pm.collectionVariables.set('auth_token', jsonData.access_token);`,
      `        console.log('✅ Token stored successfully');`,
      `    }`,
      `    if (jsonData.user && jsonData.user.id) {`,
      `        pm.collectionVariables.set('user_id', jsonData.user.id);`,
      `    }`,
      `}`
    );
  }

  return tests;
};

// Helper functions
const getStatusText = code => {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  };
  return statusTexts[code] || 'Unknown';
};

const getErrorCode = statusCode => {
  const errorCodes = {
    400: 'VALIDATION_ERROR',
    401: 'AUTHENTICATION_REQUIRED',
    403: 'INSUFFICIENT_PERMISSIONS',
    404: 'RESOURCE_NOT_FOUND',
    409: 'RESOURCE_CONFLICT',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return errorCodes[statusCode] || 'UNKNOWN_ERROR';
};

const getErrorMessage = statusCode => {
  const errorMessages = {
    400: 'Invalid request parameters',
    401: 'Authentication required',
    403: 'Insufficient permissions',
    404: 'Resource not found',
    409: 'Resource already exists',
    429: 'Too many requests',
    500: 'Internal server error',
  };
  return errorMessages[statusCode] || 'An error occurred';
};

// Group requests by tags
const groupByTags = paths => {
  const groups = {};

  Object.entries(paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      if (method === 'parameters') return; // Skip parameter definitions

      const tags = operation.tags || ['Uncategorized'];
      tags.forEach(tag => {
        if (!groups[tag]) {
          groups[tag] = [];
        }
        groups[tag].push({ path, method, operation });
      });
    });
  });

  return groups;
};

// Main conversion function
const convertOpenAPIToPostman = (openApiSpec, outputPath) => {
  const spec = yaml.load(fs.readFileSync(openApiSpec, 'utf8'));

  const collection = createCollection(
    spec.info.title,
    spec.info.description,
    spec.servers?.[0]?.url || 'http://localhost:3000'
  );

  // Group paths by tags
  const groups = groupByTags(spec.paths);

  // Create folders for each tag
  Object.entries(groups).forEach(([tag, requests]) => {
    const folder = {
      name: tag,
      item: requests.map(({ path, method, operation }) =>
        convertPathToRequest(path, method, operation, spec.servers)
      ),
    };
    collection.item.push(folder);
  });

  // Write collection to file
  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
  console.log(`✅ Generated: ${outputPath}`);
};

// Generate collections from all specs
const main = () => {
  const specs = [
    {
      input: 'docs/api/openapi-spec.yaml',
      output: 'postman/Complete-API-Collection.json',
    },
    {
      input: 'docs/api/GIGA_DASHBOARD_SWAGGER.yaml',
      output: 'postman/Dashboard-API-Collection.json',
    },
  ];

  console.log('🚀 Generating Postman collections from OpenAPI specs...\n');

  specs.forEach(({ input, output }) => {
    if (fs.existsSync(input)) {
      try {
        convertOpenAPIToPostman(input, output);
      } catch (error) {
        console.error(`❌ Error processing ${input}:`, error.message);
      }
    } else {
      console.warn(`⚠️  Spec not found: ${input}`);
    }
  });

  console.log('\n✨ Collection generation complete!');
  console.log('\n📖 Import the collections into Postman to start testing.');
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { convertOpenAPIToPostman };
