import http from 'http';

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3001,
  path: '/health',
  method: 'GET',
  timeout: 5000,
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    console.error(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error('Health check request failed:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Health check request timed out');
  request.destroy();
  process.exit(1);
});

request.end();