import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseBuilder, BuildConfig, BuildResult } from './BaseBuilder.js';

export class ReactBuilder extends BaseBuilder {
  async configure(): Promise<void> {
    this.logger.info('Installing Cloudflare Vite plugin...');
    
    const packageManager = await this.detectPackageManager();
    
    try {
      // Install @cloudflare/vite-plugin like C3 does
      await execa(packageManager, ['add', '-D', '@cloudflare/vite-plugin'], { stdio: 'inherit' });
      this.logger.success('Cloudflare Vite plugin installed');
      
      await this.updateViteConfig();
      await this.updateTsConfig();
      await this.createWorkerFiles();
      await this.createWranglerConfig(); // Add this line
    } catch (error) {
      this.logger.error('Failed to configure React:', error);
      throw error;
    }
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    this.logger.info('Building React project...');

    try {
      await this.runBuildCommand(config.packageManager);
      const buildDir = await this.findBuildDirectory(['dist', 'build']);

      return {
        success: true,
        buildDir,
        deploymentType: 'static' // React with Vite is typically static
      };
    } catch (error) {
      this.logger.error('React build failed:', error);
      throw error;
    }
  }

  private async updateViteConfig(): Promise<void> {
    const configFiles = ['vite.config.ts', 'vite.config.js'];
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
      
      // Add cloudflare import if not present
      if (!content.includes('@cloudflare/vite-plugin')) {
        // Find the last import and add cloudflare import after it
        const lines = content.split('\n');
        let lastImportIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line && line.trim().startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        
        if (lastImportIndex >= 0) {
          lines.splice(lastImportIndex + 1, 0, "import { cloudflare } from '@cloudflare/vite-plugin';");
        }
        
        // Add cloudflare() to plugins array
        content = lines.join('\n');
        content = content.replace(
          /plugins:\s*\[(.*?)\]/s,
          (match, plugins) => {
            if (plugins.includes('cloudflare()')) {
              return match; // Already has cloudflare
            }
            const cleanPlugins = plugins.trim();
            const newPlugins = cleanPlugins ? `${cleanPlugins}, cloudflare()` : 'cloudflare()';
            return `plugins: [${newPlugins}]`;
          }
        );
        
        await fs.writeFile(configFile, content);
        this.logger.success(`Updated ${configFile} with Cloudflare plugin`);
      }
    }
  }

  private async createWranglerConfig(): Promise<void> {
    if (!await fs.pathExists('wrangler.jsonc')) {
      const isTypeScript = await fs.pathExists('tsconfig.json');
      const projectName = await this.getProjectName();
      
      const wranglerConfig = {
        "name": projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        "main": isTypeScript ? "worker/index.ts" : "worker/index.js",
        "compatibility_date": "2025-03-01",
        "assets": { "not_found_handling": "single-page-application" },
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
      return packageJson.name || 'react-app';
    } catch {
      return 'react-app';
    }
  }

  private async updateTsConfig(): Promise<void> {
    if (await fs.pathExists('tsconfig.json')) {
      this.logger.info('Updating TypeScript configuration...');
      
      try {
        const tsconfig = await fs.readJson('tsconfig.json');
        
        // Only add worker reference if we're going to create the worker config
        // Don't add it yet - we'll add it after we successfully create the file
        this.logger.debug('TypeScript configuration checked');
      } catch (error) {
        this.logger.warn('Could not read tsconfig.json:', error);
      }
    }
  }

  private async createWorkerFiles(): Promise<void> {
    const isTypeScript = await fs.pathExists('tsconfig.json');

    // Create tsconfig.worker.json if TypeScript and it doesn't exist
    if (isTypeScript && !await fs.pathExists('tsconfig.worker.json')) {
      // Check what base config exists
      let baseConfig = "./tsconfig.json";
      if (await fs.pathExists('tsconfig.node.json')) {
        baseConfig = "./tsconfig.node.json";
      }

      const workerTsConfig = {
        "extends": baseConfig,
        "compilerOptions": {
          "lib": ["ES2022", "WebWorker"],
          "types": ["@cloudflare/workers-types"]
        },
        "include": ["./worker/**/*", "./worker-configuration.d.ts"],
        "exclude": ["dist", "build", "node_modules"]
      };

      await fs.writeJson('tsconfig.worker.json', workerTsConfig, { spaces: 2 });
      this.logger.info('Created tsconfig.worker.json');

      // Now add the reference to the main tsconfig.json
      try {
        const tsconfig = await fs.readJson('tsconfig.json');
        
        if (!tsconfig.references) {
          tsconfig.references = [];
        }
        
        const workerRef = { path: './tsconfig.worker.json' };
        const hasWorkerRef = tsconfig.references.some((ref: any) => 
          ref.path === './tsconfig.worker.json'
        );
        
        if (!hasWorkerRef) {
          tsconfig.references.push(workerRef);
          await fs.writeJson('tsconfig.json', tsconfig, { spaces: 2 });
          this.logger.success('Updated tsconfig.json with worker reference');
        }
      } catch (error) {
        this.logger.warn('Could not update tsconfig.json with worker reference:', error);
      }
    }

    // Create worker directory and index file if they don't exist
    if (!await fs.pathExists('worker')) {
      await fs.ensureDir('worker');
      
      const workerFile = isTypeScript ? 'worker/index.ts' : 'worker/index.js';
      
      let workerContent;
      if (isTypeScript) {
        workerContent = `/// <reference types="@cloudflare/workers-types" />

export default {
  fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> | Response {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
        message: "Hello from the API!"
      });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;`;
      } else {
        workerContent = `export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
        message: "Hello from the API!"
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};`;
      }

      await fs.writeFile(workerFile, workerContent);
      this.logger.info(`Created ${workerFile}`);
    }

    // Create worker-configuration.d.ts if TypeScript and doesn't exist
    if (isTypeScript && !await fs.pathExists('worker-configuration.d.ts')) {
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

    // Install @cloudflare/workers-types for TypeScript support
    if (isTypeScript) {
      try {
        const packageManager = await this.detectPackageManager();
        await execa(packageManager, ['add', '-D', '@cloudflare/workers-types'], { stdio: 'inherit' });
        this.logger.success('Installed @cloudflare/workers-types for proper TypeScript support');
      } catch (error) {
        this.logger.warn('Could not install @cloudflare/workers-types:', error);
      }
    }
  }
}
