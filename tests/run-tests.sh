#!/bin/bash

# Property-Based Test Runner for Function Classification System
# This script runs the property-based tests and generates a report

set -e

echo "🧪 Function Classification Property-Based Test Runner"
echo "=================================================="

# Check if we're in the tests directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the tests directory"
    exit 1
fi

# Check for required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Warning: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables not set"
    echo "   Tests will use default values or may fail"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🎯 Running Property-Based Tests..."
echo "   - Property 1: Function Categorization Completeness (Requirements 1.1)"
echo "   - Property 2: Platform Placement Optimization (Requirements 1.2)"
echo "   - Additional consistency and logic validation properties"
echo ""

# Run the tests with coverage
echo "▶️  Executing tests..."
npm run test:coverage

# Check if tests passed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All property-based tests passed!"
    echo ""
    echo "📊 Test Summary:"
    echo "   - Function categorization completeness validated"
    echo "   - Platform placement optimization verified"
    echo "   - Algorithm consistency confirmed"
    echo "   - Integration with database validated"
    echo ""
    echo "📈 Coverage report generated in coverage/ directory"
    echo "🎉 Function classification system meets all correctness properties!"
else
    echo ""
    echo "❌ Some tests failed!"
    echo ""
    echo "🔍 Debugging tips:"
    echo "   - Check counterexamples provided by fast-check"
    echo "   - Verify database connection and credentials"
    echo "   - Review property assertions for business logic changes"
    echo "   - Run individual tests for detailed output: npm run test:property"
    exit 1
fi