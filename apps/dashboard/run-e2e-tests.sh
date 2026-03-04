#!/bin/bash

# E2E Test Runner Script
# This script ensures the dev server is running before executing E2E tests

set -e

echo "🎭 IntelliDent E2E Test Runner"
echo "=============================="
echo ""

# Check if dev server is running
echo "🔍 Checking for dev server on http://localhost:3000..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Dev server is running"
else
  echo "❌ Dev server is not running on port 3000"
  echo ""
  echo "Please start the dev server first:"
  echo "  npm run dev -w dashboard"
  echo ""
  exit 1
fi

# Initialize database schema
echo ""
echo "🗄️  Initializing test database..."
curl -s "http://localhost:3000/api/init?secret=e2e-secret-key" > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Database initialized"
else
  echo "⚠️  Database initialization may have failed (continuing anyway)"
fi

# Run E2E tests
echo ""
echo "🧪 Running E2E tests..."
echo ""
E2E_TEST_SECRET=e2e-secret-key npx playwright test "$@"

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All E2E tests passed!"
else
  echo "❌ Some E2E tests failed"
  echo ""
  echo "To view the test report:"
  echo "  npx playwright show-report"
fi

exit $TEST_EXIT_CODE
