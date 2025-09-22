import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseBuilder, BuildConfig, BuildResult } from './BaseBuilder.js';

export class NextJSBuilder extends BaseBuilder {
  async configure(): Promise<void> {
    this.logger.info('Installing OpenNext Cloudflare adapter...');

    const packageManager = await this.detectPackageManager();

    try {
      // Check and fix Turbopack issue first
      await this.checkTurbopackIssue();

      // Install @opennextjs/cloudflare like C3 does
      await execa(packageManager, ['add', '@opennextjs/cloudflare@^1.3.0'], { stdio: 'inherit' });
      this.logger.success('OpenNext Cloudflare adapter installed');

      await this.updateNextConfig();
      
      // Handle edge runtime issues before building
      await this.handleEdgeRuntimeIssues();
    } catch (error) {
      this.logger.error('Failed to configure Next.js:', error);
      throw error;
    }
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    this.logger.info('Building Next.js project with OpenNext...');

    try {
      // Use OpenNext build command
      await execa('npx', ['opennextjs-cloudflare', 'build'], { stdio: 'inherit' });

      const buildDir = await this.findBuildDirectory(['.open-next', 'out', '.next']);

      return {
        success: true,
        buildDir,
        deploymentType: 'ssr' // OpenNext is always SSR
      };
    } catch (error) {
      this.logger.error('Next.js build failed:', error);
      throw error;
    }
  }

  private async checkTurbopackIssue(): Promise<void> {
    try {
      const packageJson = await fs.readJson('package.json');
      const buildScript = packageJson.scripts?.build;
      
      if (buildScript?.includes('--turbopack')) {
        this.logger.warn('Detected Turbopack in build script - this is not compatible with OpenNext');
        this.logger.info('Updating build script to use standard Next.js build...');
        
        // Remove --turbopack flag from build script
        packageJson.scripts.build = buildScript.replace(' --turbopack', '').replace('--turbopack ', '').replace('--turbopack', '');
        
        // Ensure we have a clean build command
        if (!packageJson.scripts.build.includes('next build')) {
          packageJson.scripts.build = 'next build';
        }
        
        await fs.writeJson('package.json', packageJson, { spaces: 2 });
        
        this.logger.success('Fixed build script - removed --turbopack flag');
      }
    } catch (error) {
      this.logger.debug('Could not check/fix Turbopack issue:', error);
    }
  }

  private async updateNextConfig(): Promise<void> {
    const configFiles = ['next.config.ts', 'next.config.mjs', 'next.config.js'];
    let configFile = null;

    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        configFile = file;
        break;
      }
    }

    if (configFile) {
      this.logger.info(`Updating ${configFile} for OpenNext...`);

      const isTypeScript = configFile.endsWith('.ts');
      const content = await fs.readFile(configFile, 'utf8');

      // Add OpenNext initialization (like C3 does)
      const openNextImport = `
// added by quick-deploy to enable calling \`getCloudflareContext()\` in \`next dev\`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
`;

      const updatedContent = content + openNextImport;
      await fs.writeFile(configFile, updatedContent);

      this.logger.success(`Updated ${configFile} with OpenNext configuration`);
    }

    // Create open-next.config.ts if it doesn't exist
    if (!await fs.pathExists('open-next.config.ts')) {
      const openNextConfig = `import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Uncomment to enable R2 cache,
  // It should be imported as:
  // \`import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";\`
  // See https://opennext.js.org/cloudflare/caching for more details
  // incrementalCache: r2IncrementalCache,
});`;

      await fs.writeFile('open-next.config.ts', openNextConfig);
      this.logger.info('Created open-next.config.ts');
    }
  }

  private async handleEdgeRuntimeIssues(): Promise<void> {
    this.logger.info('Checking for edge runtime compatibility issues...');
    
    try {
      const apiRoutes = await this.findApiRoutes();
      const edgeRoutes = [];
      
      for (const route of apiRoutes) {
        try {
          const content = await fs.readFile(route, 'utf8');
          
          if (content.includes("export const runtime = 'edge'") || 
              content.includes('export const runtime = "edge"')) {
            edgeRoutes.push(route);
          }
        } catch (error) {
          // Skip files that can't be read
          this.logger.debug(`Could not read ${route}: ${error}`);
        }
      }
      
      if (edgeRoutes.length > 0) {
        this.logger.warn('Found edge runtime API routes that are incompatible with OpenNext:');
        edgeRoutes.forEach(route => this.logger.warn(`  - ${route}`));
        this.logger.info('Converting edge runtime to Node.js runtime for OpenNext compatibility...');
        
        for (const route of edgeRoutes) {
          await this.convertEdgeToNodejs(route);
        }
        
        this.logger.success(`Converted ${edgeRoutes.length} edge runtime routes to Node.js runtime`);
        this.logger.info('Note: Edge runtime features may behave differently in Node.js runtime');
      } else {
        this.logger.debug('No edge runtime issues found');
      }
    } catch (error) {
      this.logger.debug('Could not check for edge runtime issues:', error);
    }
  }

  private async findApiRoutes(): Promise<string[]> {
    const routes: string[] = [];
    
    try {
      // Look for API routes in common Next.js locations - include .tsx and .jsx
      const patterns = [
        'app/api/**/route.{ts,js,tsx,jsx}',
        'pages/api/**/*.{ts,js,tsx,jsx}',
        'src/app/api/**/route.{ts,js,tsx,jsx}',
        'src/pages/api/**/*.{ts,js,tsx,jsx}'
      ];
      
      const { globby } = await import('globby');
      
      for (const pattern of patterns) {
        const files = await globby(pattern);
        routes.push(...files);
      }
    } catch (error) {
      this.logger.debug('Could not search for API routes:', error);
      
      // Fallback: manually search common locations if globby fails
      const commonPaths = [
        'app/api/og/route.tsx',
        'app/api/og/route.ts',
        'app/api/og/route.jsx',
        'app/api/og/route.js',
        'pages/api/og.tsx',
        'pages/api/og.ts',
        'pages/api/og.jsx',
        'pages/api/og.js'
      ];
      
      for (const path of commonPaths) {
        if (await fs.pathExists(path)) {
          routes.push(path);
        }
      }
    }
    
    return routes;
  }

  private async convertEdgeToNodejs(routePath: string): Promise<void> {
    try {
      let content = await fs.readFile(routePath, 'utf8');
      
      // Remove edge runtime export lines
      content = content.replace(/export const runtime = ['"]edge['"][;\n]?/g, '');
      content = content.replace(/export const runtime=['"]edge['"][;\n]?/g, '');
      
      // Add a comment explaining the change
      const comment = `// Note: Edge runtime converted to Node.js runtime by quick-deploy for OpenNext compatibility\n`;
      
      // Add comment at the top if not already present
      if (!content.includes('Edge runtime converted to Node.js runtime')) {
        content = comment + content;
      }
      
      await fs.writeFile(routePath, content);
      this.logger.info(`Converted ${routePath} from edge to Node.js runtime`);
    } catch (error) {
      this.logger.warn(`Could not convert ${routePath}: ${error}`);
    }
  }
}
