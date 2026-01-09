#!/usr/bin/env node

/**
 * Simple Social Service Test Script
 *
 * Tests the social service endpoints without requiring full environment setup
 */

import axios from 'axios';

const SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || 'http://localhost:3001';

class SocialServiceTester {
  constructor() {
    this.testResults = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  }

  async testEndpoint(method, path, description, expectedStatus = [200, 401, 403]) {
    try {
      this.log(`Testing ${method} ${path} - ${description}`);

      const response = await axios({
        method,
        url: `${SOCIAL_SERVICE_URL}${path}`,
        timeout: 5000,
        validateStatus: () => true, // Accept all status codes
      });

      const success = expectedStatus.includes(response.status);
      const result = {
        endpoint: `${method} ${path}`,
        description,
        status: response.status,
        success,
        responseTime: response.headers['x-response-time'] || 'unknown',
      };

      this.testResults.push(result);
      this.log(
        `${success ? '✅' : '❌'} ${description}: ${response.status} (${result.responseTime})`
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

  async runTests() {
    this.log('🚀 Starting Social Service Tests...');
    this.log(`Testing service at: ${SOCIAL_SERVICE_URL}`);

    // Test health endpoint (should work without auth)
    await this.testEndpoint('GET', '/health', 'Health Check', [200]);
    await this.testEndpoint('GET', '/health/ready', 'Readiness Check', [200]);
    await this.testEndpoint('GET', '/health/live', 'Liveness Check', [200]);

    // Test protected endpoints (should return 401 without auth)
    await this.testEndpoint('GET', '/api/v1/feed', 'Social Feed', [401]);
    await this.testEndpoint('GET', '/api/v1/posts/user/test-id', 'User Posts', [401]);
    await this.testEndpoint('GET', '/api/v1/stories', 'Stories', [401]);
    await this.testEndpoint('POST', '/api/v1/posts', 'Create Post', [401]);
    await this.testEndpoint('POST', '/api/v1/comments', 'Create Comment', [401]);
    await this.testEndpoint('POST', '/api/v1/likes/posts/test-id', 'Like Post', [401]);
    await this.testEndpoint('POST', '/api/v1/shares/posts/test-id', 'Share Post', [401]);

    // Test 404 endpoints
    await this.testEndpoint('GET', '/api/v1/nonexistent', 'Non-existent Endpoint', [404]);

    return this.generateReport();
  }

  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.success).length;
    const failedTests = totalTests - passedTests;

    this.log('\n📊 TEST REPORT');
    this.log('==============');
    this.log(`Total Tests: ${totalTests}`);
    this.log(`Passed: ${passedTests}`);
    this.log(`Failed: ${failedTests}`);
    this.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      this.log('\n❌ Failed Tests:');
      this.testResults
        .filter(test => !test.success)
        .forEach(test => {
          this.log(
            `   ${test.endpoint} - ${test.description}: ${test.status}${test.error ? ` (${test.error})` : ''}`
          );
        });
    }

    const serviceHealthy = this.testResults
      .filter(test => test.endpoint.includes('/health'))
      .every(test => test.success);

    const authWorking = this.testResults
      .filter(test => test.endpoint.includes('/api/v1/') && !test.endpoint.includes('/health'))
      .every(test => test.status === 401 || test.status === 403);

    this.log('\n🔍 Service Analysis:');
    this.log(`Health Endpoints: ${serviceHealthy ? '✅ Working' : '❌ Issues detected'}`);
    this.log(
      `Authentication: ${authWorking ? '✅ Working (401/403 responses)' : '❌ Issues detected'}`
    );

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      serviceHealthy,
      authWorking,
      results: this.testResults,
    };
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SocialServiceTester();

  tester
    .runTests()
    .then(report => {
      if (report.serviceHealthy && report.authWorking) {
        console.log('\n🎉 Social service is ready for migration!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Social service has issues that need to be addressed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test script error:', error);
      process.exit(1);
    });
}

export default SocialServiceTester;
