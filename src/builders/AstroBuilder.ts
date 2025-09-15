import fs from 'fs-extra';
import { BaseBuilder } from './BaseBuilder.js';
import { BuildOptions, BuildResult } from '../types/index.js';

export class AstroBuilder extends BaseBuilder {
  async build(options: BuildOptions): Promise<BuildResult> {
    this.logger.info('Building Astro project...');

    try {
      await this.runBuildCommand(options.packageManager);
      const buildDir = await this.detectBuildOutput();

      return {
        success: true,
        buildDir,
        deploymentType: 'static',
        framework: 'astro'
      };
    } catch (error) {
      // Show the actual error instead of swallowing it
      this.logger.error('Astro build failed:', error);
      throw error; // Re-throw so we can see what actually failed
    }
  }

  async detectBuildOutput(): Promise<string> {
    return this.findBuildDirectory(['dist']);
  }

  async validateEnvironment(): Promise<boolean> {
    const packageJson = await fs.readJson('package.json');
    return !!packageJson.dependencies?.astro || !!packageJson.devDependencies?.astro;
  }
}
