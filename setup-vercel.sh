#!/bin/bash

# Vercel Setup Script for IntelliDent
# This script helps you set up your Vercel project and environment variables

set -e

echo "🚀 IntelliDent Vercel Setup"
echo "============================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed!"
    echo ""
fi

# Login to Vercel
echo "🔐 Logging into Vercel..."
vercel login
echo ""

# Link or create project
echo "🔗 Setting up Vercel project..."
echo "When prompted:"
echo "  - Set up and deploy? Y"
echo "  - Which scope? Select your account"
echo "  - Link to existing project? N (create new)"
echo "  - Project name? intellident (or your preferred name)"
echo "  - In which directory? apps/dashboard"
echo "  - Override settings? N"
echo ""
read -p "Press Enter to continue..."

cd apps/dashboard
vercel link
cd ../..

echo ""
echo "✅ Project linked!"
echo ""

# Get project info
PROJECT_ID=$(cd apps/dashboard && vercel inspect --token $(vercel whoami --token) 2>/dev/null | grep "id:" | awk '{print $2}' || echo "")

echo "📝 Now let's set up environment variables..."
echo ""
echo "I'll need the following values from you:"
echo ""

# Collect environment variables
read -p "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (from Clerk dashboard): " CLERK_PUB_KEY
read -p "CLERK_SECRET_KEY (from Clerk dashboard): " CLERK_SECRET
read -p "GEMINI_API_KEY (from Google AI Studio): " GEMINI_KEY
read -p "DATABASE_URL (from Neon dashboard): " DB_URL
read -p "E2E_TEST_SECRET (optional, press Enter to use default): " E2E_SECRET
E2E_SECRET=${E2E_SECRET:-e2e-secret-key}

echo ""
echo "🔧 Setting environment variables..."
echo ""

cd apps/dashboard

# Set environment variables for all environments
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production preview development <<EOF
$CLERK_PUB_KEY
EOF

vercel env add CLERK_SECRET_KEY production preview development <<EOF
$CLERK_SECRET
EOF

vercel env add GEMINI_API_KEY production preview development <<EOF
$GEMINI_KEY
EOF

vercel env add DATABASE_URL production preview development <<EOF
$DB_URL
EOF

vercel env add E2E_TEST_SECRET production preview development <<EOF
$E2E_SECRET
EOF

# We'll set this after first deployment
vercel env add NEXT_PUBLIC_APP_URL production preview development <<EOF
https://placeholder.vercel.app
EOF

cd ../..

echo ""
echo "✅ Environment variables set!"
echo ""
echo "🚀 Ready to deploy!"
echo ""
echo "Next steps:"
echo "1. Run: vercel --prod"
echo "2. After deployment, update NEXT_PUBLIC_APP_URL with your actual URL"
echo "3. Initialize database: curl 'https://your-url.vercel.app/api/init?secret=$E2E_SECRET'"
echo "4. Update Clerk redirect URLs in Clerk dashboard"
echo ""
