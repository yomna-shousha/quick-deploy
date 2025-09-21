# Quick Deploy

One-command deployment for modern web frameworks to Cloudflare Workers.

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
| **Nuxt** | ✅ Working | SSR | Uses nitro-cloudflare-dev adapter |
| **Angular** | ❌ Not Working | - | Node.js compatibility issues with SSR |
| **React Router v7** | ❌ Not Working | - | Complex SSR setup incompatible with Workers |
| **Remix** | ⚠️ Legacy Only | SSR | New project creations use React Router v7 |

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

### Nuxt
```bash
# Create Nuxt project
npx nuxi@latest init my-nuxt-app
cd my-nuxt-app
npm install
quick-deploy
```

**Features:**
- ✅ Nitro Cloudflare adapter installation
- ✅ Automatic config updates for Cloudflare deployment
- ✅ TypeScript definitions for Cloudflare context

### Remix (Legacy Projects Only)
```bash
# For existing Remix projects
cd my-existing-remix-app
quick-deploy
```

**Note:** Remix v2 is in maintenance mode. New projects should use React Router v7, though React Router v7 is not currently supported by quick-deploy due to complex SSR requirements.

## ❌ Unsupported Frameworks

### Angular
Angular SSR has fundamental Node.js compatibility issues with Cloudflare Workers that prevent successful deployment. The Angular build process attempts to bundle Node.js-specific modules (fs, path, http, etc.) for browser use, which is incompatible with the Workers runtime.

### React Router v7
React Router v7's SSR implementation requires complex server-side setup that doesn't align well with Cloudflare Workers' execution model. While the framework builds successfully, proper SSR hydration on Workers requires significant additional configuration.

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
│   ├── NuxtBuilder.ts
│   ├── AngularBuilder.ts (not functional)
│   ├── ReactRouterBuilder.ts (not functional)
│   └── BaseBuilder.ts
├── deployers/          # Deployment handlers
│   ├── CloudflareDeployer.ts
│   └── BaseDeployer.ts
├── core/               # Core functionality
│   ├── QuickDeploy.ts
│   ├── FrameworkDetector.ts
│   └── EnvironmentChecker.ts (not currently used)
└── utils/              # Utilities
    ├── Logger.ts
    ├── Process.ts
    └── FileSystem.ts
```

**Note:** The `EnvironmentChecker.ts` module is implemented but not currently integrated into the deployment flow. It provides environment variable detection and build-safe placeholder generation for projects that require environment variables during build time.

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
**Solution:** Try setting environment variables to fix package resolution:
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

| Feature | Next.js | Astro | SvelteKit | React+Vite | Nuxt | Angular | React Router |
|---------|---------|-------|-----------|------------|------|---------|-------------|
| SSR | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Static Sites | ❌ | ✅ | ❌ | ✅ | ❌ | N/A | N/A |
| API Routes | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A |
| TypeScript | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A |
| Auto Config | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

## 🚀 Development

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

### Testing Framework Support
```bash
# Test each supported framework
npm create astro@latest test-astro
npx create-next-app@latest test-nextjs
npx nuxi@latest init test-nuxt
npx sv create test-svelte
npm create vite@latest test-react -- --template react-ts

# Deploy each
cd test-astro && quick-deploy
cd ../test-nextjs && quick-deploy
cd ../test-nuxt && quick-deploy
cd ../test-svelte && quick-deploy
cd ../test-react && quick-deploy
```

**Quick Deploy** - Deploy modern web frameworks to Cloudflare Workers with zero configuration.
