const { spawn } = require('child_process');
const fs = require('fs');

// Create logs directory
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

const services = [
  { name: 'API Gateway', dir: 'api-gateway', cmd: 'node', args: ['src/index.js'], port: 3000 },
  {
    name: 'Social Service',
    dir: 'social-service',
    cmd: 'npx',
    args: ['tsx', 'src/simple-index.ts'],
    port: 3001,
  },
  {
    name: 'Payment Service',
    dir: 'payment-queue-service',
    cmd: 'npx',
    args: ['tsx', 'src/simple-index.ts'],
    port: 3002,
  },
  {
    name: 'Taxi Service',
    dir: 'taxi-realtime-service',
    cmd: 'npx',
    args: ['tsx', 'src/simple-index.ts'],
    port: 3003,
  },
  {
    name: 'Delivery Service',
    dir: 'delivery-service',
    cmd: 'npx',
    args: ['tsx', 'src/simple-index.ts'],
    port: 3004,
  },
  {
    name: 'Admin Service',
    dir: 'admin-service',
    cmd: 'npx',
    args: ['tsx', 'src/simple-index.ts'],
    port: 3005,
  },
  {
    name: 'Search Service',
    dir: 'search-service',
    cmd: 'npx',
    args: ['tsx', 'src/simple-index.ts'],
    port: 3007,
  },
];

const processes = [];

console.log('🚀 Starting all Giga Platform services...\n');

services.forEach((service, index) => {
  setTimeout(() => {
    console.log(`Starting ${service.name} on port ${service.port}...`);

    const child = spawn(service.cmd, service.args, {
      cwd: service.dir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Log output
    const logFile = fs.createWriteStream(
      `logs/${service.name.toLowerCase().replace(/\s+/g, '-')}.log`
    );
    child.stdout.pipe(logFile);
    child.stderr.pipe(logFile);

    child.on('spawn', () => {
      console.log(`✅ ${service.name} started (PID: ${child.pid})`);
    });

    child.on('error', error => {
      console.log(`❌ ${service.name} failed to start: ${error.message}`);
    });

    child.on('exit', code => {
      console.log(`⚠️  ${service.name} exited with code ${code}`);
    });

    processes.push({ name: service.name, process: child, port: service.port });
  }, index * 1000); // Stagger startup by 1 second
});

// Wait for all services to start, then test them
setTimeout(async () => {
  console.log('\n🔍 Testing service health checks...\n');

  for (const service of processes) {
    try {
      const response = await fetch(`http://localhost:${service.port}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${service.name}: ${data.data.status}`);
      } else {
        console.log(`❌ ${service.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name}: ${error.message}`);
    }
  }

  console.log('\n🎉 Service Status Summary:');
  console.log('📊 API Gateway: http://localhost:3000/health');
  console.log('👥 Social Service: http://localhost:3001/health');
  console.log('💳 Payment Service: http://localhost:3002/health');
  console.log('🚕 Taxi Service: http://localhost:3003/health');
  console.log('📦 Delivery Service: http://localhost:3004/health');
  console.log('🏛️  Admin Service: http://localhost:3005/health');
  console.log('🔍 Search Service: http://localhost:3007/health');
  console.log('\n📋 View logs: tail -f logs/[service-name].log');
  console.log('🛑 Stop all: Ctrl+C or pkill -f "tsx.*simple-index.ts"');
}, 10000); // Wait 10 seconds for all services to start

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all services...');
  processes.forEach(service => {
    if (service.process && !service.process.killed) {
      service.process.kill();
      console.log(`✅ Stopped ${service.name}`);
    }
  });
  process.exit(0);
});
