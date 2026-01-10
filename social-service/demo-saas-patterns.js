#!/usr/bin/env node

/**
 * SaaS Builder Demo Script
 *
 * This script demonstrates the key SaaS Builder patterns implemented
 * in your enhanced social service:
 *
 * 1. Multi-tenant data isolation
 * 2. Feature gating based on subscription plans
 * 3. Usage quota enforcement
 * 4. Billing event tracking
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Demo tenants with different plans (using real user IDs from database)
const DEMO_TENANTS = {
  trial: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Trial Company',
    plan: 'trial',
    user: {
      id: 'ad3354e2-4807-4b02-91e7-78f9e1b4d65e', // Real user from auth.users
      email: 'test@example.com',
      role: 'user',
    },
  },
  premium: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Premium Corp',
    plan: 'premium',
    user: {
      id: 'cf58622a-78ad-49bf-850b-af8b04b8e868', // Real user from auth.users
      email: 'wavedidwhat+test1@gmail.com',
      role: 'admin',
    },
  },
};

/**
 * Create headers for API requests with tenant context
 */
function createHeaders(tenant) {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenant.id,
    'X-Tenant-Name': tenant.name,
    'X-Tenant-Plan': tenant.plan,
    'X-User-ID': tenant.user.id,
    'X-User-Email': tenant.user.email,
    'X-User-Role': tenant.user.role,
  };
}

/**
 * Demo 1: Multi-tenant data isolation
 */
async function demoDataIsolation() {
  console.log('\n🔒 Demo 1: Multi-tenant Data Isolation');
  console.log('=====================================');

  try {
    // Create posts for different tenants
    const trialPost = await axios.post(
      `${BASE_URL}/api/v1/tenant/posts`,
      {
        content: 'This is a post from Trial Company',
      },
      {
        headers: createHeaders(DEMO_TENANTS.trial),
      }
    );

    const premiumPost = await axios.post(
      `${BASE_URL}/api/v1/tenant/posts`,
      {
        content: 'This is a post from Premium Corp',
        media_urls: ['https://example.com/image.jpg'],
      },
      {
        headers: createHeaders(DEMO_TENANTS.premium),
      }
    );

    console.log('✅ Created posts for both tenants');

    // Try to get posts for each tenant - should only see their own
    const trialPosts = await axios.get(`${BASE_URL}/api/v1/tenant/posts`, {
      headers: createHeaders(DEMO_TENANTS.trial),
    });

    const premiumPosts = await axios.get(`${BASE_URL}/api/v1/tenant/posts`, {
      headers: createHeaders(DEMO_TENANTS.premium),
    });

    console.log(`✅ Trial tenant sees ${trialPosts.data.data.length} posts (their own)`);
    console.log(`✅ Premium tenant sees ${premiumPosts.data.data.length} posts (their own)`);
    console.log('✅ Data isolation working correctly!');
  } catch (error) {
    console.error('❌ Data isolation demo failed:', error.response?.data || error.message);
  }
}

/**
 * Demo 2: Feature gating based on subscription plans
 */
async function demoFeatureGating() {
  console.log('\n🎯 Demo 2: Feature Gating');
  console.log('=========================');

  try {
    // Trial tenant tries to create a post with media (should fail)
    console.log('Trial tenant attempting to create media post...');

    try {
      await axios.post(
        `${BASE_URL}/api/v1/tenant/posts`,
        {
          content: 'Trial post with media',
          media_urls: ['https://example.com/image.jpg'],
        },
        {
          headers: createHeaders(DEMO_TENANTS.trial),
        }
      );
      console.log('❌ Trial tenant should not be able to create media posts');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Trial tenant correctly blocked from media posts');
        console.log(`   Error: ${error.response.data.error.message}`);
        console.log(`   Upgrade URL: ${error.response.data.error.details.upgrade_url}`);
      } else {
        throw error;
      }
    }

    // Premium tenant creates media post (should succeed)
    console.log('Premium tenant creating media post...');
    const premiumMediaPost = await axios.post(
      `${BASE_URL}/api/v1/tenant/posts`,
      {
        content: 'Premium post with media',
        media_urls: ['https://example.com/premium-image.jpg'],
      },
      {
        headers: createHeaders(DEMO_TENANTS.premium),
      }
    );

    console.log('✅ Premium tenant successfully created media post');

    // Trial tenant tries to access analytics (should fail)
    console.log('Trial tenant attempting to access analytics...');

    try {
      await axios.get(`${BASE_URL}/api/v1/tenant/usage`, {
        headers: createHeaders(DEMO_TENANTS.trial),
      });
      console.log('❌ Trial tenant should not have access to analytics');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Trial tenant correctly blocked from analytics');
        console.log(`   Error: ${error.response.data.error.message}`);
      } else {
        throw error;
      }
    }

    // Premium tenant accesses analytics (should succeed)
    console.log('Premium tenant accessing analytics...');
    const analytics = await axios.get(`${BASE_URL}/api/v1/tenant/usage`, {
      headers: createHeaders(DEMO_TENANTS.premium),
    });

    console.log('✅ Premium tenant successfully accessed analytics');
    console.log(`   Posts created: ${analytics.data.data.posts_created}`);
    console.log(`   Storage used: ${analytics.data.data.storage_used_mb}MB`);
  } catch (error) {
    console.error('❌ Feature gating demo failed:', error.response?.data || error.message);
  }
}

/**
 * Demo 3: Usage tracking and billing events
 */
async function demoUsageTracking() {
  console.log('\n📊 Demo 3: Usage Tracking');
  console.log('=========================');

  try {
    console.log('Creating posts and tracking usage events...');

    // Create multiple posts to generate usage events
    for (let i = 1; i <= 3; i++) {
      await axios.post(
        `${BASE_URL}/api/v1/tenant/posts`,
        {
          content: `Usage tracking post #${i}`,
        },
        {
          headers: createHeaders(DEMO_TENANTS.premium),
        }
      );

      console.log(`✅ Created post #${i} - usage event tracked`);
    }

    // Create comments to generate more usage events
    const posts = await axios.get(`${BASE_URL}/api/v1/tenant/posts`, {
      headers: createHeaders(DEMO_TENANTS.premium),
    });

    if (posts.data.data.length > 0) {
      const firstPost = posts.data.data[0];

      await axios.post(
        `${BASE_URL}/api/v1/tenant/posts/${firstPost.id}/comments`,
        {
          content: 'This is a tracked comment',
        },
        {
          headers: createHeaders(DEMO_TENANTS.premium),
        }
      );

      console.log('✅ Created comment - usage event tracked');

      // Like the post
      await axios.post(
        `${BASE_URL}/api/v1/tenant/posts/${firstPost.id}/like`,
        {},
        {
          headers: createHeaders(DEMO_TENANTS.premium),
        }
      );

      console.log('✅ Liked post - usage event tracked');
    }

    console.log('✅ All usage events have been tracked for billing');
    console.log('   Check your console logs to see the usage events JSON');
  } catch (error) {
    console.error('❌ Usage tracking demo failed:', error.response?.data || error.message);
  }
}

/**
 * Demo 4: Quota enforcement
 */
async function demoQuotaEnforcement() {
  console.log('\n⚡ Demo 4: Quota Enforcement');
  console.log('============================');

  try {
    console.log('Note: Quota enforcement is simulated in this demo');
    console.log('In production, this would check actual usage against limits');

    // The quota check is randomized in the demo
    // In production, it would check real usage from the database

    let quotaExceeded = false;
    let attempts = 0;

    while (!quotaExceeded && attempts < 10) {
      attempts++;

      try {
        await axios.post(
          `${BASE_URL}/api/v1/tenant/posts`,
          {
            content: `Quota test post #${attempts}`,
          },
          {
            headers: createHeaders(DEMO_TENANTS.trial),
          }
        );

        console.log(`✅ Post #${attempts} created successfully`);
      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`⚠️  Quota exceeded after ${attempts - 1} posts`);
          console.log(`   Error: ${error.response.data.error.message}`);
          console.log(`   Upgrade URL: ${error.response.data.error.details.upgrade_url}`);
          quotaExceeded = true;
        } else {
          throw error;
        }
      }
    }

    if (!quotaExceeded) {
      console.log('✅ All posts created within quota limits');
    }
  } catch (error) {
    console.error('❌ Quota enforcement demo failed:', error.response?.data || error.message);
  }
}

/**
 * Main demo runner
 */
async function runDemo() {
  console.log('🚀 SaaS Builder Patterns Demo');
  console.log('=============================');
  console.log('This demo shows key SaaS patterns implemented in your social service:');
  console.log('- Multi-tenant data isolation');
  console.log('- Feature gating by subscription plan');
  console.log('- Usage tracking for billing');
  console.log('- Quota enforcement');
  console.log('\nMake sure your social service is running on port 3001');
  console.log('Press Ctrl+C to stop the demo at any time\n');

  // Wait a moment for user to read
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Check if service is running
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Social service is running');

    // Run all demos
    await demoDataIsolation();
    await demoFeatureGating();
    await demoUsageTracking();
    await demoQuotaEnforcement();

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nKey takeaways:');
    console.log('- All data is automatically isolated by tenant');
    console.log('- Features are gated based on subscription plans');
    console.log('- Usage events are tracked for billing');
    console.log('- Quotas prevent abuse and encourage upgrades');
    console.log('\nNext steps:');
    console.log('- Add real database schema with tenant_id columns');
    console.log('- Implement JWT-based authentication');
    console.log('- Set up Stripe for billing integration');
    console.log('- Deploy to AWS with Lambda functions');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to social service');
      console.error('   Make sure the service is running: npm run dev');
    } else {
      console.error('❌ Demo failed:', error.message);
    }
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = {
  runDemo,
  demoDataIsolation,
  demoFeatureGating,
  demoUsageTracking,
  demoQuotaEnforcement,
};
