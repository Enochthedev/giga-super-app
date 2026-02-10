#!/usr/bin/env tsx
/**
 * Foreign Key Validation Script
 *
 * This script validates that all Supabase queries use correct foreign key constraint names.
 * Run this before deploying to catch foreign key syntax errors.
 *
 * Usage: npm run validate:fkeys
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ForeignKey {
  table_name: string;
  constraint_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

async function getAllForeignKeys(): Promise<ForeignKey[]> {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `,
  });

  if (error) {
    console.error('❌ Failed to fetch foreign keys:', error);
    process.exit(1);
  }

  return data as ForeignKey[];
}

function findQueryFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findQueryFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function extractForeignKeyReferences(
  content: string
): Array<{ line: number; text: string; table: string; fkey: string }> {
  const references: Array<{ line: number; text: string; table: string; fkey: string }> = [];
  const lines = content.split('\n');

  // Pattern: table_name!foreign_key_name
  const fkeyPattern = /(\w+)!(\w+)\(/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = fkeyPattern.exec(line)) !== null) {
      const [, table, fkey] = match;
      references.push({
        line: index + 1,
        text: line.trim(),
        table,
        fkey,
      });
    }
  });

  return references;
}

async function validateForeignKeys() {
  console.log('🔍 Fetching foreign keys from database...\n');
  const foreignKeys = await getAllForeignKeys();

  console.log(`✅ Found ${foreignKeys.length} foreign key constraints\n`);

  // Build a map of valid foreign key references
  const validFKeys = new Map<string, Set<string>>();
  foreignKeys.forEach(fk => {
    if (!validFKeys.has(fk.foreign_table_name)) {
      validFKeys.set(fk.foreign_table_name, new Set());
    }
    validFKeys.get(fk.foreign_table_name)!.add(fk.constraint_name);
  });

  console.log('🔍 Scanning code for foreign key references...\n');

  const serviceDirs = ['admin-service/src', 'social-service/src', 'api-gateway/src'];

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const serviceDir of serviceDirs) {
    if (!fs.existsSync(serviceDir)) continue;

    const files = findQueryFiles(serviceDir);
    console.log(`📁 Checking ${serviceDir} (${files.length} files)...`);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const references = extractForeignKeyReferences(content);

      if (references.length === 0) continue;

      let fileHasErrors = false;

      for (const ref of references) {
        const validConstraints = validFKeys.get(ref.table);

        if (!validConstraints) {
          if (!fileHasErrors) {
            console.log(`\n  ⚠️  ${path.relative(process.cwd(), file)}`);
            fileHasErrors = true;
          }
          console.log(`    Line ${ref.line}: Unknown table "${ref.table}"`);
          console.log(`      ${ref.text}`);
          totalWarnings++;
          continue;
        }

        if (!validConstraints.has(ref.fkey)) {
          if (!fileHasErrors) {
            console.log(`\n  ❌ ${path.relative(process.cwd(), file)}`);
            fileHasErrors = true;
          }
          console.log(`    Line ${ref.line}: Invalid foreign key "${ref.fkey}"`);
          console.log(`      ${ref.text}`);
          console.log(`      Valid options: ${Array.from(validConstraints).join(', ')}`);
          totalErrors++;
        }
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Validation Summary:`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   ⚠️  Warnings: ${totalWarnings}`);

  if (totalErrors > 0) {
    console.log('\n❌ Validation FAILED - Fix errors before deploying!\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Validation passed with warnings\n');
    process.exit(0);
  } else {
    console.log('\n✅ All foreign key references are valid!\n');
    process.exit(0);
  }
}

validateForeignKeys().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
