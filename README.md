# Quick Deploy v2.0

**One-command deployment for modern web frameworks to Cloudflare Workers**

## What it does

Quick Deploy automatically detects your web framework, configures it for deployment, and deploys it to Cloudflare with a single command. No configuration files, no complex setup - just `quick-deploy` and you're live.

### Key Features

- **🎯 Universal Framework Support** - Detects and deploys Next.js, Astro, Vite, Nuxt, SvelteKit, and Remix projects
- **🧠 Intelligent Configuration** - Automatically configures Next.js for static export or prompts for SSR options
- **📦 Package Manager Agnostic** - Works seamlessly with npm, pnpm, yarn, and bun
- **⚡ Zero Config Deployment** - Generates optimal wrangler.jsonc configurations automatically
- **🌱 Environment Detection** - Scans for missing environment variables and creates templates
- **🔧 Interactive Experience** - Prompts for deployment choices when needed (static vs SSR)
- **📱 Account Selection** - Interactive Cloudflare account selection (no hardcoded accounts)

## Quick Start

### Installation

```bash
# Install globally
npm install -g quick-deploy@latest

# Or install from source
git clone https://github.com/yourusername/quick-deploy.git
cd quick-deploy
npm install
npm run build
npm link
```

### Usage

```bash
# Navigate to any web project
cd my-awesome-app

# Deploy with one command
quick-deploy
```

That's it! Quick Deploy will:
1. Detect your framework and package manager
2. Install dependencies if needed
3. Check for environment variables
4. Configure your project for optimal deployment
5. Generate the proper wrangler.jsonc configuration
6. Deploy to Cloudflare with interactive account selection

## Supported Frameworks

| Framework | Static | SSR | Configuration |
|-----------|--------|-----|---------------|
| **Next.js** | ✅ | ✅ (OpenNext) | Auto-configures static export, prompts for SSR |
| **Astro** | ✅ | ✅ | Detects build output automatically |
| **Vite** | ✅ | ➖ | Static sites and SPAs |
| **Nuxt** | ✅ | ✅ | Static generation and SSR |
| **SvelteKit** | ✅ | ✅ | Adapter detection |
| **Remix** | ✅ | ✅ | Build output detection |

## Examples

### Next.js Project
```bash
cd my-nextjs-app
quick-deploy

# Quick Deploy will:
# - Detect it's a Next.js project
# - Ask if you want static export or SSR
# - Configure next.config.ts automatically
# - Deploy to Cloudflare
```

### Astro Project
```bash
cd my-astro-site
quick-deploy

# Quick Deploy will:
# - Detect Astro framework
# - Check for environment variables
# - Build and deploy to Cloudflare
```

### Any Framework
```bash
cd any-web-project
quick-deploy

# Works with any framework!
# Intelligent detection and configuration
```

## Commands

```bash
# Deploy (default command)
quick-deploy

# Initialize configuration
quick-deploy init

# Run diagnostic checks
quick-deploy doctor

# Clean build artifacts
quick-deploy clean

# Show help
quick-deploy --help

# Verbose output
quick-deploy --verbose
```

## Configuration

Quick Deploy works without configuration, but you can customize behavior:

### Generated Files

- `wrangler.jsonc` - Generated automatically based on your project
- `.env.example` - Created when environment variables are detected
- `quick-deploy.config.json` - Optional configuration file

### Environment Variables

Quick Deploy automatically scans your project for environment variables and helps you set them up:

```bash
# If variables are detected, you'll see:
⚠️  Missing environment variables:
  - API_KEY
  - DATABASE_URL

ℹ️  Created .env.example with variable templates
```

## Next.js Special Features

### Automatic Static Export Configuration

For Next.js projects, Quick Deploy can automatically configure static export:

```typescript
// Automatically generates this in next.config.ts
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};
```

### SSR with OpenNext

Quick Deploy supports Next.js SSR through OpenNext integration:

```bash
Deployment options for Next.js:
  1. Configure for static export (recommended - simpler)
  2. Use OpenNext for SSR deployment
  3. Exit and configure manually

Choose option (1/2/3): 
```

## Architecture

Quick Deploy v2.0 features a modular TypeScript architecture:

```
src/
├── core/              # Main application logic
├── builders/          # Framework-specific build logic
├── deployers/         # Deployment strategies
├── utils/            # Shared utilities
└── types/            # TypeScript type definitions
```

### Key Components

- **ProjectAnalyzer** - Detects frameworks, package managers, and project structure
- **Framework Builders** - Handle framework-specific build processes
- **CloudflareDeployer** - Manages Cloudflare Workers/Pages deployment
- **Environment Checker** - Validates environment and dependencies

## Development

```bash
# Clone and setup
git clone https://github.com/yourusername/quick-deploy.git
cd quick-deploy
npm install

# Development workflow
npm run dev          # Watch mode
npm run build        # Build TypeScript
npm run test         # Run tests
npm run lint         # Lint code
npm link            # Link for local testing

# Test on projects
cd ../my-test-project
quick-deploy
```

## Troubleshooting

### Common Issues

**Framework not detected:**
```bash
# Make sure you're in the project root
ls package.json  # Should exist
quick-deploy doctor  # Run diagnostics
```

**Build failures:**
```bash
# Check environment variables
quick-deploy --verbose  # See detailed logs
# Look for missing .env variables in output
```

**Deployment issues:**
```bash
# Check Cloudflare authentication
wrangler whoami
# Re-authenticate if needed
wrangler login
```

### Debug Mode

```bash
# Enable verbose logging
quick-deploy --verbose

# Check generated configuration
cat wrangler.jsonc
```

## Migration from v1.x

The bash version is preserved in `legacy-bash/` directory. Key improvements in v2.0:

- **Type Safety** - Full TypeScript with strict typing
- **Better Error Handling** - Detailed error messages and recovery suggestions
- **Interactive Configuration** - Smart prompts for deployment options
- **Modular Architecture** - Easy to extend and maintain
- **Enhanced Framework Support** - Better detection and configuration

## Contributing

We welcome contributions! Quick Deploy is built with:

- **TypeScript** for type safety
- **Commander.js** for CLI interface
- **Chalk** for colored output
- **Execa** for process execution
- **Inquirer** for interactive prompts

See the development section above for setup instructions.

**Happy deploying!** 🚀
