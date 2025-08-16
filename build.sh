#!/bin/bash

echo "Building DocGo system..."

# Build Query app
echo "Building Query app..."
cd apps/query
npm install
npm run build
cd ../..

echo "Build complete!"