# Quick Deploy

One-command deployment for web frameworks to Cloudflare Workers.

```bash
cd your-project
quick-deploy
```

## 🚀 Supported Frameworks

| Framework | Status | Deployment Type | Notes |
|-----------|--------|----------------|-------|
| **Next.js** | ✅ Working | SSR | Uses OpenNext adapter, handles Turbopack issues |
| **Astro** | ✅ Working | SSR/Static | Uses @astrojs/cloudflare adapter |
| **SvelteKit** | ✅ Working | SSR | Uses @sveltejs/adapter-cloudflare |
| **React + Vite** | ✅ Working | Static SPA | Uses @cloudflare/vite-plugin |
| **React Router v7** | ⚠️ Partial | SSR | Requires Cloudflare template (see below) |

## 📦 Installation

### Quick Install (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/username/quick-deploy/main/install.sh | bash
```

### NPM Install
```bash
npm install -g quick-deploy@latest
```

### From Source
```bash
git clone https://github.com/username/quick-deploy.git
cd quick-deploy
npm install
npm run build
npm link
```

## 🎯 Usage

### Basic Deployment
```bash
# Navigate to your project
cd my-nextjs-app

# Deploy with one command
quick-deploy
```

### Available Commands
```bash
quick-deploy                 # Deploy current project
quick-deploy init           # Initialize configuration  
quick-deploy doctor         # Run diagnostic checks
quick-deploy clean          # Clean build artifacts
quick-deploy --help         # Show all options
```

### Command Options
```bash
quick-deploy [options]

Options:
  -v, --verbose              Enable verbose logging
  -f, --force               Force deployment even if checks fail
  --skip-deps               Skip dependency installation
  --skip-env                Skip environment variable checks
  -o, --output-dir <dir>    Specify custom output directory
  -c, --config <file>       Use custom configuration file
  --help                    Show help
  --version                 Show version
```

## 🔧 Framework-Specific Setup

### Next.js
```bash
# Create Next.js project
npx create-next-app@latest my-app --typescript --eslint --tailwind --src-dir --app --import-alias "@/*"
cd my-app
quick-deploy
```

**Features:**
- ✅ Automatic Turbopack detection and fix
- ✅ OpenNext adapter installation and configuration
- ✅ Proper wrangler.jsonc generation
- ✅ TypeScript support

### Astro
```bash
# Create Astro project
npm create astro@latest my-astro-site -- --template minimal --typescript strict
cd my-astro-site
npm install
quick-deploy
```

**Features:**
- ✅ Interactive adapter installation via `astro add cloudflare`
- ✅ Automatic SSR/Static/Hybrid detection
- ✅ Proper asset handling with .assetsignore

### SvelteKit
```bash
# Create SvelteKit project
npx sv create my-svelte-app
cd my-svelte-app
# Choose: SvelteKit minimal, TypeScript syntax, no additional features, npm
quick-deploy
```

**Features:**
- ✅ Cloudflare adapter installation and configuration
- ✅ TypeScript definitions update
- ✅ Automatic config file updates

### React + Vite
```bash
# Create React + Vite project
npm create vite@latest my-react-app -- --template react-ts
cd my-react-app
npm install
quick-deploy
```

**Features:**
- ✅ Cloudflare Vite plugin installation
- ✅ Worker file generation with proper TypeScript types
- ✅ SPA routing configuration

### React Router v7 (New Remix)
```bash
# IMPORTANT: Must use Cloudflare template
npx create-react-router@latest my-app --template https://github.com/remix-run/react-router-templates/tree/main/cloudflare
cd my-app
npm install
quick-deploy
```

**Important:** React Router v7 requires the Cloudflare-specific template. Generic templates won't work on Cloudflare Workers.

## 🔍 How It Works

1. **Framework Detection**: Analyzes your project to identify the framework
2. **Dependency Management**: Installs required Cloudflare adapters
3. **Configuration**: Creates/updates config files for Cloudflare deployment
4. **Build**: Runs the appropriate build command for your framework
5. **Deploy**: Uses Wrangler to deploy to Cloudflare Workers

## 🏗️ Architecture

```
src/
├── builders/           # Framework-specific build logic
│   ├── NextJSBuilder.ts
│   ├── AstroBuilder.ts  
│   ├── ReactBuilder.ts
│   ├── SvelteBuilder.ts
│   └── BaseBuilder.ts
├── deployers/          # Deployment handlers
│   ├── CloudflareDeployer.ts
│   └── BaseDeployer.ts
├── core/               # Core functionality
│   ├── QuickDeploy.ts
│   └── FrameworkDetector.ts
└── utils/              # Utilities
    ├── Logger.ts
    ├── Process.ts
    └── FileSystem.ts
```

## ⚙️ Configuration

Quick Deploy works out of the box, but you can customize behavior:

### Environment Variables
```bash
# Optional: For package resolution issues
WRANGLER_BUILD_CONDITIONS=""
WRANGLER_BUILD_PLATFORM="node"
```

### Custom Configuration
```bash
# Create custom config
quick-deploy init

# Use custom config file
quick-deploy -c my-config.json
```

## 🐛 Troubleshooting

### Common Issues

**Next.js Turbopack Error**
```
Error: handler32 is not a function
```
**Solution:** Quick Deploy automatically detects and fixes Turbopack issues by updating your build script.

**Package Resolution Errors**
```
Could not resolve package X
```
**Solution:** Quick Deploy can create environment variables to fix package resolution:
```bash
WRANGLER_BUILD_CONDITIONS=""
WRANGLER_BUILD_PLATFORM="node"
```

**TypeScript Errors in Worker Files**
```
Cannot find name 'Request'
```
**Solution:** Quick Deploy automatically installs `@cloudflare/workers-types` and configures proper TypeScript support.

### Debug Mode
```bash
quick-deploy --verbose
```

### Clean Build Artifacts
```bash
quick-deploy clean
```

### Check Project Compatibility
```bash
quick-deploy doctor
```

## 📊 Framework Support Matrix

| Feature | Next.js | Astro | SvelteKit | React+Vite | React Router |
|---------|---------|-------|-----------|------------|-------------|
| SSR | ✅ | ✅ | ✅ | ❌ | ✅ |
| Static Sites | ❌ | ✅ | ❌ | ✅ | ❌ |
| API Routes | ✅ | ✅ | ✅ | ✅ | ✅ |
| TypeScript | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto Config | ✅ | ✅ | ✅ | ✅ | ⚠️ |

### Development Setup
```bash
git clone https://github.com/username/quick-deploy.git
cd quick-deploy
npm install
npm run build
npm link

# Test your changes
cd test-project
quick-deploy
```

**Quick Deploy** - Deploy modern web frameworks to Cloudflare with zero configuration.
