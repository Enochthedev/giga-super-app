#!/usr/bin/env node

/**
 * API Documentation Generator (Node.js version)
 *
 * Scans Supabase functions and AUTO-UPDATES Postman collection
 * Usage: node scripts/generate-api-docs.js
 */

const fs = require('fs');
const path = require('path');

const MODULE_MAPPINGS = {
  'get-current-profile': '1. Authentication & User Management',
  'get-user-profile': '1. Authentication & User Management',
  'update-user-profile': '1. Authentication & User Management',
  'upload-profile-picture': '1. Authentication & User Management',
  'add-user-address': '1. Authentication & User Management',
  'apply-for-role': '1. Authentication & User Management',
  'switch-role': '1. Authentication & User Management',
  'apply-vendor': '1. Authentication & User Management',
  'review-role-application': '8. Admin & Analytics',

  'Search-hotels': '2. Hotel Discovery & Search',
  'Get-hotel-details': '2. Hotel Discovery & Search',
  'check-room-availability': '2. Hotel Discovery & Search',
  'get-hotel-reviews': '2. Hotel Discovery & Search',
  'get-user-favorites': '2. Hotel Discovery & Search',
  'add-hotel-to-favorites': '2. Hotel Discovery & Search',
  'remove-hotel-from-favorites': '2. Hotel Discovery & Search',
  'get-recommended-hotels': '2. Hotel Discovery & Search',

  'create-hotel': '3. Hotel Management (Vendor)',
  'update-hotel': '3. Hotel Management (Vendor)',
  'delete-hotel': '3. Hotel Management (Vendor)',
  'create-room-type': '3. Hotel Management (Vendor)',
  'get-hotel-analytics': '3. Hotel Management (Vendor)',
  'update-room-type': '3. Hotel Management (Vendor)',
  'delete-room-type': '3. Hotel Management (Vendor)',
  'update-room-availability': '3. Hotel Management (Vendor)',
  'bulk-update-pricing': '3. Hotel Management (Vendor)',
  'create-hotel-promo-code': '3. Hotel Management (Vendor)',
  'calculate-dynamic-price': '3. Hotel Management (Vendor)',

  'Calculate-booking-price': '4. Booking Management',
  'Create-booking': '4. Booking Management',
  'Get-user-bookings': '4. Booking Management',
  'get-booking-details': '4. Booking Management',
  'cancel-booking': '4. Booking Management',
  'update-booking-status': '4. Booking Management',
  'check-in-guest': '4. Booking Management',
  'Checkout-guest': '4. Booking Management',
  'validate-hotel-promo-code': '4. Booking Management',
  'modify-booking': '4. Booking Management',
  'get-booking-calendar': '4. Booking Management',

  'create-hotel-review': '5. Reviews & Ratings',
  'respond-to-review': '5. Reviews & Ratings',
  'mark-review-helpful': '5. Reviews & Ratings',

  'Initialize-payment': '6. Payment & Wallet',
  'Verify-payment': '6. Payment & Wallet',
  'Topup-wallet': '6. Payment & Wallet',
  'Pay-with-wallet': '6. Payment & Wallet',
  'Get-vendor-balance': '6. Payment & Wallet',
  'Process-refund': '6. Payment & Wallet',
  'Create-payout-request': '6. Payment & Wallet',
  'Admin-process-payout': '6. Payment & Wallet',
  'Initialize-payment-with-mock': '6. Payment & Wallet',
  'create-payment-intent': '6. Payment & Wallet',
  'Release-escrow': '6. Payment & Wallet',
  'Mock-payment-webhook': 'Webhooks',
  'Paystack-webhook': 'Webhooks',
  'stripe-webhook': 'Webhooks',

  'send-notification': '7. Notifications',
  'queue-notification': '7. Notifications',
  'batch-queue-notifications': '7. Notifications',
  'process-notification-queue': '7. Notifications',
  'get-notification-history': '7. Notifications',
  'update-notification-preferences': '7. Notifications',
  'send-sms': '7. Notifications',

  'admin-dashboard-stats': '8. Admin & Analytics',
  'analyze-booking-risk': '8. Admin & Analytics',

  'add-to-cart': '9. Shopping Cart (Marketplace)',
  'get-user-cart': '9. Shopping Cart (Marketplace)',
  'checkout-cart': '9. Shopping Cart (Marketplace)',
  'send-order-confirmation': '9. Shopping Cart (Marketplace)',
  'sync-products-to-algolia': '9. Shopping Cart (Marketplace)',

  'upload-file': '10. Media & Files',
  'process-image': '10. Media & Files',
};

function scanFunctions() {
  const functionsDir = path.join(__dirname, '../supabase/functions');
  const functions = [];

  try {
    const dirs = fs.readdirSync(functionsDir);

    for (const dir of dirs) {
      const functionPath = path.join(functionsDir, dir);
      const stat = fs.statSync(functionPath);

      if (!stat.isDirectory()) continue;

      const indexPath = path.join(functionPath, 'index.ts');
      if (!fs.existsSync(indexPath)) continue;

      const content = fs.readFileSync(indexPath, 'utf-8');

      // Detect HTTP method
      let method = 'POST';
      if (
        content.includes("req.method === 'GET'") ||
        dir.startsWith('get-') ||
        dir.startsWith('Get-')
      ) {
        method = 'GET';
      }

      functions.push({
        name: dir,
        path: indexPath,
        method,
        module: MODULE_MAPPINGS[dir] || 'Other',
      });
    }
  } catch (error) {
    console.error('Error scanning functions:', error.message);
  }

  return functions;
}

function generateMarkdownDocs(functions) {
  const grouped = {};

  // Group by module
  for (const func of functions) {
    if (!grouped[func.module]) {
      grouped[func.module] = [];
    }
    grouped[func.module].push(func);
  }

  let markdown = '# Giga API Reference\n\n';
  markdown += `> Auto-generated on ${new Date().toISOString()}\n\n`;
  markdown += `**Total Endpoints:** ${functions.length}\n\n`;
  markdown += '## Table of Contents\n\n';

  // TOC
  for (const module of Object.keys(grouped)) {
    const slug = module.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    markdown += `- [${module}](#${slug})\n`;
  }

  markdown += '\n---\n\n';

  // Details
  for (const [module, funcs] of Object.entries(grouped)) {
    markdown += `## ${module}\n\n`;
    markdown += `**Endpoints:** ${funcs.length}\n\n`;

    for (const func of funcs) {
      markdown += `### ${func.name}\n\n`;
      markdown += `- **Method:** \`${func.method}\`\n`;
      markdown += `- **Endpoint:** \`{{base_url}}/${func.name}\`\n`;
      markdown += `- **Auth Required:** Yes\n\n`;
    }
  }

  const outputPath = path.join(__dirname, '../postman/API_REFERENCE.md');
  fs.writeFileSync(outputPath, markdown);

  console.log('✅ Generated API_REFERENCE.md');
}

function updatePostmanCollection(functions) {
  const collectionPath = path.join(
    __dirname,
    '../postman/Giga-API-Collection.postman_collection.json'
  );

  try {
    const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));
    let addedCount = 0;

    // Create map of existing items in collection
    const existingItems = new Set();

    function scanItems(items) {
      if (!items) return;
      for (const item of items) {
        if (item.item) {
          scanItems(item.item); // Recursive for folders
        } else {
          // It's a request
          // Extract function name from URL if possible
          if (item.request && item.request.url && item.request.url.path) {
            const pathParts = item.request.url.path;
            const funcName = pathParts[pathParts.length - 1];
            existingItems.add(funcName);
          }
        }
      }
    }

    scanItems(collection.item);

    // Find missing functions
    const missingFunctions = functions.filter(f => !existingItems.has(f.name));

    if (missingFunctions.length === 0) {
      console.log('✅ Postman collection is up to date.');
      return;
    }

    console.log(`⚠️  Found ${missingFunctions.length} missing functions. Adding them now...`);

    // Add missing functions to appropriate folders
    for (const func of missingFunctions) {
      const targetFolder = collection.item.find(folder => folder.name === func.module);

      if (targetFolder) {
        if (!targetFolder.item) targetFolder.item = [];

        targetFolder.item.push({
          name: func.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Title Case
          request: {
            method: func.method,
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
              },
              {
                key: 'apikey',
                value: '{{supabase_anon_key}}',
              },
              {
                key: 'Authorization',
                value: 'Bearer {{supabase_auth_token}}',
              },
            ],
            body: {
              mode: 'raw',
              raw: '{}', // Empty body placeholder
            },
            url: {
              raw: `{{base_url}}/${func.name}`,
              host: ['{{base_url}}'],
              path: [func.name],
            },
            description: `Auto-generated endpoint for ${func.name}`,
          },
        });
        addedCount++;
        console.log(`   + Added ${func.name} to ${func.module}`);
      } else {
        console.warn(
          `   ! Could not find folder for module: ${func.module}. Skipping ${func.name}`
        );
      }
    }

    // Save updated collection
    fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    console.log(`✅ Successfully added ${addedCount} endpoints to Postman collection.`);
    console.log(`👉 Please re-import 'Giga-API-Collection.postman_collection.json' into Postman.`);
  } catch (error) {
    console.error('❌ Error updating collection:', error.message);
  }
}

function main() {
  console.log('🔍 Scanning Supabase functions...\n');

  const functions = scanFunctions();
  console.log(`Found ${functions.length} functions\n`);

  // Group by module
  const byModule = {};
  for (const func of functions) {
    byModule[func.module] = (byModule[func.module] || 0) + 1;
  }

  console.log('📦 Functions by module:');
  for (const [module, count] of Object.entries(byModule)) {
    console.log(`   ${module}: ${count}`);
  }

  console.log('\n📝 Generating documentation...\n');
  generateMarkdownDocs(functions);

  console.log('\n🔄 Updating Postman Collection...\n');
  updatePostmanCollection(functions);

  console.log('\n✨ Done!\n');
}

main();
