#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * API Documentation Generator
 *
 * Scans Supabase functions and generates/updates Postman collection
 * Usage: deno run --allow-read --allow-write scripts/generate-api-docs.ts
 */

import { walk } from 'https://deno.land/std@0.208.0/fs/walk.ts';
import { parse } from 'https://deno.land/std@0.208.0/path/mod.ts';

interface FunctionInfo {
  name: string;
  path: string;
  method: string;
  description: string;
  requestBody?: Record<string, unknown>;
  module: string;
}

const MODULE_MAPPINGS: Record<string, string> = {
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

  'create-hotel': '3. Hotel Management (Vendor)',
  'update-hotel': '3. Hotel Management (Vendor)',
  'delete-hotel': '3. Hotel Management (Vendor)',
  'create-room-type': '3. Hotel Management (Vendor)',
  'get-hotel-analytics': '3. Hotel Management (Vendor)',

  'Calculate-booking-price': '4. Booking Management',
  'Create-booking': '4. Booking Management',
  'Get-user-bookings': '4. Booking Management',
  'get-booking-details': '4. Booking Management',
  'cancel-booking': '4. Booking Management',
  'update-booking-status': '4. Booking Management',
  'check-in-guest': '4. Booking Management',
  'Checkout-guest': '4. Booking Management',
  'validate-hotel-promo-code': '4. Booking Management',

  'create-hotel-review': '5. Reviews & Ratings',
  'respond-to-review': '5. Reviews & Ratings',

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

  'add-to-cart': '9. Shopping Cart (Marketplace)',
  'get-user-cart': '9. Shopping Cart (Marketplace)',
  'checkout-cart': '9. Shopping Cart (Marketplace)',
  'send-order-confirmation': '9. Shopping Cart (Marketplace)',
  'sync-products-to-algolia': '9. Shopping Cart (Marketplace)',

  'upload-file': '10. Media & Files',
  'process-image': '10. Media & Files',
};

async function scanFunctions(): Promise<FunctionInfo[]> {
  const functions: FunctionInfo[] = [];
  const functionsDir = '/Users/user/Dev/giga/supabase/functions';

  for await (const entry of walk(functionsDir, {
    maxDepth: 2,
    includeFiles: true,
    exts: ['ts'],
    match: [/index\.ts$/],
  })) {
    const pathInfo = parse(entry.path);
    const functionName = pathInfo.dir.split('/').pop() || '';

    if (!functionName) continue;

    // Read file to extract info
    const content = await Deno.readTextFile(entry.path);

    // Detect HTTP method
    let method = 'POST';
    if (
      content.includes("req.method === 'GET'") ||
      functionName.startsWith('get-') ||
      functionName.startsWith('Get-')
    ) {
      method = 'GET';
    }

    // Extract description from comments
    const descMatch = content.match(/\/\*\*\s*\n\s\*\s*(.+?)\n/);
    const description = descMatch ? descMatch[1] : `${functionName} endpoint`;

    functions.push({
      name: functionName,
      path: entry.path,
      method,
      description,
      module: MODULE_MAPPINGS[functionName] || 'Other',
    });
  }

  return functions;
}

async function generateMarkdownDocs(functions: FunctionInfo[]): Promise<void> {
  const grouped = new Map<string, FunctionInfo[]>();

  // Group by module
  for (const func of functions) {
    const existing = grouped.get(func.module) || [];
    existing.push(func);
    grouped.set(func.module, existing);
  }

  let markdown = '# Giga API Reference\n\n';
  markdown += `> Auto-generated on ${new Date().toISOString()}\n\n`;
  markdown += `**Total Endpoints:** ${functions.length}\n\n`;
  markdown += '## Table of Contents\n\n';

  // TOC
  for (const module of grouped.keys()) {
    const slug = module.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    markdown += `- [${module}](#${slug})\n`;
  }

  markdown += '\n---\n\n';

  // Details
  for (const [module, funcs] of grouped) {
    markdown += `## ${module}\n\n`;
    markdown += `**Endpoints:** ${funcs.length}\n\n`;

    for (const func of funcs) {
      markdown += `### ${func.name}\n\n`;
      markdown += `- **Method:** \`${func.method}\`\n`;
      markdown += `- **Endpoint:** \`{{base_url}}/${func.name}\`\n`;
      markdown += `- **Description:** ${func.description}\n`;
      markdown += `- **Auth Required:** Yes\n\n`;
    }
  }

  await Deno.writeTextFile('/Users/user/Dev/giga/postman/API_REFERENCE.md', markdown);

  console.log('✅ Generated API_REFERENCE.md');
}

async function validateCollection(): Promise<void> {
  const collectionPath = '/Users/user/Dev/giga/postman/Giga-API-Collection.postman_collection.json';

  try {
    const collection = JSON.parse(await Deno.readTextFile(collectionPath));
    const functions = await scanFunctions();

    // Count endpoints in collection
    let collectionEndpoints = 0;
    for (const folder of collection.item) {
      collectionEndpoints += folder.item?.length || 0;
    }

    console.log('\n📊 Documentation Status:');
    console.log(`   Functions in codebase: ${functions.length}`);
    console.log(`   Endpoints in Postman: ${collectionEndpoints}`);

    if (functions.length === collectionEndpoints) {
      console.log('   ✅ All functions documented!');
    } else if (functions.length > collectionEndpoints) {
      console.log(`   ⚠️  Missing ${functions.length - collectionEndpoints} endpoints in Postman`);
    } else {
      console.log(`   ⚠️  ${collectionEndpoints - functions.length} extra endpoints in Postman`);
    }
  } catch (error) {
    console.error('❌ Error validating collection:', error.message);
  }
}

async function main() {
  console.log('🔍 Scanning Supabase functions...\n');

  const functions = await scanFunctions();
  console.log(`Found ${functions.length} functions\n`);

  // Group by module
  const byModule = new Map<string, number>();
  for (const func of functions) {
    byModule.set(func.module, (byModule.get(func.module) || 0) + 1);
  }

  console.log('📦 Functions by module:');
  for (const [module, count] of byModule) {
    console.log(`   ${module}: ${count}`);
  }

  console.log('\n📝 Generating documentation...\n');
  await generateMarkdownDocs(functions);

  await validateCollection();

  console.log('\n✨ Done!\n');
}

if (import.meta.main) {
  main();
}
