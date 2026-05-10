#!/bin/bash

# Start the backend server with hot reload (nodemon + ts-node)
# Now includes both API server and background workers

set -e

echo "🚀 Starting Paperless LLM Server (API + Workers)"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js (>= 18.0.0) from https://nodejs.org/"
    exit 1
fi

# Check if config.yaml exists, create from example if not
if [ ! -f "config.yaml" ]; then
    echo "📝 Creating config.yaml from config.example.yaml..."
    cp config.example.yaml config.yaml
    echo "⚠️  Please review and update config.yaml with your configuration"
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
echo "📝 Logging to server/dev-server.log"
echo ""

# Start backend with nodemon (pino handles logging to both console and file)
npx nodemon --watch ./ --ext ts --exec "node --loader ts-node/esm src/api.ts"
