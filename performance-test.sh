#!/bin/bash

# Performance Testing Script for IntelliDent
# Tests key API endpoints and measures response times

echo "🔍 IntelliDent Performance Test"
echo "================================"
echo ""

BASE_URL="https://zintellident.netlify.app"

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    echo "Testing: $name"
    
    # Run 3 times and get average
    total=0
    for i in {1..3}; do
        time=$(curl -w "%{time_total}" -o /dev/null -s "$url")
        echo "  Run $i: ${time}s"
        total=$(echo "$total + $time" | bc)
    done
    
    avg=$(echo "scale=3; $total / 3" | bc)
    echo "  Average: ${avg}s"
    echo ""
}

# Test public endpoints
echo "📊 Public Endpoints"
echo "-------------------"
test_endpoint "Health Check" "$BASE_URL/api/health"
test_endpoint "Landing Page" "$BASE_URL/"

echo ""
echo "🔒 Protected Endpoints (will return 401 but measures cold start)"
echo "----------------------------------------------------------------"
test_endpoint "Stats API" "$BASE_URL/api/stats"
test_endpoint "Patients API" "$BASE_URL/api/patients"
test_endpoint "Visits API" "$BASE_URL/api/visits"

echo ""
echo "✅ Performance test complete!"
echo ""
echo "💡 Tips:"
echo "  - First request may be slower (cold start)"
echo "  - Subsequent requests should be faster (warm functions)"
echo "  - Compare these times with your local development"
