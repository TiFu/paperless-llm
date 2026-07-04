#!/bin/bash

# Start the backend API server with hot reload (nodemon + ts-node)
# Background workers run as a separate process — see dev-worker-start.sh

set -e

echo "🚀 Starting Paperless LLM API Server"
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

# Captured before `cd server` — AppConfig otherwise falls back to resolving
# config.yaml relative to cwd, which would be server/ (wrong) once we cd in.
export CONFIG_PATH="$(pwd)/config.yaml"

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
npx nodemon --watch ./ --ext ts --exec "node --loader ts-node/esm src/main.ts --mode=all"
