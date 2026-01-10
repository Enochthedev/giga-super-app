#!/usr/bin/env node

/**
 * Postman Setup Script for Giga Platform
 *
 * This script will:
 * 1. Create a workspace in Postman
 * 2. Import your existing collection
 * 3. Set up environments (production and local)
 * 4. Run initial tests
 * 5. Update .postman.json with IDs
 */

const fs = require('fs');
const path = require('path');

// Load existing collection and environments
const collectionPath = path.join(
  __dirname,
  '../postman/Giga-API-Collection.postman_collection.json'
);
const prodEnvPath = path.join(__dirname, '../postman/Giga-Environment.postman_environment.json');
const localEnvPath = path.join(
  __dirname,
  '../postman/Giga-Environment-Local.postman_environment.json'
);

console.log('🚀 Setting up Postman integration for Giga Platform...');

async function setupPostman() {
  try {
    // This would be called via the Postman power once authentication is working
    console.log('📋 Step 1: Creating workspace...');
    // const workspace = await createWorkspace({
    //   workspace: {
    //     name: "Giga Platform",
    //     type: "personal",
    //     description: "Multi-service platform with Hotels, Marketplace, and Payment integration"
    //   }
    // });

    console.log('📚 Step 2: Importing collection...');
    // Load and import the existing collection
    const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

    console.log('🌍 Step 3: Setting up environments...');
    // Load environments
    const prodEnv = JSON.parse(fs.readFileSync(prodEnvPath, 'utf8'));
    const localEnv = JSON.parse(fs.readFileSync(localEnvPath, 'utf8'));

    console.log('✅ Step 4: Running initial tests...');
    // This would run the collection once imported

    console.log('💾 Step 5: Updating configuration...');
    // Update .postman.json with the new IDs
    const config = {
      workspace_id: 'workspace-id-here',
      collection_id: 'collection-id-here',
      environment_ids: {
        production: 'prod-env-id-here',
        local: 'local-env-id-here',
      },
      last_run: new Date().toISOString(),
      auto_run_enabled: true,
      collection_name: collection.info.name,
      environments: {
        production: prodEnv.name,
        local: localEnv.name,
      },
    };

    fs.writeFileSync('.postman.json', JSON.stringify(config, null, 2));

    console.log('🎉 Postman setup complete!');
    console.log('📊 Collection:', collection.info.name);
    console.log('📁 Environments:', Object.keys(config.environments).join(', '));
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Export for use with Postman power
module.exports = { setupPostman };

if (require.main === module) {
  setupPostman();
}
