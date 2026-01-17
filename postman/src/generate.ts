/**
 * Postman Collection Generator
 * Generates a complete Postman collection from TypeScript service definitions
 *
 * Usage: npx tsx src/generate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { allServices } from './services/index.js';
import type {
  PostmanCollection,
  PostmanFolder,
  PostmanVariable,
  ServiceDocumentation,
} from './types/postman.types.js';
import { endpointToPostmanItem, generateTestScript } from './utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collection metadata
const COLLECTION_INFO = {
  name: 'Giga Platform API',
  description: `
# Giga Platform API Collection

This comprehensive Postman collection provides complete documentation for all Giga Platform APIs.

## Services Included:
- **Authentication & User Management** - User profiles, roles, role applications
- **Hotel Discovery & Management** - Search hotels, manage listings, favorites
- **Booking Management** - Create, modify, cancel hotel bookings
- **Payment & Wallet** - Payments, wallet operations, vendor payouts
- **Supabase Edge Functions** - Direct serverless function endpoints

## Authentication
Most endpoints require authentication via:
- \`Authorization: Bearer {{supabase_auth_token}}\`
- \`apikey: {{supabase_anon_key}}\`

## Getting Started
1. Import this collection into Postman
2. Import the environment file (Production or Local)
3. Set your \`supabase_auth_token\` after logging in
4. Start testing endpoints!

## Documentation Format
Each endpoint includes:
- **Description** - What the endpoint does
- **Request Body** - Expected parameters with examples
- **Response Examples** - Success and error responses
- **Edge Cases** - How the API handles unusual inputs
- **Notes** - Important implementation details

Generated on: ${new Date().toISOString()}
  `,
  schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  version: '2.0.0',
};

// Collection-level variables
const COLLECTION_VARIABLES: PostmanVariable[] = [
  {
    key: 'base_url',
    value: 'https://nkrqcigvcakqicutkpfd.supabase.co/functions/v1',
    description: 'Supabase Functions base URL',
  },
  {
    key: 'supabase_anon_key',
    value: '',
    description: 'Supabase anonymous key',
  },
  {
    key: 'supabase_auth_token',
    value: '',
    description: 'User authentication token (JWT)',
  },
];

/**
 * Convert a service documentation to a Postman folder
 */
function serviceToFolder(service: ServiceDocumentation): PostmanFolder {
  const items = service.endpoints.map(endpoint => {
    const item = endpointToPostmanItem(endpoint);

    // Add test script
    item.event = [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: generateTestScript(endpoint),
        },
      },
    ];

    return item;
  });

  return {
    name: service.name,
    description: `${service.description}\n\nVersion: ${service.version}`,
    item: items,
  };
}

/**
 * Generate the complete Postman collection
 */
function generateCollection(): PostmanCollection {
  console.log('🔧 Generating Postman collection...\n');

  const folders: PostmanFolder[] = [];

  for (const service of allServices) {
    console.log(`  📁 Processing: ${service.name} (${service.endpoints.length} endpoints)`);
    folders.push(serviceToFolder(service));
  }

  const collection: PostmanCollection = {
    info: {
      _postman_id: `giga-api-${Date.now()}`,
      name: COLLECTION_INFO.name,
      description: COLLECTION_INFO.description,
      schema: COLLECTION_INFO.schema,
      version: COLLECTION_INFO.version,
    },
    item: folders,
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{supabase_auth_token}}',
          type: 'string',
        },
      ],
    },
    variable: COLLECTION_VARIABLES,
    event: [
      {
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            '// Global prerequest script',
            'console.log("Request to:", pm.request.url.toString());',
          ],
        },
      },
    ],
  };

  return collection;
}

/**
 * Generate statistics about the collection
 */
function generateStats(collection: PostmanCollection): void {
  let totalEndpoints = 0;
  let totalExamples = 0;
  let totalEdgeCases = 0;

  for (const folder of collection.item as PostmanFolder[]) {
    if ('item' in folder) {
      totalEndpoints += folder.item.length;
    }
  }

  for (const service of allServices) {
    for (const endpoint of service.endpoints) {
      totalExamples += endpoint.examples.length;
      totalEdgeCases += endpoint.edgeCases.length;
    }
  }

  console.log('\n📊 Collection Statistics:');
  console.log(`   Services: ${allServices.length}`);
  console.log(`   Endpoints: ${totalEndpoints}`);
  console.log(`   Examples: ${totalExamples}`);
  console.log(`   Edge Cases: ${totalEdgeCases}`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Giga Platform - Postman Collection Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Generate collection
    const collection = generateCollection();

    // Output path
    const outputPath = path.join(__dirname, '..', 'Giga-API-Collection.postman_collection.json');

    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf8');

    console.log(`\n✅ Collection saved to: ${outputPath}`);

    // Generate stats
    generateStats(collection);

    // Generate changelog entry
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    const changelogEntry = `
## [${new Date().toISOString().split('T')[0]}] - Auto-generated

### Updated
- Regenerated collection from TypeScript definitions
- Services: ${allServices.map(s => s.name).join(', ')}
`;

    // Append to changelog if exists
    if (fs.existsSync(changelogPath)) {
      const existingChangelog = fs.readFileSync(changelogPath, 'utf8');
      if (!existingChangelog.includes(changelogEntry.split('\n')[1])) {
        fs.writeFileSync(changelogPath, changelogEntry + '\n' + existingChangelog, 'utf8');
        console.log('📝 Updated CHANGELOG.md');
      }
    }

    console.log('\n✨ Generation complete!\n');
  } catch (error) {
    console.error('❌ Error generating collection:', error);
    process.exit(1);
  }
}

main();
