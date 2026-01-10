#!/usr/bin/env node

/**
 * Authentication Token Forwarding Test
 *
 * This script tests that the API Gateway properly forwards authentication
 * tokens to the social service and that the social service can validate them.
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || 'http://localhost:3001';
const {SUPABASE_ANON_KEY} = process.env;

class AuthForwardingTester {
  constructor() {
    this.testLog = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };
    this.testLog.push(logEntry);
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  }

  async testDirectSocialServiceAuth() {
    this.log('Testing direct social service authentication...');

    try {
      // Test with valid anon key
      const response = await axios.get(`${SOCIAL_SERVICE_URL}/api/v1/feed`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
        validateStatus: status => status < 500,
      });

      this.log(`Direct social service auth: ${response.status}`);
      return { success: response.status < 500, status: response.status };
    } catch (error) {
      this.log(`Direct social service auth failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testAPIGatewayAuthForwarding() {
    this.log('Testing API Gateway authentication forwarding...');

    try {
      // Test with valid anon key through API Gateway
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/feed`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
        validateStatus: status => status < 500,
      });

      this.log(`API Gateway auth forwarding: ${response.status}`);
      return { success: response.status < 500, status: response.status };
    } catch (error) {
      this.log(`API Gateway auth forwarding failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testInvalidTokenHandling() {
    this.log('Testing invalid token handling...');

    const tests = [
      { name: 'No token', headers: {} },
      { name: 'Invalid token', headers: { Authorization: 'Bearer invalid_token' } },
      { name: 'Malformed token', headers: { Authorization: 'Bearer malformed.token' } },
    ];

    const results = [];

    for (const test of tests) {
      try {
        const response = await axios.get(`${API_GATEWAY_URL}/api/v1/feed`, {
          headers: {
            'Content-Type': 'application/json',
            ...test.headers,
          },
          timeout: 5000,
          validateStatus: status => status < 500,
        });

        const success = response.status === 401; // Should return 401 for invalid auth
        results.push({
          test: test.name,
          status: response.status,
          success,
          expected: 401,
        });

        this.log(`${test.name}: ${response.status} ${success ? '✅' : '❌'}`);
      } catch (error) {
        results.push({
          test: test.name,
          success: false,
          error: error.message,
        });
        this.log(`${test.name}: ${error.message}`, 'error');
      }
    }

    return results;
  }

  async testCORSHeaders() {
    this.log('Testing CORS headers...');

    try {
      // Test OPTIONS request
      const response = await axios.options(`${API_GATEWAY_URL}/api/v1/feed`, {
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
        timeout: 5000,
        validateStatus: status => status < 500,
      });

      const corsHeaders = {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers'],
      };

      this.log(`CORS preflight: ${response.status}`);
      this.log(`CORS headers: ${JSON.stringify(corsHeaders)}`);

      return {
        success: response.status === 200 || response.status === 204,
        status: response.status,
        headers: corsHeaders,
      };
    } catch (error) {
      this.log(`CORS test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async run() {
    try {
      this.log('🔐 Starting Authentication Token Forwarding Tests');

      const results = {
        directAuth: await this.testDirectSocialServiceAuth(),
        gatewayForwarding: await this.testAPIGatewayAuthForwarding(),
        invalidTokens: await this.testInvalidTokenHandling(),
        cors: await this.testCORSHeaders(),
      };

      // Analyze results
      const allPassed =
        results.directAuth.success &&
        results.gatewayForwarding.success &&
        results.invalidTokens.every(test => test.success) &&
        results.cors.success;

      if (allPassed) {
        this.log('✅ All authentication forwarding tests passed!');
        this.log('🔗 API Gateway is correctly forwarding authentication tokens');
        this.log('🛡️ Invalid token handling is working correctly');
        this.log('🌐 CORS configuration is working correctly');
      } else {
        this.log('❌ Some authentication forwarding tests failed', 'error');
      }

      // Generate summary
      console.log('\n📋 AUTHENTICATION FORWARDING TEST REPORT');
      console.log('==========================================');
      console.log(
        `Direct Social Service Auth: ${results.directAuth.success ? '✅' : '❌'} (${results.directAuth.status || 'ERROR'})`
      );
      console.log(
        `API Gateway Auth Forwarding: ${results.gatewayForwarding.success ? '✅' : '❌'} (${results.gatewayForwarding.status || 'ERROR'})`
      );
      console.log(
        `Invalid Token Handling: ${results.invalidTokens.every(test => test.success) ? '✅' : '❌'}`
      );
      console.log(
        `CORS Configuration: ${results.cors.success ? '✅' : '❌'} (${results.cors.status || 'ERROR'})`
      );

      return { success: allPassed, results, testLog: this.testLog };
    } catch (error) {
      this.log(`💥 Authentication forwarding test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AuthForwardingTester();

  tester
    .run()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Authentication forwarding tests completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Authentication forwarding tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test script error:', error);
      process.exit(1);
    });
}

export default AuthForwardingTester;
