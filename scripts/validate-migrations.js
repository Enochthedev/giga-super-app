#!/usr/bin/env node

/**
 * Database Migration Validation Script
 *
 * This script validates Supabase migrations for:
 * - SQL syntax correctness
 * - Migration naming conventions
 * - RLS policy requirements
 * - Performance considerations
 * - Security best practices
 */

import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';

import { createClient } from '@supabase/supabase-js';

const MIGRATIONS_DIR = 'supabase/migrations';
const REQUIRED_PATTERNS = {
  // Migration file naming: timestamp_description.sql
  filename: /^\d{14}_[a-z0-9_]+\.sql$/,

  // Required for user-facing tables
  rlsPolicy: /ALTER TABLE .* ENABLE ROW LEVEL SECURITY/i,

  // Soft delete columns for GDPR compliance
  softDelete: /deleted_at\s+TIMESTAMPTZ/i,

  // Audit columns
  auditColumns: /(created_at|updated_at)\s+TIMESTAMPTZ/i,
};

const SECURITY_CHECKS = [
  {
    name: 'No hardcoded secrets',
    pattern: /(password|secret|key|token)\s*=\s*['"][^'"]+['"]/i,
    severity: 'error',
  },
  {
    name: 'No SQL injection vulnerabilities',
    pattern: /\$\{[^}]+\}/,
    severity: 'warning',
  },
  {
    name: 'Proper parameterization',
    pattern: /WHERE.*=.*\$\d+/,
    severity: 'info',
  },
];

const PERFORMANCE_CHECKS = [
  {
    name: 'Index creation should be CONCURRENT',
    pattern: /CREATE INDEX(?!\s+CONCURRENTLY)/i,
    severity: 'warning',
  },
  {
    name: 'Large table alterations should be careful',
    pattern: /ALTER TABLE.*ADD COLUMN.*NOT NULL(?!\s+DEFAULT)/i,
    severity: 'warning',
  },
];

class MigrationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  log(level, message, file = null) {
    const entry = { message, file, timestamp: new Date().toISOString() };

    switch (level) {
      case 'error':
        this.errors.push(entry);
        console.error(`❌ ERROR: ${message}${file ? ` (${file})` : ''}`);
        break;
      case 'warning':
        this.warnings.push(entry);
        console.warn(`⚠️  WARNING: ${message}${file ? ` (${file})` : ''}`);
        break;
      case 'info':
        this.info.push(entry);
        console.info(`ℹ️  INFO: ${message}${file ? ` (${file})` : ''}`);
        break;
      default:
        console.log(`${message}${file ? ` (${file})` : ''}`);
    }
  }

  async validateMigrationFiles() {
    console.log('🔍 Validating migration files...\n');

    try {
      const files = await readdir(MIGRATIONS_DIR);
      const migrationFiles = files.filter(file => file.endsWith('.sql'));

      if (migrationFiles.length === 0) {
        this.log('warning', 'No migration files found');
        return;
      }

      console.log(`Found ${migrationFiles.length} migration files\n`);

      for (const file of migrationFiles) {
        await this.validateSingleMigration(file);
      }
    } catch (error) {
      this.log('error', `Failed to read migrations directory: ${error.message}`);
    }
  }

  async validateSingleMigration(filename) {
    console.log(`📄 Validating ${filename}...`);

    // Check filename format
    if (!REQUIRED_PATTERNS.filename.test(filename)) {
      this.log(
        'error',
        'Migration filename must follow format: YYYYMMDDHHMMSS_description.sql',
        filename
      );
    }

    try {
      const filepath = join(MIGRATIONS_DIR, filename);
      const content = await readFile(filepath, 'utf-8');

      // Basic SQL syntax validation
      await this.validateSQLSyntax(content, filename);

      // Security checks
      await this.runSecurityChecks(content, filename);

      // Performance checks
      await this.runPerformanceChecks(content, filename);

      // RLS and compliance checks
      await this.validateComplianceRequirements(content, filename);

      console.log(`✅ ${filename} validation complete\n`);
    } catch (error) {
      this.log('error', `Failed to read migration file: ${error.message}`, filename);
    }
  }

  async validateSQLSyntax(content, filename) {
    // Basic SQL syntax checks
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Check for common SQL syntax issues
      if (line.includes(';;')) {
        this.log('warning', `Double semicolon found at line ${lineNum}`, filename);
      }

      if (line.match(/CREATE TABLE.*\(\s*\)/)) {
        this.log('error', `Empty table definition at line ${lineNum}`, filename);
      }

      // Check for proper transaction handling
      if (line.toUpperCase().includes('BEGIN') && !content.toUpperCase().includes('COMMIT')) {
        this.log('warning', 'BEGIN found without corresponding COMMIT', filename);
      }
    }
  }

  async runSecurityChecks(content, filename) {
    for (const check of SECURITY_CHECKS) {
      if (check.pattern.test(content)) {
        this.log(check.severity, check.name, filename);
      }
    }

    // Check for proper RLS policies on user tables
    if (
      content.toUpperCase().includes('CREATE TABLE') &&
      content.includes('user_id') &&
      !REQUIRED_PATTERNS.rlsPolicy.test(content)
    ) {
      this.log('warning', 'User table created without RLS policy', filename);
    }
  }

  async runPerformanceChecks(content, filename) {
    for (const check of PERFORMANCE_CHECKS) {
      if (check.pattern.test(content)) {
        this.log(check.severity, check.name, filename);
      }
    }

    // Check for missing indexes on foreign keys
    const foreignKeyMatches = content.match(/REFERENCES\s+(\w+)\s*\(/gi);
    if (foreignKeyMatches && !content.includes('CREATE INDEX')) {
      this.log('info', 'Consider adding indexes for foreign key columns', filename);
    }
  }

  async validateComplianceRequirements(content, filename) {
    // Check for GDPR compliance requirements
    if (
      content.toUpperCase().includes('CREATE TABLE') &&
      content.includes('user') &&
      !REQUIRED_PATTERNS.softDelete.test(content)
    ) {
      this.log(
        'warning',
        'User-related table missing soft delete columns for GDPR compliance',
        filename
      );
    }

    // Check for audit columns
    if (
      content.toUpperCase().includes('CREATE TABLE') &&
      !REQUIRED_PATTERNS.auditColumns.test(content)
    ) {
      this.log('info', 'Consider adding audit columns (created_at, updated_at)', filename);
    }

    // Check for proper data types
    if (content.includes('VARCHAR') && !content.includes('VARCHAR(')) {
      this.log('warning', 'VARCHAR without length specification found', filename);
    }
  }

  async testMigrationExecution() {
    console.log('🧪 Testing migration execution...\n');

    const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      this.log('warning', 'No database URL provided, skipping execution test');
      return;
    }

    try {
      // Test database connection
      const supabase = createClient(supabaseUrl, supabaseKey || 'dummy-key');

      // Simple connection test
      const { error } = await supabase.from('_test_connection').select('*').limit(1);

      if (error && !error.message.includes('relation "_test_connection" does not exist')) {
        this.log('error', `Database connection failed: ${error.message}`);
      } else {
        this.log('info', 'Database connection test passed');
      }
    } catch (error) {
      this.log('warning', `Could not test database connection: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 Migration Validation Report');
    console.log('================================\n');

    console.log(`✅ Total Info: ${this.info.length}`);
    console.log(`⚠️  Total Warnings: ${this.warnings.length}`);
    console.log(`❌ Total Errors: ${this.errors.length}\n`);

    if (this.errors.length > 0) {
      console.log('🚨 ERRORS FOUND:');
      this.errors.forEach(error => {
        console.log(`   • ${error.message}${error.file ? ` (${error.file})` : ''}`);
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`   • ${warning.message}${warning.file ? ` (${warning.file})` : ''}`);
      });
      console.log('');
    }

    // Exit with error code if there are errors
    if (this.errors.length > 0) {
      console.log('❌ Migration validation failed due to errors');
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log('⚠️  Migration validation completed with warnings');
      process.exit(0);
    } else {
      console.log('✅ All migrations validated successfully');
      process.exit(0);
    }
  }
}

// Main execution
async function main() {
  console.log('🔧 Database Migration Validator');
  console.log('===============================\n');

  const validator = new MigrationValidator();

  await validator.validateMigrationFiles();
  await validator.testMigrationExecution();
  validator.generateReport();
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the validator
main().catch(error => {
  console.error('❌ Migration validation failed:', error);
  process.exit(1);
});
