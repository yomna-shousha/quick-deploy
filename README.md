# Quick Deploy

One-command deployment for modern web frameworks to Cloudflare Workers & Pages.

## Features

- **🚀 One Command Deployment** - Just run `quick-deploy` in any web project
- **🔍 Smart Framework Detection** - Automatically detects Next.js, Astro, Vite, Nuxt, SvelteKit, and Remix
- **📦 Package Manager Agnostic** - Works with npm, pnpm, yarn, and bun
- **⚡ Cloudflare Optimized** - Deploys to Workers and Pages with optimal configuration
- **🔧 Auto-Configuration** - Handles complex setups like Next.js SSR with OpenNext
- **🌐 Static & SSR Support** - Supports both static sites and server-side rendering

## Supported Frameworks

| Framework | Static Export | SSR | Status |
|-----------|---------------|-----|--------|
| Next.js | ✅ | ✅ (OpenNext) | Full support |
| Astro | ✅ | ✅ | Full support |
| Vite | ✅ | ➖ | Static only |
| Nuxt | ✅ | ✅ | Full support |
| SvelteKit | ✅ | ✅ | Full support |
| Remix | ✅ | ✅ | Full support |

## Quick Start

### Installation

```bash
# One-line install
curl -fsSL https://raw.githubusercontent.com/username/quick-deploy/main/install.sh | bash

# Or clone and install
git clone https://github.com/username/quick-deploy.git
cd quick-deploy
./install.sh
```

### Usage

```bash
cd your-web-project
quick-deploy
```

That's it! The script will:
1. Detect your framework and package manager
2. Install dependencies
3. Build your project
4. Deploy to Cloudflare Workers/Pages

## Examples

### Next.js Static Site
```bash
cd my-nextjs-app
quick-deploy
# Automatically configures static export and deploys
```

### Next.js with SSR
```bash
cd my-nextjs-ssr-app
quick-deploy
# Prompts for deployment type, sets up OpenNext for SSR
```

### Astro Project
```bash
cd my-astro-site
quick-deploy
# Detects Astro, builds, and deploys automatically
```

## Configuration

### Environment Variables

Quick Deploy automatically detects if your project uses environment variables and helps you set them up:

```bash
# Creates .env template with detected variables
touch .env
echo "API_KEY=your_api_key" >> .env
echo "DATABASE_URL=your_database_url" >> .env
```

### Framework-Specific Configuration

#### Next.js Static Export
Quick Deploy can automatically configure Next.js for static export:

```javascript
// next.config.js (auto-generated)
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}
module.exports = nextConfig
```

#### Next.js SSR with OpenNext
For server-side rendering, Quick Deploy integrates with OpenNext:

```bash
# Automatically installs and configures
npm install @opennextjs/cloudflare
npx opennextjs-cloudflare build
```

## Troubleshooting

### Common Issues

#### "No package.json found"
Make sure you're in your project root directory:
```bash
cd your-project-directory
ls -la  # Should show package.json
quick-deploy
```

#### "Build failed with missing environment variables"
Create a `.env` file with required variables:
```bash
touch .env
echo "API_KEY=your_value" >> .env
echo "DATABASE_URL=your_value" >> .env
```

#### "OpenNext build failed"
Make sure your Next.js project is compatible:
```bash
# Check Next.js version (14+ recommended)
npm list next

# Try manual OpenNext setup
npm install @opennextjs/cloudflare
npx opennextjs-cloudflare build
```

#### "Wrangler not found"
Install Wrangler and authenticate:
```bash
npm install -g wrangler@latest
wrangler login
```

#### "Build directory is empty"
Check if your build script is configured correctly:
```bash
# Check package.json for build script
cat package.json | grep '"build"'

# Try manual build first
npm run build
ls -la dist/  # or out/, build/, .next/
```

### Debug Mode

Run with verbose output for troubleshooting:
```bash
# Enable debug mode (if supported)
DEBUG=1 quick-deploy

# Or check build logs
npm run build 2>&1 | tee build.log
```

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. **Fork and clone the repository**
```bash
git clone https://github.com/yourusername/quick-deploy.git
cd quick-deploy
```

2. **Install in development mode**
```bash
./install.sh
```

3. **Test with a sample project**
```bash
cd /path/to/test-project
quick-deploy
```

### Adding a New Framework

1. **Create a new builder**
```bash
# Create lib/builders/yourframework.sh
cp lib/builders/vite.sh lib/builders/yourframework.sh
# Edit the file for your framework
```

2. **Update framework detection**
```bash
# Edit lib/framework-detection.sh
# Add detection logic for your framework
```

3. **Add to main script**
```bash
# Edit quick-deploy main script
# Add case for your framework
```

4. **Test thoroughly**
```bash
# Test with real projects
./tests/test-framework.sh yourframework
```

### Project Structure

```
quick-deploy/
├── quick-deploy              # Main executable
├── lib/
│   ├── utils.sh             # Utilities and colors
│   ├── package-manager.sh   # Package manager detection
│   ├── framework-detection.sh
│   ├── builders/            # Framework-specific builders
│   │   ├── nextjs.sh
│   │   ├── astro.sh
│   │   └── ...
│   └── deployers/           # Deployment strategies
│       ├── static.sh
│       ├── opennext.sh
│       └── workers.sh
├── templates/               # Config file templates
├── tests/                   # Test scripts
└── install.sh              # Installation script
```

### Testing

```bash
# Run unit tests
./tests/run-unit-tests.sh

# Test with real projects
./tests/test-real-projects.sh

# Test specific framework
./tests/test-framework.sh nextjs
```

## Roadmap

- [ ] Support for more deployment targets (Vercel, Netlify)
- [ ] Docker containerized deployments
- [ ] CI/CD integration templates
- [ ] Advanced caching strategies
- [ ] Multi-environment deployments
- [ ] Custom domain configuration
- [ ] Performance monitoring integration

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/username/quick-deploy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/username/quick-deploy/discussions)
- **Twitter**: [@quickdeploy](https://twitter.com/quickdeploy)

## Acknowledgments

- [OpenNext](https://opennext.js.org/) for Next.js SSR support
- [Cloudflare Workers](https://workers.cloudflare.com/) for the deployment platform
- All the framework maintainers for building amazing tools
