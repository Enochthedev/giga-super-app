# Giga Platform - Postman Collection Generator

A TypeScript-based system for generating comprehensive Postman API
documentation.

## 🏗️ Architecture

```
postman/
├── src/                          # TypeScript source files
│   ├── types/
│   │   └── postman.types.ts      # Type definitions
│   ├── utils/
│   │   └── helpers.ts            # Helper functions
│   ├── services/                 # Per-service endpoint documentation
│   │   ├── index.ts              # Service exports
│   │   ├── user-profile.service.ts
│   │   ├── hotel.service.ts
│   │   ├── booking.service.ts
│   │   ├── payment.service.ts
│   │   └── supabase-functions.service.ts
│   ├── generate.ts               # Main generator script
│   ├── package.json
│   └── tsconfig.json
├── Giga-API-Collection.postman_collection.json  # Generated output
├── Giga-Environment.postman_environment.json
├── Giga-Environment-Local.postman_environment.json
└── README.md                     # This file
```

## 🚀 Quick Start

### Generate the Collection

```bash
cd postman/src
npm install
npm run generate
```

### Or with npx (no install needed)

```bash
cd postman/src
npx tsx src/generate.ts
```

## 📝 Adding New Endpoints

### 1. Find or Create Service File

Endpoints are organized by service. Find the appropriate file in `src/services/`
or create a new one.

### 2. Define Endpoint Documentation

Each endpoint follows this structure:

```typescript
{
  name: 'Endpoint Name',
  description: 'What this endpoint does',
  method: 'POST',
  path: '/endpoint-path',
  requiresAuth: true,

  // Optional query parameters (for GET requests)
  queryParams: [
    {
      name: 'paramName',
      description: 'Parameter description',
      required: true,
      example: 'value',
      type: 'string',
    },
  ],

  // Request body (for POST/PUT/PATCH)
  requestBody: {
    description: 'Body description',
    contentType: 'application/json',
    schema: { /* JSON Schema */ },
    example: { /* Example body */ },
  },

  // Response examples
  responses: [
    {
      status: 200,
      description: 'Success response',
      body: { /* Example response */ },
    },
    {
      status: 400,
      description: 'Error response',
      body: { success: false, error: { code: 'ERROR_CODE', message: 'Error message' } },
    },
  ],

  // Usage examples (generate multiple response examples)
  examples: [
    {
      name: 'Example Name',
      description: 'What this example demonstrates',
      request: { /* Request body */ },
      response: {
        status: 200,
        body: { /* Response body */ },
      },
    },
  ],

  // Edge cases (important for testing)
  edgeCases: [
    {
      name: 'Edge Case Name',
      description: 'What makes this case special',
      scenario: 'When this happens',
      expectedBehavior: 'API should do this',
      request: { /* Optional request */ },
      response: { /* Optional response */ },
    },
  ],

  // Additional notes
  notes: [
    'Important implementation detail',
    'Rate limiting information',
  ],
}
```

### 3. Export from index.ts

```typescript
// In src/services/index.ts
export { myNewService } from './my-new.service.js';

// Add to allServices array
export const allServices = [
  // ... existing services
  myNewService,
];
```

### 4. Regenerate Collection

```bash
npm run generate
```

## 📚 Documentation Standards

### Descriptions

- Start with a verb (Get, Create, Update, Delete)
- Explain what the endpoint does, not how
- Include authentication requirements

### Examples

- Cover the happy path
- Include variations (minimal vs. full request)
- Show different user types if applicable

### Edge Cases

Every endpoint should document:

- Invalid input handling
- Missing required fields
- Authentication/authorization failures
- Concurrent request scenarios
- Empty results
- Pagination edge cases

### Response Format

All responses should follow the standard format:

```json
{
  "success": true,
  "data": {
    /* Response data */
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {
      /* Optional details */
    }
  }
}
```

## 🔧 Type Definitions

### Key Types

```typescript
// Main documentation type
interface EndpointDocumentation {
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  requiresAuth: boolean;
  queryParams?: QueryParam[];
  requestBody?: RequestBody;
  responses: Response[];
  examples: ExampleCase[];
  edgeCases: EdgeCase[];
  notes?: string[];
}

// Service documentation type
interface ServiceDocumentation {
  name: string;
  description: string;
  baseUrl: string;
  version: string;
  endpoints: EndpointDocumentation[];
}
```

## 📂 Service Files

| File                            | Coverage                                            |
| ------------------------------- | --------------------------------------------------- |
| `user-profile.service.ts`       | User profiles, roles, role applications             |
| `hotel.service.ts`              | Hotel search, details, favorites, vendor management |
| `booking.service.ts`            | Booking lifecycle, price calculation, check-in/out  |
| `payment.service.ts`            | Payments, wallet, refunds, vendor payouts           |
| `supabase-functions.service.ts` | Edge functions (file upload, social, calls, taxi)   |

### Adding New Services

1. Create `src/services/my-service.service.ts`
2. Export a `ServiceDocumentation` object
3. Add to `src/services/index.ts`
4. Regenerate

## 🎯 Benefits of TypeScript Approach

### Type Safety

- Compile-time checking of documentation structure
- IDE autocomplete for endpoint properties
- Catch errors before generation

### Maintainability

- Single source of truth for API documentation
- Easy to update and extend
- Version control friendly

### Consistency

- Enforced documentation format
- Automatic header generation
- Standardized response examples

### Developer Experience

- Easy to review in PRs
- Searchable codebase
- No manual JSON editing

## 🔄 Workflow

1. **Developer adds/modifies endpoint**
2. **Updates corresponding `.service.ts` file**
3. **Runs `npm run generate`**
4. **Commits both `.ts` and `.json` files**
5. **Import updated collection in Postman**

## 📊 Generated Stats

The generator outputs statistics:

- Total endpoints documented
- Number of examples
- Number of edge cases documented

## 🤝 Contributing

1. Follow the documentation standards above
2. Include edge cases for all endpoints
3. Add meaningful examples
4. Run `npm run typecheck` before committing
5. Regenerate the collection

---

_Generated documentation is located at
`Giga-API-Collection.postman_collection.json`_
