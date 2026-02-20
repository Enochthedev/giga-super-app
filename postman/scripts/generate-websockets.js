const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../Giga-Realtime-Collection.json');

const collection = {
  info: {
    name: 'Giga Realtime Collection',
    description: 'WebSocket endpoints for Taxi and Delivery services',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    {
      name: 'Taxi Realtime Service',
      item: [
        {
          name: 'Connection & Auth',
          request: {
            method: 'GET',
            header: [
              {
                key: 'Authorization',
                value: 'Bearer {{bearerToken}}',
                description: 'JWT Token',
              },
              {
                key: 'auth',
                value: '{"token": "{{bearerToken}}"}',
                description: 'Alternative auth via handshake',
              },
            ],
            url: {
              raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
              host: ['{{wsUrl}}'],
              path: ['socket.io', ''],
            },
            description: 'Connect to Taxi Realtime Service via Socket.IO',
          },
          response: [],
        },
        {
          name: 'Driver Events',
          item: [
            {
              name: 'Update Location',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
                  host: ['{{wsUrl}}'],
                  path: ['socket.io', ''],
                },
                description: 'Emit "driver:location:update" event',
                body: {
                  mode: 'raw',
                  raw: '42["driver:location:update", {"lat": 6.5244, "lng": 3.3792}]',
                },
              },
              response: [],
            },
            {
              name: 'Accept Trip',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
                  host: ['{{wsUrl}}'],
                  path: ['socket.io', ''],
                },
                description: 'Emit "trip:accept"',
                body: {
                  mode: 'raw',
                  raw: '42["trip:accept", {"tripId": "<uuid>"}]',
                },
              },
              response: [],
            },
            {
              name: 'Update Trip Status',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
                  host: ['{{wsUrl}}'],
                  path: ['socket.io', ''],
                },
                description: 'Emit "trip:status:update"',
                body: {
                  mode: 'raw',
                  raw: '42["trip:status:update", {"tripId": "<uuid>", "status": "arrived"}]',
                },
              },
              response: [],
            },
          ],
        },
        {
          name: 'Rider Events',
          item: [
            {
              name: 'Request Nearby Drivers',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
                  host: ['{{wsUrl}}'],
                  path: ['socket.io', ''],
                },
                description: 'Emit "rider:request:nearby-drivers"',
                body: {
                  mode: 'raw',
                  raw: '42["rider:request:nearby-drivers", {"lat": 6.5244, "lng": 3.3792, "radius": 5}]',
                },
              },
              response: [],
            },
            {
              name: 'Request Trip',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
                  host: ['{{wsUrl}}'],
                  path: ['socket.io', ''],
                },
                description: 'Emit "trip:request"',
                body: {
                  mode: 'raw',
                  raw: '42["trip:request", {"driverId": "<uuid>", "pickupLat": 6.5, "pickupLng": 3.3, "dropoffLat": 6.6, "dropoffLng": 3.4}]',
                },
              },
              response: [],
            },
          ],
        },
      ],
    },
    {
      name: 'Delivery Service',
      item: [
        {
          name: 'Connection & Auth',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
              host: ['{{wsUrl}}'],
              path: ['socket.io', ''],
            },
            description: 'Connect and Authenticate',
            body: {
              mode: 'raw',
              raw: '42["authenticate", {"token": "{{bearerToken}}"}]',
            },
          },
          response: [],
        },
        {
          name: 'Tracking',
          item: [
            {
              name: 'Join Tracking Room',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
                  host: ['{{wsUrl}}'],
                  path: ['socket.io', ''],
                },
                description: 'Emit "join_tracking"',
                body: {
                  mode: 'raw',
                  raw: '42["join_tracking", {"assignment_id": "<uuid>"}]',
                },
              },
              response: [],
            },
            {
              name: 'Leave Tracking Room',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
                  host: ['{{wsUrl}}'],
                  path: ['socket.io', ''],
                },
                description: 'Emit "leave_tracking"',
                body: {
                  mode: 'raw',
                  raw: '42["leave_tracking", {"assignment_id": "<uuid>"}]',
                },
              },
              response: [],
            },
          ],
        },
        {
          name: 'Courier Events',
          item: [
            {
              name: 'Update Location',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{wsUrl}}/socket.io/?EIO=4&transport=websocket',
                  host: ['{{wsUrl}}'],
                  path: ['socket.io', ''],
                },
                description: 'Emit "courier_location_update"',
                body: {
                  mode: 'raw',
                  raw: '42["courier_location_update", {"latitude": 6.5, "longitude": 3.3, "speed_kmh": 40}]',
                },
              },
              response: [],
            },
          ],
        },
      ],
    },
  ],
  variable: [
    {
      key: 'wsUrl',
      value: 'ws://localhost:3000',
      type: 'string',
    },
    {
      key: 'bearerToken',
      value: '',
      type: 'string',
    },
  ],
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(collection, null, 2));
console.log(`Generated Realtime collection at ${OUTPUT_PATH}`);
