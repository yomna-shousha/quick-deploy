import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseBuilder, BuildConfig, BuildResult } from './BaseBuilder.js';

export class AstroBuilder extends BaseBuilder {
  async configure(): Promise<void> {
    this.logger.info('Installing Astro Cloudflare adapter...');
    
    const packageManager = await this.detectPackageManager();
    
    try {
      // Use astro add command like C3 does
      await execa(packageManager, ['run', 'astro', 'add', 'cloudflare', '-y'], { stdio: 'inherit' });
      this.logger.success('Astro Cloudflare adapter installed');
    } catch {
      // Fallback to manual installation
      this.logger.info('Installing adapter manually...');
      await execa(packageManager, ['add', '@astrojs/cloudflare'], { stdio: 'inherit' });
      this.logger.info('Manual adapter installation completed');
    }
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    this.logger.info('Building Astro project...');

    try {
      await this.runBuildCommand(config.packageManager);
      const buildDir = await this.findBuildDirectory(['dist']);
      
      // Determine deployment type based on build output
      const deploymentType = await this.determineDeploymentType(buildDir);

      return {
        success: true,
        buildDir,
        deploymentType
      };
    } catch (error) {
      this.logger.error('Astro build failed:', error);
      throw error;
    }
  }

  private async determineDeploymentType(buildDir: string): Promise<'static' | 'ssr' | 'hybrid'> {
    // Check if Astro generated SSR worker
    if (await fs.pathExists(`${buildDir}/_worker.js/index.js`)) {
      // Check if also has static files (hybrid)
      if (await fs.pathExists(`${buildDir}/index.html`)) {
        return 'hybrid';
      }
      return 'ssr';
    }
    return 'static';
  }
}
