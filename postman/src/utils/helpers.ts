/**
 * Helper utilities for Postman collection generation
 */

import type {
  EndpointDocumentation,
  PostmanBody,
  PostmanFolder,
  PostmanHeader,
  PostmanItem,
  PostmanRequest,
  PostmanResponse,
  PostmanUrl,
  ServiceDocumentation,
} from '../types/postman.types.js';

// Standard headers for authenticated requests
export const AUTH_HEADERS: PostmanHeader[] = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'apikey', value: '{{supabase_anon_key}}' },
  { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
];

// Headers for GET requests (no Content-Type needed)
export const GET_HEADERS: PostmanHeader[] = [
  { key: 'apikey', value: '{{supabase_anon_key}}' },
  { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
];

// Headers for public endpoints (no auth)
export const PUBLIC_HEADERS: PostmanHeader[] = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'apikey', value: '{{supabase_anon_key}}' },
];

// Headers for public GET requests
export const PUBLIC_GET_HEADERS: PostmanHeader[] = [
  { key: 'apikey', value: '{{supabase_anon_key}}' },
];

/**
 * Creates a Postman URL object from an endpoint path
 */
export function createUrl(
  path: string,
  queryParams?: Array<{ key: string; value: string; description?: string }>
): PostmanUrl {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const pathParts = cleanPath.split('/').filter(Boolean);

  const url: PostmanUrl = {
    raw: queryParams
      ? `{{base_url}}/${cleanPath}?${queryParams.map(p => `${p.key}=${p.value}`).join('&')}`
      : `{{base_url}}/${cleanPath}`,
    host: ['{{base_url}}'],
    path: pathParts,
  };

  if (queryParams && queryParams.length > 0) {
    url.query = queryParams.map(p => ({
      key: p.key,
      value: p.value,
      description: p.description,
    }));
  }

  return url;
}

/**
 * Creates a Postman request body
 */
export function createBody(data: Record<string, unknown>): PostmanBody {
  return {
    mode: 'raw',
    raw: JSON.stringify(data, null, 2),
    options: {
      raw: {
        language: 'json',
      },
    },
  };
}

/**
 * Creates a full Postman request object
 */
export function createRequest(endpoint: EndpointDocumentation): PostmanRequest {
  const isGet = endpoint.method === 'GET';
  const headers = endpoint.requiresAuth
    ? isGet
      ? GET_HEADERS
      : AUTH_HEADERS
    : isGet
      ? PUBLIC_GET_HEADERS
      : PUBLIC_HEADERS;

  // Add custom headers if specified
  const allHeaders = endpoint.headers ? [...headers, ...endpoint.headers] : headers;

  // Build query params
  const queryParams = endpoint.queryParams?.map(p => ({
    key: p.name,
    value: p.example,
    description: `${p.required ? '(Required) ' : '(Optional) '}${p.description}`,
  }));

  const request: PostmanRequest = {
    method: endpoint.method,
    header: allHeaders,
    url: createUrl(endpoint.path, queryParams),
    description: buildDescription(endpoint),
  };

  // Add body for non-GET requests
  if (!isGet && endpoint.requestBody) {
    request.body = createBody(endpoint.requestBody.example);
  }

  return request;
}

/**
 * Builds a comprehensive description for an endpoint
 */
function buildDescription(endpoint: EndpointDocumentation): string {
  const parts: string[] = [];

  // Main description
  parts.push(endpoint.description);
  parts.push('');

  // Authentication
  parts.push(`**Authentication:** ${endpoint.requiresAuth ? 'Required' : 'Not Required'}`);
  parts.push('');

  // Path parameters
  if (endpoint.pathParams && endpoint.pathParams.length > 0) {
    parts.push('**Path Parameters:**');
    endpoint.pathParams.forEach(p => {
      parts.push(`- \`${p.name}\`: ${p.description} (Example: ${p.example})`);
    });
    parts.push('');
  }

  // Query parameters
  if (endpoint.queryParams && endpoint.queryParams.length > 0) {
    parts.push('**Query Parameters:**');
    endpoint.queryParams.forEach(p => {
      const required = p.required ? '(Required)' : '(Optional)';
      parts.push(
        `- \`${p.name}\` ${required}: ${p.description} (Type: ${p.type}, Example: ${p.example})`
      );
    });
    parts.push('');
  }

  // Request body
  if (endpoint.requestBody) {
    parts.push('**Request Body:**');
    parts.push(endpoint.requestBody.description);
    parts.push('');
  }

  // Edge cases
  if (endpoint.edgeCases && endpoint.edgeCases.length > 0) {
    parts.push('**Edge Cases:**');
    endpoint.edgeCases.forEach(ec => {
      parts.push(`- **${ec.name}:** ${ec.scenario} → ${ec.expectedBehavior}`);
    });
    parts.push('');
  }

  // Notes
  if (endpoint.notes && endpoint.notes.length > 0) {
    parts.push('**Notes:**');
    endpoint.notes.forEach(note => {
      parts.push(`- ${note}`);
    });
  }

  return parts.join('\n');
}

/**
 * Creates example responses for an endpoint
 */
export function createResponses(endpoint: EndpointDocumentation): PostmanResponse[] {
  const responses: PostmanResponse[] = [];

  // Add standard response examples
  endpoint.responses.forEach(resp => {
    responses.push({
      name: `${resp.status} - ${resp.description}`,
      originalRequest: createRequest(endpoint),
      status: resp.description,
      code: resp.status,
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: JSON.stringify(resp.body, null, 2),
      _postman_previewlanguage: 'json',
    });
  });

  // Add example case responses
  endpoint.examples.forEach(example => {
    responses.push({
      name: example.name,
      originalRequest: {
        ...createRequest(endpoint),
        body: endpoint.requestBody ? createBody(example.request) : undefined,
      },
      status: getStatusText(example.response.status),
      code: example.response.status,
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: JSON.stringify(example.response.body, null, 2),
      _postman_previewlanguage: 'json',
    });
  });

  // Add edge case responses
  endpoint.edgeCases.forEach(edgeCase => {
    if (edgeCase.response) {
      responses.push({
        name: `Edge Case: ${edgeCase.name}`,
        originalRequest: edgeCase.request
          ? {
              ...createRequest(endpoint),
              body: createBody(edgeCase.request),
            }
          : createRequest(endpoint),
        status: getStatusText(edgeCase.response.status),
        code: edgeCase.response.status,
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: JSON.stringify(edgeCase.response.body, null, 2),
        _postman_previewlanguage: 'json',
      });
    }
  });

  return responses;
}

/**
 * Gets HTTP status text from status code
 */
function getStatusText(code: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return statusTexts[code] || 'Unknown';
}

/**
 * Converts an endpoint to a Postman item
 */
export function endpointToPostmanItem(endpoint: EndpointDocumentation): PostmanItem {
  return {
    name: endpoint.name,
    request: createRequest(endpoint),
    response: createResponses(endpoint),
    description: endpoint.description,
  };
}

/**
 * Converts a service to a Postman folder
 */
export function serviceToPostmanFolder(service: ServiceDocumentation): PostmanFolder {
  return {
    name: service.name,
    description: `${service.description}\n\nBase URL: ${service.baseUrl}\nVersion: ${service.version}`,
    item: service.endpoints.map(endpointToPostmanItem),
  };
}

/**
 * Generates test scripts for an endpoint
 */
export function generateTestScript(endpoint: EndpointDocumentation): string[] {
  const scripts: string[] = [
    '// Auto-generated tests',
    `pm.test("Status code is expected", function () {`,
    `    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);`,
    `});`,
    '',
    'pm.test("Response time is acceptable", function () {',
    '    pm.expect(pm.response.responseTime).to.be.below(2000);',
    '});',
    '',
    'pm.test("Response has correct content type", function () {',
    '    pm.response.to.have.header("Content-Type");',
    '    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");',
    '});',
  ];

  // Add response structure tests
  if (endpoint.responses.length > 0) {
    const successResponse = endpoint.responses.find(r => r.status >= 200 && r.status < 300);
    if (successResponse && successResponse.body) {
      scripts.push('');
      scripts.push('pm.test("Response has expected structure", function () {');
      scripts.push('    var jsonData = pm.response.json();');
      scripts.push('    pm.expect(jsonData).to.have.property("success");');
      scripts.push('});');
    }
  }

  return scripts;
}
