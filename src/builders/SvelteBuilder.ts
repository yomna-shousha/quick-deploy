// src/builders/SvelteBuilder.ts
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

  private async updateSvelteConfig(): Promise<void> {
    if (await fs.pathExists('svelte.config.js')) {
      this.logger.info('Updating svelte.config.js...');
      
      let content = await fs.readFile('svelte.config.js', 'utf8');
      
      // Change adapter from auto to cloudflare
      content = content.replace(
        /@sveltejs\/adapter-auto/g,
        '@sveltejs/adapter-cloudflare'
      );
      
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
  }
}
