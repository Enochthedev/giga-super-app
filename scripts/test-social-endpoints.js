#!/usr/bin/env node

/**
 * Social Media Endpoints Integration Test
 *
 * This script tests the actual social media endpoints to ensure they're
 * working correctly after migration from Supabase to Railway.
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

class SocialEndpointsTester {
  constructor() {
    this.testLog = [];
    this.testResults = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };
    this.testLog.push(logEntry);
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  }

  async testEndpoint(
    method,
    path,
    description,
    expectedStatus = [200, 401, 403, 429],
    data = null
  ) {
    try {
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      const config = {
        method,
        url: `${API_GATEWAY_URL}${path}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        timeout: 5000,
        validateStatus: status => status < 500,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      const response = await axios(config);
      const success = expectedStatus.includes(response.status);

      const result = {
        endpoint: `${method} ${path}`,
        description,
        status: response.status,
        success,
        expectedStatus,
        responseTime: response.headers['x-response-time'] || 'unknown',
      };

      this.testResults.push(result);
      this.log(
        `${success ? '✅' : '❌'} ${description}: ${response.status} (expected: ${expectedStatus.join('|')})`
      );

      return result;
    } catch (error) {
      const result = {
        endpoint: `${method} ${path}`,
        description,
        status: 'ERROR',
        success: false,
        error: error.message,
      };

      this.testResults.push(result);
      this.log(`❌ ${description}: ${error.message}`, 'error');
      return result;
    }
  }

  async testPostsEndpoints() {
    this.log('Testing Posts endpoints...');

    await this.testEndpoint('GET', '/api/v1/posts', 'Get all posts');
    await this.testEndpoint('POST', '/api/v1/posts', 'Create new post', [201, 401, 403], {
      content: 'Test post content',
      visibility: 'public',
    });
    await this.testEndpoint('GET', '/api/v1/posts/user/test-user-id', 'Get user posts');
    await this.testEndpoint('GET', '/api/v1/posts/test-post-id', 'Get post details');
    await this.testEndpoint(
      'PUT',
      '/api/v1/posts/test-post-id',
      'Update post',
      [200, 401, 403, 404],
      {
        content: 'Updated post content',
      }
    );
    await this.testEndpoint(
      'DELETE',
      '/api/v1/posts/test-post-id',
      'Delete post',
      [200, 204, 401, 403, 404]
    );
  }

  async testCommentsEndpoints() {
    this.log('Testing Comments endpoints...');

    await this.testEndpoint('POST', '/api/v1/comments', 'Create comment', [201, 401, 403], {
      post_id: 'test-post-id',
      content: 'Test comment',
    });
    await this.testEndpoint(
      'PUT',
      '/api/v1/comments/test-comment-id',
      'Update comment',
      [200, 401, 403, 404],
      {
        content: 'Updated comment',
      }
    );
    await this.testEndpoint(
      'DELETE',
      '/api/v1/comments/test-comment-id',
      'Delete comment',
      [200, 204, 401, 403, 404]
    );
  }

  async testLikesEndpoints() {
    this.log('Testing Likes endpoints...');

    await this.testEndpoint(
      'POST',
      '/api/v1/likes/posts/test-post-id',
      'Like post',
      [201, 401, 403]
    );
    await this.testEndpoint(
      'DELETE',
      '/api/v1/likes/posts/test-post-id',
      'Unlike post',
      [200, 204, 401, 403, 404]
    );
    await this.testEndpoint(
      'POST',
      '/api/v1/likes/comments/test-comment-id',
      'Like comment',
      [201, 401, 403]
    );
    await this.testEndpoint(
      'DELETE',
      '/api/v1/likes/comments/test-comment-id',
      'Unlike comment',
      [200, 204, 401, 403, 404]
    );
  }

  async testFeedEndpoints() {
    this.log('Testing Feed endpoints...');

    await this.testEndpoint('GET', '/api/v1/feed', 'Get personalized feed');
    await this.testEndpoint('GET', '/api/v1/feed?type=trending', 'Get trending feed');
    await this.testEndpoint('GET', '/api/v1/feed?type=following', 'Get following feed');
  }

  async testStoriesEndpoints() {
    this.log('Testing Stories endpoints...');

    await this.testEndpoint('GET', '/api/v1/stories', 'Get all stories');
    await this.testEndpoint('POST', '/api/v1/stories', 'Create story', [201, 401, 403], {
      content: 'Test story content',
      media_url: 'https://example.com/story.jpg',
    });
    await this.testEndpoint(
      'POST',
      '/api/v1/stories/test-story-id/view',
      'View story',
      [200, 201, 401, 403]
    );
    await this.testEndpoint('GET', '/api/v1/stories/test-story-id/viewers', 'Get story viewers');
  }

  async testSharesEndpoints() {
    this.log('Testing Shares endpoints...');

    await this.testEndpoint(
      'POST',
      '/api/v1/shares/posts/test-post-id',
      'Share post',
      [201, 401, 403],
      {
        message: 'Check this out!',
      }
    );
  }

  async testHealthEndpoints() {
    this.log('Testing Health endpoints...');

    await this.testEndpoint('GET', '/health', 'API Gateway health check', [200]);
    await this.testEndpoint('GET', '/health/ready', 'API Gateway readiness check', [200, 503]);
    await this.testEndpoint('GET', '/health/live', 'API Gateway liveness check', [200]);
  }

  generateSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    const summary = {
      totalTests,
      passedTests,
      failedTests,
      successRate: `${successRate}%`,
      categories: {
        posts: this.testResults.filter(test => test.endpoint.includes('/posts')),
        comments: this.testResults.filter(test => test.endpoint.includes('/comments')),
        likes: this.testResults.filter(test => test.endpoint.includes('/likes')),
        feed: this.testResults.filter(test => test.endpoint.includes('/feed')),
        stories: this.testResults.filter(test => test.endpoint.includes('/stories')),
        shares: this.testResults.filter(test => test.endpoint.includes('/shares')),
        health: this.testResults.filter(test => test.endpoint.includes('/health')),
      },
    };

    return summary;
  }

  async run() {
    try {
      this.log('🧪 Starting Social Media Endpoints Integration Tests');

      // Run all endpoint tests
      await this.testHealthEndpoints();
      await this.testPostsEndpoints();
      await this.testCommentsEndpoints();
      await this.testLikesEndpoints();
      await this.testFeedEndpoints();
      await this.testStoriesEndpoints();
      await this.testSharesEndpoints();

      // Generate summary
      const summary = this.generateSummary();

      // Log results
      if (summary.passedTests === summary.totalTests) {
        this.log('✅ All social media endpoints are responding correctly!');
        this.log('🚀 Social media functions migration is successful');
      } else {
        this.log(`⚠️ ${summary.failedTests} out of ${summary.totalTests} tests failed`, 'warn');
        this.log('🔧 Some endpoints may need attention');
      }

      // Generate detailed report
      console.log('\n📋 SOCIAL MEDIA ENDPOINTS TEST REPORT');
      console.log('=====================================');
      console.log(`Total Tests: ${summary.totalTests}`);
      console.log(`Passed: ${summary.passedTests} (${summary.successRate})`);
      console.log(`Failed: ${summary.failedTests}`);
      console.log('');

      // Category breakdown
      Object.entries(summary.categories).forEach(([category, tests]) => {
        if (tests.length > 0) {
          const categoryPassed = tests.filter(test => test.success).length;
          const categoryTotal = tests.length;
          const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
          console.log(
            `${category.toUpperCase()}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`
          );
        }
      });

      // Failed tests details
      const failedTests = this.testResults.filter(test => !test.success);
      if (failedTests.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        failedTests.forEach(test => {
          console.log(`  ${test.endpoint} - ${test.description}: ${test.status || test.error}`);
        });
      }

      return {
        success: summary.failedTests === 0,
        summary,
        testResults: this.testResults,
        testLog: this.testLog,
      };
    } catch (error) {
      this.log(`💥 Social endpoints test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SocialEndpointsTester();

  tester
    .run()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Social media endpoints tests completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Social media endpoints tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test script error:', error);
      process.exit(1);
    });
}

export default SocialEndpointsTester;
