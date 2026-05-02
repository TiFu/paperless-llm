#!/bin/bash

# Start the frontend development server (Vite)

set -e

echo "🚀 Starting Paperless LLM Frontend"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js (>= 18.0.0) from https://nodejs.org/"
    exit 1
fi

# Navigate to frontend directory
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo ""
fi

echo "✅ Starting frontend on http://localhost:5173"
echo "   (Vite HMR enabled - instant updates on file changes)"
echo ""

# Start Vite dev server
exec npm run dev
