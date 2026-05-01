#!/bin/bash
set -e

echo "=========================================="
echo "🔨 RENDER BUILD SCRIPT - AUTH SERVICE"
echo "=========================================="

echo ""
echo "📦 Step 1: Installing root dependencies..."
npm install

echo ""
echo "🔨 Step 2: Building shared package..."
cd backend/shared
npm install
npm run build
cd ../..

echo ""
echo "🔨 Step 3: Building auth-service..."
cd backend/auth-service
npm install
npm run build
cd ../..

echo ""
echo "✅ Build successful!"
echo "=========================================="
