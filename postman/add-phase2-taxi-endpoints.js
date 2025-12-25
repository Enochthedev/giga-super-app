const fs = require('fs');

const collectionPath = './Giga-API-Collection.postman_collection.json';
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Helper to find section by name
const findSection = name => collection.item.find(item => item.name === name);

// 1. Add to Riders Section
const ridersSection = findSection('11. Taxi/Ride Service - Riders');
if (ridersSection) {
  ridersSection.item.push(
    {
      name: 'Get Ride History',
      request: {
        method: 'GET',
        header: [
          { key: 'apikey', value: '{{supabase_anon_key}}' },
          { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
        ],
        url: {
          raw: '{{base_url}}/get-ride-history?page=1&limit=10&role=rider',
          host: ['{{base_url}}'],
          path: ['get-ride-history'],
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
            { key: 'role', value: 'rider' },
          ],
        },
        description: 'Get past rides with pagination',
      },
    },
    {
      name: 'Rate Driver',
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
              rating: 5,
              comment: 'Great ride!',
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/rate-driver',
          host: ['{{base_url}}'],
          path: ['rate-driver'],
        },
        description: 'Submit rating for a completed ride',
      },
    },
    {
      name: 'Get Nearby Drivers',
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
              radius: 5,
              vehicle_type: 'standard',
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/get-nearby-drivers',
          host: ['{{base_url}}'],
          path: ['get-nearby-drivers'],
        },
        description: 'Find available drivers nearby (PostGIS)',
      },
    }
  );
}

// 2. Add to Drivers Section
const driversSection = findSection('12. Taxi/Ride Service - Drivers');
if (driversSection) {
  driversSection.item.push(
    {
      name: 'Get Ride Requests',
      request: {
        method: 'GET',
        header: [
          { key: 'apikey', value: '{{supabase_anon_key}}' },
          { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
        ],
        url: {
          raw: '{{base_url}}/get-ride-requests',
          host: ['{{base_url}}'],
          path: ['get-ride-requests'],
        },
        description: 'List pending ride requests for drivers',
      },
    },
    {
      name: 'Get Earnings',
      request: {
        method: 'GET',
        header: [
          { key: 'apikey', value: '{{supabase_anon_key}}' },
          { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
        ],
        url: {
          raw: '{{base_url}}/get-earnings',
          host: ['{{base_url}}'],
          path: ['get-earnings'],
        },
        description: 'View driver earnings history',
      },
    },
    {
      name: 'Reject Ride',
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
              reason: 'Too far',
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/reject-ride',
          host: ['{{base_url}}'],
          path: ['reject-ride'],
        },
        description: 'Reject a ride request',
      },
    }
  );
}

// 3. Add Admin Section
const adminSectionName = '14. Taxi/Ride Service - Admin';
let adminSection = findSection(adminSectionName);
if (!adminSection) {
  adminSection = {
    name: adminSectionName,
    description: 'Admin endpoints for taxi service management',
    item: [],
  };
  collection.item.push(adminSection);
}

// Check if already added to avoid duplicates if run multiple times
if (!adminSection.item.find(i => i.name === 'Verify Driver')) {
  adminSection.item.push(
    {
      name: 'Verify Driver',
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
              driver_id: 'uuid-here',
              status: true,
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/verify-driver',
          host: ['{{base_url}}'],
          path: ['verify-driver'],
        },
        description: 'Approve or verify a driver',
      },
    },
    {
      name: 'Get Ride Analytics',
      request: {
        method: 'GET',
        header: [
          { key: 'apikey', value: '{{supabase_anon_key}}' },
          { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
        ],
        url: {
          raw: '{{base_url}}/get-ride-analytics',
          host: ['{{base_url}}'],
          path: ['get-ride-analytics'],
        },
        description: 'Get platform statistics for rides and drivers',
      },
    }
  );
}

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log('✅ Added 8 Phase 2 endpoints to Postman collection');
