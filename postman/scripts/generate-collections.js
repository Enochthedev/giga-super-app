const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const Converter = require('openapi-to-postmanv2');

const SERVICES = [
  {
    name: 'social-service',
    path: '../../social-service',
    script: 'src/scripts/generate-openapi.ts',
    output: 'Social-Service-Collection.json',
  },
  {
    name: 'admin-service',
    path: '../../admin-service',
    script: 'src/scripts/generate-openapi.ts',
    output: 'Admin-Service-Collection.json',
  },
  {
    name: 'notifications-service',
    path: '../../notifications-service',
    script: 'src/scripts/generate-openapi.ts',
    output: 'Notifications-Service-Collection.json',
  },
  {
    name: 'delivery-service',
    path: '../../delivery-service',
    script: 'src/scripts/generate-openapi.ts',
    output: 'Delivery-Service-Collection.json',
  },
  {
    name: 'payment-queue-service',
    path: '../../payment-queue-service',
    script: 'src/scripts/generate-openapi.ts',
    output: 'Payment-Queue-Service-Collection.json',
  },
  {
    name: 'taxi-realtime-service',
    path: '../../taxi-realtime-service',
    script: 'src/scripts/generate-openapi.ts',
    output: 'Taxi-Realtime-Service-Collection.json',
  },
  {
    name: 'api-gateway',
    path: '../../api-gateway',
    script: 'src/scripts/generate-openapi.ts',
    output: 'API-Gateway-Collection.json',
  },
];

const WEBSOCKET_SCRIPT = path.join(__dirname, 'generate-websockets.js');

async function generateCollections() {
  const postmanDir = path.resolve(__dirname, '..');

  // 0. Cleanup existing JSON files
  console.log('Cleaning up old collection files...');
  try {
    const files = fs.readdirSync(postmanDir);
    for (const file of files) {
      if (
        file.endsWith('-Collection.json') ||
        file.endsWith('Giga-Realtime-Collection.json') ||
        file.endsWith('.postman_collection.json') ||
        file === 'Integration-Workflows.json' ||
        file === 'taxi-rider-endpoints.json'
      ) {
        fs.unlinkSync(path.join(postmanDir, file));
        console.log(`Deleted ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error.message);
  }

  for (const service of SERVICES) {
    console.log(`Processing ${service.name}...`);

    const servicePath = path.resolve(__dirname, service.path);
    const scriptPath = path.join(servicePath, service.script);
    const openApiOutput = path.join(servicePath, 'openapi.json');
    const collectionOutput = path.resolve(__dirname, '..', service.output);

    try {
      // 1. Generate OpenAPI spec
      console.log(`Generated OpenAPI spec for ${service.name}...`);

      // Ensure we have the correct path for node/npx
      const env = {
        ...process.env,
        PATH: `/Users/user/.nvm/versions/node/v22.21.0/bin:${process.env.PATH}`,
      };

      // We use npx tsx to execute the typescript script directly
      execSync(`npx tsx ${scriptPath}`, { cwd: servicePath, stdio: 'inherit', env });

      // 2. Read the generated spec
      if (!fs.existsSync(openApiOutput)) {
        throw new Error(`OpenAPI file not found at ${openApiOutput}`);
      }
      const openApiData = fs.readFileSync(openApiOutput, 'utf8');

      // 3. Convert to Postman
      console.log(`Converting to Postman collection...`);
      Converter.convert({ type: 'string', data: openApiData }, {}, (err, conversionResult) => {
        if (!conversionResult.result) {
          console.error('Could not convert', conversionResult.reason);
          return;
        }

        const collection = conversionResult.output[0].data;

        // Customizations can go here (e.g. adding auth headers if missing)

        // 4. Save Collection
        fs.writeFileSync(collectionOutput, JSON.stringify(collection, null, 2));
        console.log(`Saved collection to ${collectionOutput}`);
      });
    } catch (error) {
      console.error(`Error processing ${service.name}:`, error);
    }
  }

  // Generate WebSocket collection
  console.log('Generating WebSocket collection...');
  try {
    execSync(`node ${WEBSOCKET_SCRIPT}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error generating WebSocket collection:', error.message);
  }

  console.log('All collections generated successfully!');
}

// Execute with explicit node path if run directly
if (require.main === module) {
  generateCollections();
}
