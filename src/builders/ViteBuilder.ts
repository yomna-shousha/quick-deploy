import fs from 'fs-extra';
import { BaseBuilder } from './BaseBuilder.js';
import { BuildOptions, BuildResult } from '../types/index.js';

export class ViteBuilder extends BaseBuilder {
  async build(options: BuildOptions): Promise<BuildResult> {
    this.logger.info('Building Vite project...');

    try {
      await this.runBuildCommand(options.packageManager);
      const buildDir = await this.detectBuildOutput();

      return {
        success: true,
        buildDir,
        deploymentType: 'static',
        framework: 'vite'
      };
    } catch (error) {
      this.logger.error('Build failed:', error);
      return {
        success: false,
        buildDir: '',
        deploymentType: 'static',
        framework: 'vite'
      };
    }
  }

  async detectBuildOutput(): Promise<string> {
    return this.findBuildDirectory(['dist', 'build']);
  }

  async validateEnvironment(): Promise<boolean> {
    const packageJson = await fs.readJson('package.json');
    return !!packageJson.dependencies?.vite || !!packageJson.devDependencies?.vite;
  }
}
