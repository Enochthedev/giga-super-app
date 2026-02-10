#!/usr/bin/env tsx

/**
 * Comprehensive Foreign Key Validation Script
 *
 * This script validates ALL foreign key references across ALL service files
 * against the actual database schema to ensure they are correct.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Complete database foreign key constraints from Supabase
const DATABASE_FOREIGN_KEYS = new Map([
  // From the actual database query results
  [
    'ad_campaigns_advertiser_id_fkey',
    {
      table: 'ad_campaigns',
      column: 'advertiser_id',
      foreign_table: 'advertiser_profiles',
      foreign_column: 'user_id',
    },
  ],
  [
    'ecommerce_vendors_id_fkey',
    {
      table: 'ecommerce_vendors',
      column: 'id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'driver_profiles_user_id_fkey',
    {
      table: 'driver_profiles',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'host_profiles_user_id_fkey',
    {
      table: 'host_profiles',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'hotels_host_id_fkey',
    {
      table: 'hotels',
      column: 'host_id',
      foreign_table: 'host_profiles',
      foreign_column: 'user_id',
    },
  ],
  [
    'file_metadata_uploaded_by_fkey',
    {
      table: 'file_metadata',
      column: 'uploaded_by',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'ecommerce_orders_user_id_fkey',
    {
      table: 'ecommerce_orders',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'hotel_bookings_user_id_fkey',
    {
      table: 'hotel_bookings',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'hotel_reviews_user_id_fkey',
    {
      table: 'hotel_reviews',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'ecommerce_product_reviews_user_id_fkey',
    {
      table: 'ecommerce_product_reviews',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'product_reviews_user_id_fkey',
    {
      table: 'ecommerce_product_reviews',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],

  // Social service foreign keys
  [
    'user_connections_user_id_fkey',
    {
      table: 'user_connections',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'user_connections_connected_user_id_fkey',
    {
      table: 'user_connections',
      column: 'connected_user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'post_likes_user_id_fkey',
    {
      table: 'post_likes',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'post_comments_user_id_fkey',
    {
      table: 'post_comments',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'social_posts_user_id_fkey',
    {
      table: 'social_posts',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'stories_user_id_fkey',
    {
      table: 'stories',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'story_views_user_id_fkey',
    {
      table: 'story_views',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'comment_likes_comment_id_fkey',
    {
      table: 'comment_likes',
      column: 'comment_id',
      foreign_table: 'post_comments',
      foreign_column: 'id',
    },
  ],
  [
    'post_likes_post_id_fkey',
    { table: 'post_likes', column: 'post_id', foreign_table: 'social_posts', foreign_column: 'id' },
  ],
  [
    'post_comments_post_id_fkey',
    {
      table: 'post_comments',
      column: 'post_id',
      foreign_table: 'social_posts',
      foreign_column: 'id',
    },
  ],

  // Additional foreign keys from database
  [
    'nipost_officials_user_id_fkey',
    {
      table: 'nipost_officials',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'nipost_officials_user_id_fkey',
    {
      table: 'nipost_officials',
      column: 'user_id',
      foreign_table: 'user_profiles',
      foreign_column: 'id',
    },
  ],
  [
    'nipost_officials_office_id_fkey',
    {
      table: 'nipost_officials',
      column: 'office_id',
      foreign_table: 'nipost_offices',
      foreign_column: 'id',
    },
  ],
  [
    'nipost_officials_region_id_fkey',
    {
      table: 'nipost_officials',
      column: 'region_id',
      foreign_table: 'nipost_regions',
      foreign_column: 'id',
    },
  ],
  [
    'nipost_offices_region_id_fkey',
    {
      table: 'nipost_offices',
      column: 'region_id',
      foreign_table: 'nipost_regions',
      foreign_column: 'id',
    },
  ],
]);

interface ForeignKeyReference {
  file: string;
  line: number;
  reference: string;
  table: string;
  foreignKeyName: string;
}

const issues: string[] = [];
const foundReferences: ForeignKeyReference[] = [];

function extractForeignKeyReferences(filePath: string): ForeignKeyReference[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const references: ForeignKeyReference[] = [];

  lines.forEach((line, index) => {
    // Match foreign key patterns like: table!foreign_key_name(columns)
    const fkMatches = line.match(/(\w+)!(\w+)\(/g);
    if (fkMatches) {
      fkMatches.forEach(match => {
        const [table, fkName] = match.replace('(', '').split('!');
        references.push({
          file: filePath,
          line: index + 1,
          reference: match,
          table,
          foreignKeyName: fkName,
        });
      });
    }
  });

  return references;
}
function validateForeignKeyReference(ref: ForeignKeyReference): boolean {
  const dbConstraint = DATABASE_FOREIGN_KEYS.get(ref.foreignKeyName);

  if (!dbConstraint) {
    issues.push(
      `❌ ${ref.file}:${ref.line} - Foreign key '${ref.foreignKeyName}' does not exist in database`
    );
    return false;
  }

  // In Supabase syntax: foreign_table!constraint_name(columns)
  // So ref.table should match dbConstraint.foreign_table
  if (dbConstraint.foreign_table !== ref.table) {
    issues.push(
      `❌ ${ref.file}:${ref.line} - Foreign table mismatch: expected '${dbConstraint.foreign_table}', got '${ref.table}' for constraint '${ref.foreignKeyName}'`
    );
    return false;
  }

  return true;
}

function scanDirectory(dirPath: string): void {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.js'))) {
      const refs = extractForeignKeyReferences(fullPath);
      foundReferences.push(...refs);
    }
  }
}

function main() {
  console.log('🔍 Comprehensive Foreign Key Validation');
  console.log('========================================\n');

  // Scan all service directories
  const serviceDirs = [
    'admin-service/src',
    'social-service/src',
    'api-gateway/src',
    'search-service/src',
    'payment-queue-service/src',
    'taxi-realtime-service/src',
  ];

  serviceDirs.forEach(dir => {
    try {
      console.log(`📂 Scanning ${dir}...`);
      const fullPath = join(process.cwd(), dir);
      console.log(`   Full path: ${fullPath}`);
      scanDirectory(fullPath);
    } catch (error) {
      console.log(`⚠️  Directory ${dir} error: ${error}`);
    }
  });

  console.log(`\n📊 Found ${foundReferences.length} foreign key references across all files\n`);

  if (foundReferences.length === 0) {
    console.log('⚠️  No foreign key references found. This might indicate:');
    console.log(
      '   - Files are using generic patterns like !user_id instead of specific constraint names'
    );
    console.log('   - Foreign key references are in different format');
    console.log('   - No database queries with foreign key joins in the scanned files\n');
  }

  // Group references by file for better readability
  const referencesByFile = new Map<string, ForeignKeyReference[]>();
  foundReferences.forEach(ref => {
    if (!referencesByFile.has(ref.file)) {
      referencesByFile.set(ref.file, []);
    }
    referencesByFile.get(ref.file)!.push(ref);
  });

  // Validate each reference
  let validCount = 0;
  console.log('🔍 Validation Results:\n');

  referencesByFile.forEach((refs, file) => {
    console.log(`📄 ${file}:`);
    refs.forEach(ref => {
      if (validateForeignKeyReference(ref)) {
        validCount++;
        console.log(`   ✅ Line ${ref.line}: ${ref.reference}`);
      } else {
        console.log(`   ❌ Line ${ref.line}: ${ref.reference}`);
      }
    });
    console.log('');
  });

  console.log(`📈 Final Summary:`);
  console.log(`   Total references: ${foundReferences.length}`);
  console.log(`   Valid references: ${validCount}`);
  console.log(`   Invalid references: ${issues.length}`);

  if (issues.length > 0) {
    console.log(`\n❌ Issues that need fixing:`);
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log(`\n🔧 Next steps:`);
    console.log(`   1. Fix the invalid foreign key references listed above`);
    console.log(`   2. Re-run this script to verify all fixes`);
    console.log(`   3. Test the endpoints to ensure they work correctly`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All foreign key references are valid!`);
  }
}

if (require.main === module) {
  main();
}
