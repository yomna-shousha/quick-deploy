import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseBuilder, BuildConfig, BuildResult } from './BaseBuilder.js';

export class NuxtBuilder extends BaseBuilder {
  async configure(): Promise<void> {
    this.logger.info('Installing Nuxt Cloudflare adapter...');
    
    const packageManager = await this.detectPackageManager();
    
    try {
      // Install nitro-cloudflare-dev and nitropack like C3 does
      const packages = ['nitro-cloudflare-dev', 'nitropack'];
      
      // When using pnpm, explicitly add h3 package so the H3Event type declaration can be updated
      if (packageManager === 'pnpm') {
        packages.push('h3');
      }
      
      await execa(packageManager, ['add', '-D', ...packages], { stdio: 'inherit' });
      this.logger.success('Nuxt Cloudflare adapter installed');
      
      await this.updateNuxtConfig();
      await this.createTypeDefinitions();
      await this.createWranglerConfig();
    } catch (error) {
      this.logger.error('Failed to configure Nuxt:', error);
      throw error;
    }
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    this.logger.info('Building Nuxt project...');

    try {
      await this.runBuildCommand(config.packageManager);
      const buildDir = await this.findBuildDirectory(['.output', 'dist']);

      return {
        success: true,
        buildDir,
        deploymentType: 'ssr' // Nuxt with Cloudflare is SSR
      };
    } catch (error) {
      this.logger.error('Nuxt build failed:', error);
      throw error;
    }
  }

  private async updateNuxtConfig(): Promise<void> {
    const configFiles = ['nuxt.config.ts', 'nuxt.config.js'];
    let configFile = null;
    
    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        configFile = file;
        break;
      }
    }

    if (configFile) {
      this.logger.info(`Updating ${configFile} for Cloudflare...`);
      
      let content = await fs.readFile(configFile, 'utf8');
      
      // Check if already configured
      if (content.includes('nitro-cloudflare-dev') && content.includes('cloudflare_module')) {
        this.logger.info('Nuxt config already configured for Cloudflare');
        return;
      }
      
      // Add the configuration like C3 does
      const nitroConfig = `
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },
  modules: ['nitro-cloudflare-dev'],`;
      
      // Find the defineNuxtConfig call and add our config
      if (content.includes('defineNuxtConfig({')) {
        // Add to existing config object
        content = content.replace(
          /defineNuxtConfig\(\{/,
          `defineNuxtConfig({${nitroConfig}`
        );
      } else if (content.includes('defineNuxtConfig(')) {
        // Handle case where there might be multiline config
        content = content.replace(
          /defineNuxtConfig\(\s*\{/,
          `defineNuxtConfig({${nitroConfig}`
        );
      } else {
        // Create new config
        content = `export default defineNuxtConfig({${nitroConfig}
})`;
      }
      
      await fs.writeFile(configFile, content);
      this.logger.success(`Updated ${configFile} with Cloudflare configuration`);
    } else {
      // Create a new nuxt.config.ts
      const nuxtConfig = `export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },
  modules: ['nitro-cloudflare-dev'],
})`;
      
      await fs.writeFile('nuxt.config.ts', nuxtConfig);
      this.logger.info('Created nuxt.config.ts with Cloudflare configuration');
    }
  }

  private async createTypeDefinitions(): Promise<void> {
    // Create env.d.ts for TypeScript support like C3 does
    if (!await fs.pathExists('env.d.ts')) {
      const envTypes = `/// <reference types="./worker-configuration.d.ts" />

declare module "h3" {
  interface H3EventContext {
    cf: CfProperties;
    cloudflare: {
      request: Request;
      env: Env;
      context: ExecutionContext;
    };
  }
}

export {};`;

      await fs.writeFile('env.d.ts', envTypes);
      this.logger.info('Created env.d.ts with Cloudflare types');
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

  private async createWranglerConfig(): Promise<void> {
    if (!await fs.pathExists('wrangler.jsonc')) {
      const projectName = await this.getProjectName();
      
      const wranglerConfig = {
        "name": projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        "main": "./.output/server/index.mjs",
        "compatibility_date": new Date().toISOString().split('T')[0],
        "assets": {
          "binding": "ASSETS",
          "directory": "./.output/public/"
        },
        "observability": {
          "enabled": true
        }
      };

      await fs.writeJson('wrangler.jsonc', wranglerConfig, { spaces: 2 });
      this.logger.info('Created wrangler.jsonc');
    }
  }

  private async getProjectName(): Promise<string> {
    try {
      const packageJson = await fs.readJson('package.json');
      return packageJson.name || 'nuxt-app';
    } catch {
      return 'nuxt-app';
    }
  }
}
