/**
 * Postman Collection Type Definitions
 * These types ensure type-safe generation of Postman collections
 */

export interface PostmanVariable {
  key: string;
  value: string;
  description?: string;
}

export interface PostmanHeader {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanQueryParam {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanUrl {
  raw: string;
  host: string[];
  path: string[];
  query?: PostmanQueryParam[];
  variable?: PostmanVariable[];
}

export interface PostmanBody {
  mode: 'raw' | 'formdata' | 'urlencoded' | 'file' | 'graphql';
  raw?: string;
  options?: {
    raw?: {
      language: 'json' | 'xml' | 'text' | 'javascript';
    };
  };
}

export interface PostmanRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  header: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl;
  description?: string;
  auth?: {
    type: string;
    bearer?: Array<{ key: string; value: string; type: string }>;
  };
}

export interface PostmanResponse {
  name: string;
  originalRequest: PostmanRequest;
  status: string;
  code: number;
  header: PostmanHeader[];
  body: string;
  _postman_previewlanguage?: string;
}

export interface PostmanEvent {
  listen: 'prerequest' | 'test';
  script: {
    type: 'text/javascript';
    exec: string[];
  };
}

export interface PostmanItem {
  name: string;
  request: PostmanRequest;
  response?: PostmanResponse[];
  event?: PostmanEvent[];
  description?: string;
}

export interface PostmanFolder {
  name: string;
  description?: string;
  item: (PostmanItem | PostmanFolder)[];
  event?: PostmanEvent[];
  auth?: {
    type: string;
    bearer?: Array<{ key: string; value: string; type: string }>;
  };
}

export interface PostmanCollection {
  info: {
    _postman_id?: string;
    name: string;
    description?: string;
    schema: string;
    version?: string;
  };
  item: (PostmanItem | PostmanFolder)[];
  auth?: {
    type: string;
    bearer?: Array<{ key: string; value: string; type: string }>;
  };
  variable?: PostmanVariable[];
  event?: PostmanEvent[];
}

// Extended types for our documentation system
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ExampleCase {
  name: string;
  description: string;
  request: Record<string, unknown>;
  response: {
    status: number;
    body: Record<string, unknown>;
  };
}

export interface EdgeCase {
  name: string;
  description: string;
  scenario: string;
  expectedBehavior: string;
  request?: Record<string, unknown>;
  response?: {
    status: number;
    body: Record<string, unknown>;
  };
}

export interface EndpointDocumentation {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  requiresAuth: boolean;
  headers?: PostmanHeader[];
  pathParams?: Array<{
    name: string;
    description: string;
    example: string;
  }>;
  queryParams?: Array<{
    name: string;
    description: string;
    required: boolean;
    example: string;
    type: 'string' | 'number' | 'boolean' | 'array';
  }>;
  requestBody?: {
    description: string;
    contentType: 'application/json' | 'multipart/form-data';
    schema: Record<string, unknown>;
    example: Record<string, unknown>;
  };
  responses: Array<{
    status: number;
    description: string;
    body: Record<string, unknown>;
  }>;
  examples: ExampleCase[];
  edgeCases: EdgeCase[];
  tags?: string[];
  notes?: string[];
}

export interface ServiceDocumentation {
  name: string;
  description: string;
  baseUrl: string;
  version: string;
  endpoints: EndpointDocumentation[];
}
