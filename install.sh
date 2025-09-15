#!/bin/bash

# Quick Deploy TypeScript Installation Script

set -e

echo "🚀 Installing Quick Deploy v2.0 (TypeScript)..."

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is required. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '18.0.0') ? 0 : 1)" 2>/dev/null; then
    echo "❌ Node.js 18+ required. Current: $NODE_VERSION"
    exit 1
fi

# Install globally
if npm install -g quick-deploy@latest; then
    echo "✅ Quick Deploy installed!"
    echo "Usage: cd your-project && quick-deploy"
else
    echo "❌ Installation failed"
    exit 1
fi
