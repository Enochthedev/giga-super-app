const fs = require('fs');

const collectionPath = './Giga-API-Collection.postman_collection.json';
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Helper to find section by name
const findSection = name => collection.item.find(item => item.name === name);

const adsSectionName = '15. Ads Service';
let adsSection = findSection(adsSectionName);

if (!adsSection) {
  adsSection = {
    name: adsSectionName,
    description: 'Advertising platform endpoints',
    item: [],
  };
  collection.item.push(adsSection);
}

// Clear existing items to avoid duplicates if re-run
adsSection.item = [];

// 1. Advertiser Sub-folder
const advertiserFolder = {
  name: 'Advertiser Management',
  item: [
    {
      name: 'Create Advertiser Profile',
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
              company_name: 'Acme Corp',
              industry: 'Technology',
              website: 'https://acme.com',
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/create-advertiser-profile',
          host: ['{{base_url}}'],
          path: ['create-advertiser-profile'],
        },
        description: 'Register as an advertiser',
      },
    },
    {
      name: 'Get Advertiser Profile',
      request: {
        method: 'GET',
        header: [
          { key: 'apikey', value: '{{supabase_anon_key}}' },
          { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
        ],
        url: {
          raw: '{{base_url}}/get-advertiser-profile',
          host: ['{{base_url}}'],
          path: ['get-advertiser-profile'],
        },
        description: "Get current user's advertiser profile",
      },
    },
    {
      name: 'Create Ad Campaign',
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
              campaign_name: 'Summer Sale 2024',
              campaign_type: 'banner',
              description: 'Promoting summer collection',
              budget: 1000,
              daily_budget: 50,
              start_date: '2024-06-01',
              end_date: '2024-06-30',
              target_audience: {
                age_range: [18, 35],
                interests: ['fashion', 'summer'],
              },
              creative_assets: {
                image_url: 'https://example.com/banner.jpg',
                headline: '50% Off Summer Styles',
              },
              landing_url: 'https://acme.com/summer-sale',
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/create-ad-campaign',
          host: ['{{base_url}}'],
          path: ['create-ad-campaign'],
        },
        description: 'Create a new ad campaign',
      },
    },
    {
      name: 'Update Ad Campaign',
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
              campaign_id: 'uuid-here',
              budget: 1500,
              status: 'paused',
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/update-ad-campaign',
          host: ['{{base_url}}'],
          path: ['update-ad-campaign'],
        },
        description: 'Update campaign details',
      },
    },
    {
      name: 'Get Ad Campaigns',
      request: {
        method: 'GET',
        header: [
          { key: 'apikey', value: '{{supabase_anon_key}}' },
          { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
        ],
        url: {
          raw: '{{base_url}}/get-ad-campaigns?page=1&limit=10&status=active',
          host: ['{{base_url}}'],
          path: ['get-ad-campaigns'],
          query: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' },
            { key: 'status', value: 'active' },
          ],
        },
        description: "List advertiser's campaigns",
      },
    },
    {
      name: 'Get Ad Analytics',
      request: {
        method: 'GET',
        header: [
          { key: 'apikey', value: '{{supabase_anon_key}}' },
          { key: 'Authorization', value: 'Bearer {{supabase_auth_token}}' },
        ],
        url: {
          raw: '{{base_url}}/get-ad-analytics?campaign_id=optional-uuid',
          host: ['{{base_url}}'],
          path: ['get-ad-analytics'],
          query: [{ key: 'campaign_id', value: 'optional-uuid' }],
        },
        description: 'Get performance metrics',
      },
    },
  ],
};

// 2. Serving Sub-folder
const servingFolder = {
  name: 'Ad Serving & Tracking',
  item: [
    {
      name: 'Fetch Ads',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'apikey', value: '{{supabase_anon_key}}' },
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify(
            {
              placement_type: 'banner',
              limit: 2,
              user_context: {
                location: 'US',
                interests: ['tech'],
              },
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/fetch-ads',
          host: ['{{base_url}}'],
          path: ['fetch-ads'],
        },
        description: 'Get ads for display',
      },
    },
    {
      name: 'Track Ad Event',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'apikey', value: '{{supabase_anon_key}}' },
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify(
            {
              campaign_id: 'uuid-here',
              event_type: 'click', // impression, click, conversion
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/track-ad-event',
          host: ['{{base_url}}'],
          path: ['track-ad-event'],
        },
        description: 'Track impressions, clicks, and conversions',
      },
    },
  ],
};

// 3. Admin Sub-folder
const adminFolder = {
  name: 'Admin Operations',
  item: [
    {
      name: 'Approve Ad Campaign',
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
              campaign_id: 'uuid-here',
              decision: 'approve', // or reject
              reason: 'Meets guidelines',
            },
            null,
            2
          ),
        },
        url: {
          raw: '{{base_url}}/approve-ad-campaign',
          host: ['{{base_url}}'],
          path: ['approve-ad-campaign'],
        },
        description: 'Admin approval for campaigns',
      },
    },
  ],
};

adsSection.item.push(advertiserFolder, servingFolder, adminFolder);

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log('✅ Added Ads Service endpoints to Postman collection');
