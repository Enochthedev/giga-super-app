#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that all required environment variables are set and properly formatted
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Required environment variables by category
const requiredEnvVars = {
  supabase: {
    SUPABASE_URL: {
      required: true,
      pattern: /^https:\/\/[a-z0-9]+\.supabase\.co$/,
      description: 'Supabase project URL',
    },
    SUPABASE_ANON_KEY: {
      required: true,
      pattern: /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
      description: 'Supabase anonymous key (JWT format)',
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      required: true,
      pattern: /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
      description: 'Supabase service role key (JWT format)',
    },
  },
  database: {
    DATABASE_URL: {
      required: true,
      pattern: /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+$/,
      description: 'PostgreSQL connection string',
    },
  },
  payment: {
    PAYSTACK_SECRET_KEY: {
      required: false,
      pattern: /^sk_[a-z]+_[a-zA-Z0-9]+$/,
      description: 'Paystack secret key',
    },
    STRIPE_SECRET_KEY: {
      required: false,
      pattern: /^sk_[a-z]+_[a-zA-Z0-9]+$/,
      description: 'Stripe secret key',
    },
  },
  communication: {
    AGORA_APP_ID: {
      required: false,
      pattern: /^[a-f0-9]{32}$/,
      description: 'Agora App ID (32 character hex)',
    },
    TWILIO_ACCOUNT_SID: {
      required: false,
      pattern: /^AC[a-f0-9]{32}$/,
      description: 'Twilio Account SID',
    },
    SENDGRID_API_KEY: {
      required: false,
      pattern: /^SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}$/,
      description: 'SendGrid API key',
    },
  },
  development: {
    NODE_ENV: {
      required: true,
      pattern: /^(development|staging|production|test)$/,
      description: 'Node.js environment',
    },
    LOG_LEVEL: {
      required: false,
      pattern: /^(error|warn|info|debug|trace)$/,
      description: 'Logging level',
    },
  },
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

// Load environment variables from .env.local
function loadEnvironment() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    logError('.env.local file not found');
    logInfo('Run: cp .env.example .env.local');
    return false;
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');

    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key] = value;
        }
      }
    });

    logSuccess('.env.local loaded successfully');
    return true;
  } catch (error) {
    logError(`Failed to load .env.local: ${error.message}`);
    return false;
  }
}

// Validate a single environment variable
function validateEnvVar(name, config) {
  const value = process.env[name];

  if (!value) {
    if (config.required) {
      logError(`${name} is required but not set`);
      logInfo(`Description: ${config.description}`);
      return false;
    } else {
      logWarning(`${name} is not set (optional)`);
      return true;
    }
  }

  if (config.pattern && !config.pattern.test(value)) {
    logError(`${name} has invalid format`);
    logInfo(`Description: ${config.description}`);
    logInfo(`Expected pattern: ${config.pattern}`);
    return false;
  }

  logSuccess(`${name} is valid`);
  return true;
}

// Validate all environment variables
function validateEnvironment() {
  let allValid = true;
  let totalChecked = 0;
  let validCount = 0;

  log('\n🔍 Validating environment variables...\n', 'cyan');

  Object.entries(requiredEnvVars).forEach(([category, vars]) => {
    log(`\n📋 ${category.toUpperCase()} Configuration:`, 'magenta');

    Object.entries(vars).forEach(([name, config]) => {
      totalChecked++;
      const isValid = validateEnvVar(name, config);
      if (isValid) validCount++;
      if (!isValid && config.required) allValid = false;
    });
  });

  // Summary
  log('\n📊 Validation Summary:', 'cyan');
  log(`Total variables checked: ${totalChecked}`);
  log(`Valid variables: ${validCount}`);
  log(`Invalid variables: ${totalChecked - validCount}`);

  if (allValid) {
    logSuccess('\n🎉 All required environment variables are valid!');
  } else {
    logError('\n❌ Some required environment variables are missing or invalid');
    logInfo('Please check your .env.local file and update the missing values');
  }

  return allValid;
}

// Test database connection
async function testDatabaseConnection() {
  log('\n🗄️ Testing database connection...', 'cyan');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logError('DATABASE_URL not set, skipping connection test');
    return false;
  }

  try {
    // For this example, we'll just validate the URL format
    // In a real implementation, you'd use a database client to test the connection
    const url = new URL(databaseUrl);

    if (url.protocol !== 'postgresql:') {
      logError('DATABASE_URL must use postgresql:// protocol');
      return false;
    }

    logSuccess('Database URL format is valid');
    logInfo('Note: Actual connection test requires database client');
    return true;
  } catch (error) {
    logError(`Invalid DATABASE_URL format: ${error.message}`);
    return false;
  }
}

// Test Supabase connection
async function testSupabaseConnection() {
  log('\n🚀 Testing Supabase connection...', 'cyan');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logError('Supabase configuration incomplete, skipping connection test');
    return false;
  }

  try {
    // Test if Supabase URL is reachable
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (response.ok) {
      logSuccess('Supabase connection successful');
      return true;
    } else {
      logError(`Supabase connection failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    logError(`Supabase connection error: ${error.message}`);
    return false;
  }
}

// Generate environment report
function generateReport() {
  log('\n📄 Environment Report:', 'cyan');

  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'not set',
    supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    databaseConfigured: !!process.env.DATABASE_URL,
    paymentConfigured: !!(process.env.PAYSTACK_SECRET_KEY || process.env.STRIPE_SECRET_KEY),
    communicationConfigured: !!(
      process.env.AGORA_APP_ID ||
      process.env.TWILIO_ACCOUNT_SID ||
      process.env.SENDGRID_API_KEY
    ),
  };

  Object.entries(report).forEach(([key, value]) => {
    const displayValue = typeof value === 'boolean' ? (value ? '✓' : '✗') : value;
    log(`  ${key}: ${displayValue}`);
  });

  return report;
}

// Main validation function
async function main() {
  log('🔧 Giga Platform Environment Validator', 'cyan');
  log('=====================================\n');

  // Load environment
  const envLoaded = loadEnvironment();
  if (!envLoaded) {
    process.exit(1);
  }

  // Validate environment variables
  const envValid = validateEnvironment();

  // Test connections
  const dbValid = await testDatabaseConnection();
  const supabaseValid = await testSupabaseConnection();

  // Generate report
  const report = generateReport();

  // Final result
  const allValid = envValid && dbValid && supabaseValid;

  if (allValid) {
    log('\n🎉 Environment validation completed successfully!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Environment validation failed!', 'red');
    log('Please fix the issues above and run the validation again.', 'yellow');
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    logError(`Validation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  validateEnvironment,
  testDatabaseConnection,
  testSupabaseConnection,
  generateReport,
};
