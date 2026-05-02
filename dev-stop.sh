#!/bin/bash

# Helper script to stop the development environment (no Docker)

set -e

echo "🛑 Stopping Paperless LLM Development Environment"
echo ""

# Kill nodemon processes
if pgrep -f "nodemon.*ts-node" > /dev/null; then
    echo "Stopping backend (nodemon)..."
    pkill -f "nodemon.*ts-node" || true
fi

# Kill ts-node processes
if pgrep -f "ts-node.*api.ts" > /dev/null; then
    echo "Stopping backend (ts-node)..."
    pkill -f "ts-node.*api.ts" || true
fi

# Kill Vite dev server
if pgrep -f "vite.*dev" > /dev/null; then
    echo "Stopping frontend (Vite)..."
    pkill -f "vite.*dev" || true
fi

# Also check for npm processes running dev
if pgrep -f "npm.*run.*dev" > /dev/null; then
    echo "Stopping frontend (npm)..."
    pkill -f "npm.*run.*dev" || true
fi

echo ""
echo "✅ Development environment stopped"
