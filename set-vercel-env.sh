#!/bin/bash

# Set environment variables for Vercel
cd apps/dashboard

echo "Setting NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY..."
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production development <<EOF
pk_test_ZmFzdC1zbHVnLTIwLmNsZXJrLmFjY291bnRzLmRldiQ
EOF

echo "Setting CLERK_SECRET_KEY..."
vercel env add CLERK_SECRET_KEY production development <<EOF
sk_test_crBgTNjj29CD0HgKtf9MLCyIHQvil9u0u9aIuaiI77
EOF

echo "Setting GEMINI_API_KEY..."
vercel env add GEMINI_API_KEY production development <<EOF
AIzaSyB1yjy8gjMg5RJCK1_Xg4bSr4-7u1rSXI0
EOF

echo "Setting E2E_TEST_SECRET..."
vercel env add E2E_TEST_SECRET production development <<EOF
e2e-secret-key
EOF

echo ""
echo "✅ Environment variables set!"
echo ""
echo "⚠️  You still need to set:"
echo "1. DATABASE_URL (get from Neon dashboard)"
echo "2. NEXT_PUBLIC_APP_URL (will be set after first deployment)"
echo ""
echo "To set DATABASE_URL, run:"
echo "  cd apps/dashboard"
echo "  vercel env add DATABASE_URL production development"
echo "  (then paste your Neon connection string)"
