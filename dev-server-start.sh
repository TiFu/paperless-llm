#!/bin/bash

# Start the backend server with hot reload (nodemon + ts-node)

set -e

echo "🚀 Starting Paperless LLM Backend Server"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js (>= 18.0.0) from https://nodejs.org/"
    exit 1
fi

# Check if .env exists, create from example if not
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please review and update .env with your configuration"
    echo ""
fi

# Navigate to server directory
cd server

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    echo ""
fi

# Return to root directory so .env can be found
#cd ..

echo "✅ Starting backend on http://localhost:3000"
echo "   (nodemon will watch for changes and auto-restart)"
echo ""

# Start backend with nodemon
exec npx nodemon --watch ./ --ext ts --exec "npx ts-node src/api.ts"
