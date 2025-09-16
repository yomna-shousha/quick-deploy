import fs from 'fs-extra';
import { BaseBuilder } from './BaseBuilder.js';
import { BuildOptions, BuildResult } from '../types/index.js';

export class RemixBuilder extends BaseBuilder {
  async build(options: BuildOptions): Promise<BuildResult> {
    this.logger.info('Building Remix project...');

    try {
      await this.runBuildCommand(options.packageManager);
      const buildDir = await this.detectBuildOutput();

      return {
        success: true,
        buildDir,
        deploymentType: 'ssr', // Remix is always SSR
        framework: 'remix'
      };
    } catch (error) {
      this.logger.error('Remix build failed:', error);
      throw error;
    }
  }

  async detectBuildOutput(): Promise<string> {
    const candidates = [
      'build',
      'dist',
      '.remix'
    ];

    return this.findBuildDirectory(candidates);
  }

  async validateEnvironment(): Promise<boolean> {
    const packageJson = await fs.readJson('package.json');
    return !!packageJson.dependencies?.['@remix-run/node'] ||
           !!packageJson.dependencies?.['@remix-run/react'] ||
           !!packageJson.devDependencies?.['@remix-run/dev'];
  }
}
