// Taxi and Platform Settings Endpoints for Postman Collection
// Run: node add-taxi-endpoints.js

const fs = require('fs');

const collection = JSON.parse(
  fs.readFileSync('./Giga-API-Collection.postman_collection.json', 'utf8')
);

// New sections to add
const newSections = [
  {
    name: '11. Taxi/Ride Service - Riders',
    description: 'Taxi service endpoints for riders',
    item: [
      {
        name: 'Get Ride Estimate',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                pickup_lat: 6.5244,
                pickup_lng: 3.3792,
                dropoff_lat: 6.4541,
                dropoff_lng: 3.3947,
                vehicle_type: 'standard',
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/get-ride-estimate',
            host: ['{{base_url}}'],
            path: ['get-ride-estimate'],
          },
          description:
            'Get fare estimate with Google Maps integration, surge pricing, and vehicle options',
        },
      },
      {
        name: 'Request Ride',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                pickup_address: '1 Broad Street, Lagos',
                pickup_lat: 6.5244,
                pickup_lng: 3.3792,
                dropoff_address: 'Murtala Muhammed Airport',
                dropoff_lat: 6.4541,
                dropoff_lng: 3.3947,
                vehicle_type: 'standard',
                payment_method_id: 'pm_xxx',
                notes: 'Please call when you arrive',
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/request-ride',
            host: ['{{base_url}}'],
            path: ['request-ride'],
          },
          description: 'Request a new ride - finds nearby drivers and sends notifications',
        },
      },
      {
        name: 'Get Active Ride',
        request: {
          method: 'GET',
          header: [
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          url: {
            raw: '{{base_url}}/get-active-ride',
            host: ['{{base_url}}'],
            path: ['get-active-ride'],
          },
          description: 'Get current active ride with real-time driver location',
        },
      },
      {
        name: 'Cancel Ride',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                ride_id: 'uuid-here',
                reason: 'Changed my mind',
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/cancel-ride',
            host: ['{{base_url}}'],
            path: ['cancel-ride'],
          },
          description: 'Cancel ride - fees may apply after grace period (5 mins default)',
        },
      },
    ],
  },
  {
    name: '12. Taxi/Ride Service - Drivers',
    description: 'Taxi service endpoints for drivers',
    item: [
      {
        name: 'Toggle Availability',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ is_available: true }, null, 2),
          },
          url: {
            raw: '{{base_url}}/toggle-availability',
            host: ['{{base_url}}'],
            path: ['toggle-availability'],
          },
          description: 'Go online/offline - set driver availability status',
        },
      },
      {
        name: 'Update Location',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                lat: 6.5244,
                lng: 3.3792,
                heading: 45,
                speed: 30,
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/update-location',
            host: ['{{base_url}}'],
            path: ['update-location'],
          },
          description: "Update driver's real-time GPS location",
        },
      },
      {
        name: 'Accept Ride',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ ride_id: 'uuid-here' }, null, 2),
          },
          url: {
            raw: '{{base_url}}/accept-ride',
            host: ['{{base_url}}'],
            path: ['accept-ride'],
          },
          description: 'Accept a ride request - includes driver verification and ETA calculation',
        },
      },
      {
        name: 'Start Ride',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                ride_id: 'uuid-here',
                current_lat: 6.5244,
                current_lng: 3.3792,
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/start-ride',
            host: ['{{base_url}}'],
            path: ['start-ride'],
          },
          description: 'Start the ride once rider is picked up',
        },
      },
      {
        name: 'Complete Ride',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                ride_id: 'uuid-here',
                dropoff_lat: 6.4541,
                dropoff_lng: 3.3947,
                actual_distance_km: 10.5,
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/complete-ride',
            host: ['{{base_url}}'],
            path: ['complete-ride'],
          },
          description: 'Complete ride - calculates final fare, processes payment, records earnings',
        },
      },
    ],
  },
  {
    name: '13. Platform Settings (Admin)',
    description: 'Admin endpoints for managing platform-wide pricing and configuration',
    item: [
      {
        name: 'Get Platform Settings',
        request: {
          method: 'GET',
          header: [
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          url: {
            raw: '{{base_url}}/get-platform-settings?category=taxi_pricing',
            host: ['{{base_url}}'],
            path: ['get-platform-settings'],
            query: [{ key: 'category', value: 'taxi_pricing', description: 'Optional filter' }],
          },
          description:
            'Get all platform settings, optionally filtered by category (taxi_pricing, taxi_commission, taxi_settings)',
        },
      },
      {
        name: 'Update Platform Setting (Admin)',
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'apikey', value: '{{supabase_anon_key}}' },
            { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                category: 'taxi_pricing',
                key: 'base_fare',
                value: '600',
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/update-platform-setting',
            host: ['{{base_url}}'],
            path: ['update-platform-setting'],
          },
          description:
            'Update a platform setting (requires admin clearance level 4+). Available settings:\n\n**taxi_pricing:**\n- base_fare (default: 500)\n- cost_per_km (default: 100)\n- cost_per_minute (default: 20)\n- min_fare (default: 300)\n- cancellation_fee (default: 200)\n- cancellation_grace_period_minutes (default: 5)\n\n**taxi_commission:**\n- driver_commission_rate (default: 0.80)\n- platform_commission_rate (default: 0.20)\n\n**taxi_settings:**\n- driver_search_radius_km (default: 10)\n- max_drivers_to_notify (default: 5)',
        },
      },
    ],
  },
];

// Add sections to collection
collection.item.push(...newSections);

// Write updated collection
fs.writeFileSync(
  './Giga-API-Collection.postman_collection.json',
  JSON.stringify(collection, null, 2)
);

console.log('✅ Added 3 new sections to Postman collection:');
console.log('   - 11. Taxi/Ride Service - Riders (4 endpoints)');
console.log('   - 12. Taxi/Ride Service - Drivers (5 endpoints)');
console.log('   - 13. Platform Settings (Admin) (2 endpoints)');
console.log('');
console.log('📊 Total endpoints added: 11');
