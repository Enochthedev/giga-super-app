#!/usr/bin/env node

/**
 * SQL Linting Script
 *
 * This script provides SQL linting and formatting validation for:
 * - Supabase migrations
 * - SQL query files
 * - Database schema definitions
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';

const SQL_STYLE_RULES = {
  // Keywords should be uppercase
  keywords: {
    pattern:
      /\b(select|from|where|join|inner|left|right|outer|on|group|order|by|having|limit|offset|insert|into|values|update|set|delete|create|table|alter|drop|index|constraint|primary|key|foreign|references|not|null|default|unique|check|cascade|restrict)\b/gi,
    rule: 'SQL keywords should be uppercase',
    severity: 'warning',
  },

  // Table and column names should be snake_case
  naming: {
    pattern: /CREATE\s+TABLE\s+([A-Z][a-zA-Z]*)/i,
    rule: 'Table names should use snake_case',
    severity: 'warning',
  },

  // Proper indentation
  indentation: {
    pattern: /^\s{1,3}[A-Z]/m,
    rule: 'Use consistent indentation (2 or 4 spaces)',
    severity: 'info',
  },

  // No trailing whitespace
  trailingWhitespace: {
    pattern: /\s+$/m,
    rule: 'Remove trailing whitespace',
    severity: 'info',
  },

  // Semicolon at end of statements
  semicolon: {
    pattern: /[^;]\s*$/m,
    rule: 'SQL statements should end with semicolon',
    severity: 'warning',
  },
};

const SQL_BEST_PRACTICES = [
  {
    name: 'Use explicit column names in SELECT',
    pattern: /SELECT\s+\*/i,
    message: 'Avoid SELECT *, specify column names explicitly',
    severity: 'warning',
  },
  {
    name: 'Use table aliases for readability',
    pattern: /FROM\s+\w+\s+JOIN\s+\w+\s+ON/i,
    message: 'Consider using table aliases for complex joins',
    severity: 'info',
  },
  {
    name: 'Avoid functions in WHERE clauses',
    pattern: /WHERE\s+\w+\([^)]*\)\s*=/i,
    message: 'Functions in WHERE clauses can prevent index usage',
    severity: 'warning',
  },
  {
    name: 'Use parameterized queries',
    pattern: /WHERE\s+\w+\s*=\s*['"][^'"]*['"]/i,
    message: 'Consider using parameterized queries to prevent SQL injection',
    severity: 'warning',
  },
  {
    name: 'Proper NULL handling',
    pattern: /=\s*NULL|!=\s*NULL/i,
    message: 'Use IS NULL or IS NOT NULL instead of = NULL',
    severity: 'error',
  },
];

const POSTGRESQL_SPECIFIC = [
  {
    name: 'Use TIMESTAMPTZ for timestamps',
    pattern: /TIMESTAMP(?!\s+WITH\s+TIME\s+ZONE|\s*TZ)/i,
    message: 'Use TIMESTAMPTZ instead of TIMESTAMP for timezone awareness',
    severity: 'warning',
  },
  {
    name: 'Use UUID for primary keys',
    pattern: /PRIMARY\s+KEY.*SERIAL/i,
    message: 'Consider using UUID instead of SERIAL for primary keys',
    severity: 'info',
  },
  {
    name: 'Enable RLS on user tables',
    pattern: /CREATE\s+TABLE.*user/i,
    message: 'Remember to enable Row Level Security on user-related tables',
    severity: 'info',
  },
];

class SQLLinter {
  constructor() {
    this.issues = [];
    this.filesProcessed = 0;
  }

  addIssue(severity, rule, message, file, line = null) {
    this.issues.push({
      severity,
      rule,
      message,
      file,
      line,
      timestamp: new Date().toISOString(),
    });

    const lineInfo = line ? `:${line}` : '';
    const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';

    console.log(`${icon} ${severity.toUpperCase()}: ${message} (${file}${lineInfo})`);
  }

  async lintFile(filepath) {
    try {
      const content = await readFile(filepath, 'utf-8');
      const lines = content.split('\n');

      console.log(`\n📄 Linting ${filepath}...`);

      // Check style rules
      this.checkStyleRules(content, filepath);

      // Check best practices
      this.checkBestPractices(content, filepath);

      // Check PostgreSQL-specific rules
      this.checkPostgreSQLRules(content, filepath);

      // Line-by-line checks
      this.checkLineByLine(lines, filepath);

      this.filesProcessed++;
    } catch (error) {
      this.addIssue('error', 'file-access', `Could not read file: ${error.message}`, filepath);
    }
  }

  checkStyleRules(content, filepath) {
    for (const [ruleName, rule] of Object.entries(SQL_STYLE_RULES)) {
      if (rule.pattern.test(content)) {
        this.addIssue(rule.severity, ruleName, rule.rule, filepath);
      }
    }
  }

  checkBestPractices(content, filepath) {
    for (const practice of SQL_BEST_PRACTICES) {
      if (practice.pattern.test(content)) {
        this.addIssue(practice.severity, practice.name, practice.message, filepath);
      }
    }
  }

  checkPostgreSQLRules(content, filepath) {
    for (const rule of POSTGRESQL_SPECIFIC) {
      if (rule.pattern.test(content)) {
        this.addIssue(rule.severity, rule.name, rule.message, filepath);
      }
    }
  }

  checkLineByLine(lines, filepath) {
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // Check for common issues
      if (trimmedLine.length > 120) {
        this.addIssue('info', 'line-length', 'Line exceeds 120 characters', filepath, lineNum);
      }

      if (line.includes('\t')) {
        this.addIssue('warning', 'tabs', 'Use spaces instead of tabs', filepath, lineNum);
      }

      if (line.endsWith(' ')) {
        this.addIssue('info', 'trailing-space', 'Trailing whitespace', filepath, lineNum);
      }

      // Check for potential security issues
      if (trimmedLine.includes('--') && trimmedLine.includes('password')) {
        this.addIssue('warning', 'security', 'Potential password in comment', filepath, lineNum);
      }
    });
  }

  async lintDirectory(directory) {
    try {
      const files = await readdir(directory);

      for (const file of files) {
        if (extname(file) === '.sql') {
          await this.lintFile(join(directory, file));
        }
      }
    } catch (error) {
      this.addIssue(
        'error',
        'directory-access',
        `Could not read directory: ${error.message}`,
        directory
      );
    }
  }

  generateReport() {
    console.log('\n📊 SQL Linting Report');
    console.log('====================\n');

    const errorCount = this.issues.filter(i => i.severity === 'error').length;
    const warningCount = this.issues.filter(i => i.severity === 'warning').length;
    const infoCount = this.issues.filter(i => i.severity === 'info').length;

    console.log(`📁 Files processed: ${this.filesProcessed}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    console.log(`ℹ️  Info: ${infoCount}`);
    console.log(`📋 Total issues: ${this.issues.length}\n`);

    // Group issues by severity
    if (errorCount > 0) {
      console.log('🚨 ERRORS:');
      this.issues
        .filter(i => i.severity === 'error')
        .forEach(issue => {
          const lineInfo = issue.line ? `:${issue.line}` : '';
          console.log(`   • ${issue.message} (${issue.file}${lineInfo})`);
        });
      console.log('');
    }

    if (warningCount > 0) {
      console.log('⚠️  WARNINGS:');
      this.issues
        .filter(i => i.severity === 'warning')
        .forEach(issue => {
          const lineInfo = issue.line ? `:${issue.line}` : '';
          console.log(`   • ${issue.message} (${issue.file}${lineInfo})`);
        });
      console.log('');
    }

    // Summary by rule type
    const ruleStats = this.issues.reduce((acc, issue) => {
      acc[issue.rule] = (acc[issue.rule] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(ruleStats).length > 0) {
      console.log('📈 Issues by rule:');
      Object.entries(ruleStats)
        .sort(([, a], [, b]) => b - a)
        .forEach(([rule, count]) => {
          console.log(`   • ${rule}: ${count}`);
        });
      console.log('');
    }

    // Exit with appropriate code
    if (errorCount > 0) {
      console.log('❌ SQL linting failed due to errors');
      process.exit(1);
    } else if (warningCount > 0) {
      console.log('⚠️  SQL linting completed with warnings');
      process.exit(0);
    } else {
      console.log('✅ All SQL files passed linting');
      process.exit(0);
    }
  }
}

async function main() {
  console.log('🔧 SQL Linter for Giga Platform');
  console.log('===============================');

  const linter = new SQLLinter();

  // Get target files/directories from command line args
  const targets = process.argv.slice(2);

  if (targets.length === 0) {
    // Default targets
    console.log('No targets specified, linting default directories...\n');
    await linter.lintDirectory('supabase/migrations');

    // Check if there are any .sql files in other common locations
    const commonDirs = ['scripts', 'sql', 'database'];
    for (const dir of commonDirs) {
      try {
        await linter.lintDirectory(dir);
      } catch (error) {
        // Directory doesn't exist, skip silently
      }
    }
  } else {
    // Lint specified targets
    for (const target of targets) {
      if (target.endsWith('.sql')) {
        await linter.lintFile(target);
      } else {
        await linter.lintDirectory(target);
      }
    }
  }

  linter.generateReport();
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the linter
main().catch(error => {
  console.error('❌ SQL linting failed:', error);
  process.exit(1);
});
