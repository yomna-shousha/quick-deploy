import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseBuilder, BuildConfig, BuildResult } from './BaseBuilder.js';

export class SvelteBuilder extends BaseBuilder {
  async configure(): Promise<void> {
    this.logger.info('Installing SvelteKit Cloudflare adapter...');
    
    const packageManager = await this.detectPackageManager();
    
    try {
      // Install @sveltejs/adapter-cloudflare like C3 does
      await execa(packageManager, ['add', '-D', '@sveltejs/adapter-cloudflare'], { stdio: 'inherit' });
      this.logger.success('SvelteKit Cloudflare adapter installed');
      
      await this.createWranglerConfig(); // Create this first
      await this.updateSvelteConfig();
      await this.updateTypeDefinitions();
    } catch (error) {
      this.logger.error('Failed to configure SvelteKit:', error);
      throw error;
    }
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    this.logger.info('Building SvelteKit project...');

    try {
      await this.runBuildCommand(config.packageManager);
      const buildDir = await this.findBuildDirectory(['.svelte-kit/cloudflare', 'build', 'dist']);

      return {
        success: true,
        buildDir,
        deploymentType: 'ssr' // SvelteKit with Cloudflare adapter is SSR
      };
    } catch (error) {
      this.logger.error('SvelteKit build failed:', error);
      throw error;
    }
  }

  private async createWranglerConfig(): Promise<void> {
    if (!await fs.pathExists('wrangler.jsonc')) {
      const projectName = await this.getProjectName();
      
      const wranglerConfig = {
        "name": projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        "main": ".svelte-kit/cloudflare/_worker.js",
        "compatibility_date": new Date().toISOString().split('T')[0],
        "compatibility_flags": ["nodejs_als"],
        "assets": {
          "binding": "ASSETS",
          "directory": ".svelte-kit/cloudflare"
        },
        "observability": {
          "enabled": true
        }
      };

      await fs.writeJson('wrangler.jsonc', wranglerConfig, { spaces: 2 });
      this.logger.info('Created wrangler.jsonc');
    }
  }

  private async updateSvelteConfig(): Promise<void> {
    if (await fs.pathExists('svelte.config.js')) {
      this.logger.info('Updating svelte.config.js...');
      
      let content = await fs.readFile('svelte.config.js', 'utf8');
      
      // Change adapter from auto to cloudflare
      content = content.replace(
        /@sveltejs\/adapter-auto/g,
        '@sveltejs/adapter-cloudflare'
      );
      
      // Also handle any adapter() calls to use cloudflare options
      if (content.includes('adapter()')) {
        content = content.replace(
          /adapter\(\)/g,
          'adapter()'
        );
      }
      
      await fs.writeFile('svelte.config.js', content);
      this.logger.success('Updated svelte.config.js to use Cloudflare adapter');
    }
  }

  private async updateTypeDefinitions(): Promise<void> {
    if (await fs.pathExists('src/app.d.ts')) {
      this.logger.info('Updating global type definitions...');
      
      let content = await fs.readFile('src/app.d.ts', 'utf8');
      
      // Add Platform interface if not present
      if (!content.includes('interface Platform')) {
        const platformInterface = `
    interface Platform {
      env: Env;
      cf: CfProperties;
      ctx: ExecutionContext;
    }`;
        
        // Insert before the closing brace of App namespace
        content = content.replace(
          /(declare global\s*{[\s\S]*?namespace App\s*{[\s\S]*?)(}[\s\S]*?})/,
          `$1${platformInterface}\n  $2`
        );
        
        await fs.writeFile('src/app.d.ts', content);
        this.logger.success('Updated app.d.ts with Platform interface');
      }
    }

    // Create worker-configuration.d.ts if it doesn't exist
    if (!await fs.pathExists('worker-configuration.d.ts')) {
      const workerTypes = `/// <reference types="@cloudflare/workers-types" />

interface Env {
  // Add your environment variables here
  // Example:
  // MY_VAR: string;
  // MY_SECRET: string;
}`;

      await fs.writeFile('worker-configuration.d.ts', workerTypes);
      this.logger.info('Created worker-configuration.d.ts');
    }
  }

  private async getProjectName(): Promise<string> {
    try {
      const packageJson = await fs.readJson('package.json');
      return packageJson.name || 'sveltekit-app';
    } catch {
      return 'sveltekit-app';
    }
  }
}
