// src/deployers/CloudflareDeployer.ts
import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseDeployer, DeployConfig, DeployResult } from './BaseDeployer.js';

export class CloudflareDeployer extends BaseDeployer {
  async deploy(config: DeployConfig): Promise<DeployResult> {
    try {
      await this.ensureWrangler();
      await this.createWranglerConfig(config);
      
      this.logger.info('Deploying to Cloudflare Workers...');
      await execa('wrangler', ['deploy'], { stdio: 'inherit' });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Deployment failed' 
      };
    }
  }

  private async createWranglerConfig(config: DeployConfig): Promise<void> {
    // For frameworks that might auto-generate configs, always override to ensure consistency
    const shouldOverride = ['nextjs', 'astro', 'nuxt', 'angular'].includes(config.framework);
    
    // Never override for SvelteKit - it creates its own worker during build
    if (config.framework === 'svelte') {
      this.logger.info('Using SvelteKit-generated wrangler configuration');
      return;
    }
    
    // For static sites, always use the generated config
    if (config.framework === 'static') {
      this.logger.info('Using static site wrangler configuration');
      return;
    }
    
    // For Angular, React Router, and React - don't override if config exists (they create their own)
    if (['angular', 'react-router', 'react'].includes(config.framework) && await fs.pathExists('wrangler.jsonc')) {
      this.logger.info('Using existing wrangler configuration');
      return;
    }
    
    if (!shouldOverride && await fs.pathExists('wrangler.jsonc')) {
      this.logger.info('Using existing wrangler configuration');
      return;
    }

    const wranglerConfig = this.generateConfigForFramework(config);
    await fs.writeJson('wrangler.jsonc', wranglerConfig, { spaces: 2 });
    this.logger.info('Generated wrangler.jsonc configuration');
  }

  private generateConfigForFramework(config: DeployConfig): any {
    const baseConfig = {
      name: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      compatibility_date: new Date().toISOString().split('T')[0],
      observability: { enabled: true }
    };

    switch (config.framework) {
      case 'static':
        return this.getStaticConfig(baseConfig, config);
      case 'angular':
        return this.getAngularConfig(baseConfig, config);
      case 'nuxt':
        return this.getNuxtConfig(baseConfig, config);
      case 'astro':
        return this.getAstroConfig(baseConfig, config);
      case 'nextjs':
        return this.getNextJSConfig(baseConfig, config);
      case 'react':
        return this.getReactConfig(baseConfig, config);
      case 'remix':
        return this.getRemixConfig(baseConfig, config);
      case 'react-router':
        return this.getReactRouterConfig(baseConfig, config);
      case 'svelte':
        return this.getSvelteConfig(baseConfig, config);
      default:
        return this.getDefaultConfig(baseConfig, config);
    }
  }

  private getStaticConfig(base: any, config: DeployConfig): any {
    return {
      ...base,
      main: './worker.js',
      assets: {
        binding: 'ASSETS',
        directory: config.buildDir
      }
    };
  }

  private getAngularConfig(base: any, config: DeployConfig): any {
    // Angular is now configured as SPA (static) to avoid Node.js compatibility issues
    return {
      ...base,
      assets: {
        directory: './dist',
        not_found_handling: 'single-page-application'
      }
    };
  }

  private getNuxtConfig(base: any, config: DeployConfig): any {
    return {
      ...base,
      main: './.output/server/index.mjs',
      assets: {
        binding: 'ASSETS',
        directory: './.output/public/'
      }
    };
  }

  private getAstroConfig(base: any, config: DeployConfig): any {
    if (config.deploymentType === 'ssr' || config.deploymentType === 'hybrid') {
      // Create .assetsignore like C3 does
      this.createAssetsIgnore(config.buildDir);
      
      return {
        ...base,
        main: './dist/_worker.js/index.js',
        compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
        assets: {
          binding: 'ASSETS',
          directory: './dist'
        }
      };
    }
    
    // Static Astro
    return {
      ...base,
      assets: { not_found_handling: 'single-page-application' }
    };
  }

  private getNextJSConfig(base: any, config: DeployConfig): any {
    // Use C3's exact Next.js pattern (no R2 buckets)
    return {
      ...base,
      main: '.open-next/worker.js',
      compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
      assets: {
        binding: 'ASSETS',
        directory: '.open-next/assets'
      }
      // Note: No R2 buckets - following C3's simple template
    };
  }

  private getReactConfig(base: any, config: DeployConfig): any {
    return {
      ...base,
      main: 'worker/index.js', // or worker/index.ts
      assets: { not_found_handling: 'single-page-application' }
    };
  }

  private getReactRouterConfig(base: any, config: DeployConfig): any {
    return {
      ...base,
      main: './build/server/index.js',
      compatibility_flags: ['nodejs_compat'],
      assets: {
        binding: 'ASSETS',
        directory: './build/client'
      }
    };
  }

  private getRemixConfig(base: any, config: DeployConfig): any {
    // Create .assetsignore for Remix
    this.createAssetsIgnore('build/client');
    
    return {
      ...base,
      main: './server.ts',
      compatibility_flags: ['nodejs_compat'],
      assets: { directory: './build/client' }
    };
  }

  private getSvelteConfig(base: any, config: DeployConfig): any {
    // SvelteKit creates its own wrangler config during build
    // This method shouldn't be called, but return basic config just in case
    return {
      ...base,
      main: '.svelte-kit/cloudflare/_worker.js',
      compatibility_flags: ['nodejs_als'],
      assets: {
        binding: 'ASSETS',
        directory: '.svelte-kit/cloudflare'
      }
    };
  }

  private getDefaultConfig(base: any, config: DeployConfig): any {
    return {
      ...base,
      assets: { not_found_handling: 'single-page-application' }
    };
  }

  private async createAssetsIgnore(buildDir: string): Promise<void> {
    try {
      // Ensure the build directory exists
      await fs.ensureDir(buildDir);
      
      // Create .assetsignore with the content that C3 uses
      const assetsIgnoreContent = '_worker.js\n_routes.json';
      await fs.writeFile(`${buildDir}/.assetsignore`, assetsIgnoreContent);
      
      this.logger.info(`Created .assetsignore in ${buildDir}/`);
    } catch (error) {
      this.logger.warn(`Could not create .assetsignore: ${error}`);
    }
  }

  async validateDeployment(deploymentId: string): Promise<boolean> {
    try {
      await execa('wrangler', ['deployments', 'view', deploymentId], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const result = await execa('wrangler', ['tail', '--deployment-id', deploymentId], { stdio: 'pipe' });
      return result.stdout.split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }
}
