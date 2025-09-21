// src/builders/RemixBuilder.ts
import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseBuilder, BuildConfig, BuildResult } from './BaseBuilder.js';

export class RemixBuilder extends BaseBuilder {
  async configure(): Promise<void> {
    this.logger.info('Installing latest Wrangler for Remix...');
    
    const packageManager = await this.detectPackageManager();
    
    try {
      // Update wrangler like C3 does
      await execa(packageManager, ['add', '-D', 'wrangler@latest'], { stdio: 'inherit' });
      this.logger.success('Wrangler updated');
    } catch (error) {
      this.logger.error('Failed to configure Remix:', error);
      throw error;
    }
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    this.logger.info('Building Remix project...');

    try {
      await this.runBuildCommand(config.packageManager);
      const buildDir = await this.findBuildDirectory(['build', 'dist']);

      return {
        success: true,
        buildDir,
        deploymentType: 'ssr' // Remix is always SSR
      };
    } catch (error) {
      this.logger.error('Remix build failed:', error);
      throw error;
    }
  }
}
