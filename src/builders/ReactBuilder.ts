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

  private async updateTsConfig(): Promise<void> {
    if (await fs.pathExists('tsconfig.json')) {
      this.logger.info('Updating TypeScript configuration...');
      
      try {
        const tsconfig = await fs.readJson('tsconfig.json');
        
        // Add worker reference if not present
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
        this.logger.warn('Could not update tsconfig.json:', error);
      }
    }
  }
}
