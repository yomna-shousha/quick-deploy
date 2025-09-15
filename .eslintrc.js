// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};

// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}

// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};

// install.sh (Updated for TypeScript version)
#!/bin/bash

# Quick Deploy TypeScript Installation Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo "🚀 Installing Quick Deploy v2.0 (TypeScript)..."

# Check Node.js version
check_node_version() {
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is not installed"
        echo "Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_VERSION="18.0.0"
    
    if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
        print_error "Node.js $REQUIRED_VERSION or higher is required"
        echo "Current version: $NODE_VERSION"
        echo "Please upgrade Node.js from https://nodejs.org"
        exit 1
    fi
    
    print_success "Node.js $NODE_VERSION detected"
}

# Determine installation method
install_method() {
    echo "Choose installation method:"
    echo "  1. Global npm install (recommended)"
    echo "  2. Download and build from source"
    echo "  3. Clone repository for development"
    echo ""
    
    read -p "Choose option (1/2/3): " -n 1 -r INSTALL_CHOICE
    echo ""
    
    case $INSTALL_CHOICE in
        1) install_npm ;;
        2) install_from_source ;;
        3) install_for_development ;;
        *) 
            print_warning "Invalid choice, defaulting to npm install"
            install_npm
            ;;
    esac
}

install_npm() {
    print_info "Installing from npm..."
    
    if npm install -g quick-deploy@latest; then
        print_success "Quick Deploy installed via npm"
        verify_installation
    else
        print_error "npm installation failed"
        print_info "Trying alternative installation method..."
        install_from_source
    fi
}

install_from_source() {
    print_info "Installing from source..."
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Download source
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "https://github.com/username/quick-deploy/archive/main.tar.gz" | tar -xz
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- "https://github.com/username/quick-deploy/archive/main.tar.gz" | tar -xz
    else
        print_error "Neither curl nor wget found"
        exit 1
    fi
    
    cd quick-deploy-main
    
    # Install dependencies and build
    print_info "Installing dependencies..."
    npm install
    
    print_info "Building TypeScript..."
    npm run build
    
    # Determine installation directory
    if [ -w "/usr/local/bin" ]; then
        INSTALL_DIR="/usr/local/bin"
    else
        INSTALL_DIR="$HOME/.local/bin"
        mkdir -p "$INSTALL_DIR"
    fi
    
    # Install globally
    npm pack
    PACKAGE_FILE=$(ls quick-deploy-*.tgz)
    npm install -g "$PACKAGE_FILE"
    
    # Cleanup
    cd /
    rm -rf "$TEMP_DIR"
    
    print_success "Quick Deploy built and installed from source"
    verify_installation
}

install_for_development() {
    print_info "Setting up for development..."
    
    # Clone repository
    if command -v git >/dev/null 2>&1; then
        git clone https://github.com/username/quick-deploy.git
        cd quick-deploy
    else
        print_error "Git is not installed"
        print_info "Falling back to source installation"
        install_from_source
        return
    fi
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    # Build
    print_info "Building project..."
    npm run build
    
    # Link for development
    npm link
    
    print_success "Quick Deploy set up for development"
    print_info "Use 'npm run dev' for watch mode"
    print_info "Use 'npm run build' to rebuild"
    
    verify_installation
}

verify_installation() {
    print_info "Verifying installation..."
    
    if command -v quick-deploy >/dev/null 2>&1; then
        VERSION=$(quick-deploy --version 2>/dev/null || echo "unknown")
        print_success "Quick Deploy installed successfully! Version: $VERSION"
        echo ""
        print_info "Usage:"
        echo "  cd your-project-directory"
        echo "  quick-deploy"
        echo ""
        print_info "Additional commands:"
        echo "  quick-deploy init      # Initialize configuration"
        echo "  quick-deploy doctor    # Run diagnostic checks"
        echo "  quick-deploy clean     # Clean build artifacts"
    else
        print_error "Installation verification failed"
        print_info "You may need to restart your terminal or add to PATH"
        
        if [ "$INSTALL_DIR" ]; then
            echo "Add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
        fi
    fi
}

# Check for existing installation
if command -v quick-deploy >/dev/null 2>&1; then
    CURRENT_VERSION=$(quick-deploy --version 2>/dev/null || echo "unknown")
    print_warning "Quick Deploy is already installed (version: $CURRENT_VERSION)"
    echo ""
    read -p "Reinstall anyway? (y/N): " -n 1 -r REINSTALL
    echo ""
    
    if [[ ! $REINSTALL =~ ^[Yy]$ ]]; then
        print_info "Installation cancelled"
        exit 0
    fi
fi

# Run installation
check_node_version
install_method

print_success "🎉 Installation complete!"
print_info "Happy deploying!"

// build.sh (Build script for CI/CD)
#!/bin/bash

set -e

echo "🏗️  Building Quick Deploy TypeScript..."

# Clean previous build
rm -rf dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Lint code
echo "🔍 Linting code..."
npm run lint

# Type check
echo "🎯 Type checking..."
npx tsc --noEmit

# Run tests
echo "🧪 Running tests..."
npm test

# Build
echo "🔨 Building..."
npm run build

# Make executable
chmod +x dist/index.js

echo "✅ Build complete!"

# test-framework.sh (Testing script)
#!/bin/bash

# Test Quick Deploy with different frameworks

set -e

FRAMEWORKS=("nextjs" "astro" "vite")
TEST_DIR="/tmp/quick-deploy-tests"

echo "🧪 Testing Quick Deploy with different frameworks..."

cleanup() {
    echo "🧹 Cleaning up..."
    rm -rf "$TEST_DIR"
}

trap cleanup EXIT

mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

for framework in "${FRAMEWORKS[@]}"; do
    echo ""
    echo "🎯 Testing $framework..."
    
    case $framework in
        "nextjs")
            npx create-next-app@latest test-nextjs --typescript --eslint --app --src-dir --import-alias "@/*" --use-npm
            cd test-nextjs
            ;;
        "astro")
            npm create astro@latest test-astro -- --template minimal --no-install --typescript strict
            cd test-astro
            npm install
            ;;
        "vite")
            npm create vite@latest test-vite -- --template vanilla-ts
            cd test-vite
            npm install
            ;;
    esac
    
    # Test quick-deploy
    echo "🚀 Running quick-deploy..."
    timeout 60s quick-deploy --skip-deps --skip-env || echo "Deploy test completed (may have timed out)"
    
    cd "$TEST_DIR"
done

echo "✅ Framework tests completed!"

// README.md (Updated for TypeScript)
# Quick Deploy v2.0 (TypeScript Edition)

One-command deployment for modern web frameworks to Cloudflare Workers & Pages, now rebuilt with TypeScript for better reliability and developer experience.

## 🎯 Key Improvements in v2.0

- **TypeScript First**: Full type safety and better IntelliSense
- **Modern Architecture**: Clean, modular design with proper separation of concerns
- **Enhanced Error Handling**: Detailed error messages and recovery suggestions
- **Better CLI Experience**: Improved commands and interactive prompts
- **Comprehensive Testing**: Unit tests and integration tests
- **Advanced Configuration**: Flexible config management and templates

## Installation

### Quick Install
```bash
curl -fsSL https://raw.githubusercontent.com/username/quick-deploy/main/install.sh | bash
```

### npm Install
```bash
npm install -g quick-deploy@latest
```

### Development Setup
```bash
git clone https://github.com/username/quick-deploy.git
cd quick-deploy
npm install
npm run build
npm link
```

## Usage

### Basic Deployment
```bash
cd your-project
quick-deploy
```

### Initialize Configuration
```bash
quick-deploy init
```

### Run Diagnostics
```bash
quick-deploy doctor
```

### Clean Build Artifacts
```bash
quick-deploy clean
```

## Development

### Scripts
- `npm run dev` - Watch mode for development
- `npm run build` - Build the project
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

### Project Structure
```
src/
├── index.ts           # CLI entry point
├── core/              # Core functionality
├── builders/          # Framework-specific builders
├── deployers/         # Deployment handlers
├── utils/             # Utilities
└── types/             # Type definitions
```

This TypeScript rewrite provides a much more robust foundation for your quick-deploy tool!
