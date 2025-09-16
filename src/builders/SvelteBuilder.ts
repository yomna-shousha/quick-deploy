import fs from 'fs-extra';
import { BaseBuilder } from './BaseBuilder.js';
import { BuildOptions, BuildResult, DeploymentType } from '../types/index.js';

export class SvelteBuilder extends BaseBuilder {
  async build(options: BuildOptions): Promise<BuildResult> {
    this.logger.info('Building Svelte project...');

    try {
      await this.runBuildCommand(options.packageManager);
      const buildDir = await this.detectBuildOutput();
      const deploymentType = await this.determineDeploymentType(buildDir);

      return {
        success: true,
        buildDir,
        deploymentType,
        framework: 'svelte'
      };
    } catch (error) {
      this.logger.error('Svelte build failed:', error);
      throw error;
    }
  }

  async detectBuildOutput(): Promise<string> {
    const candidates = [
      '.svelte-kit/output', // SvelteKit
      'build', // Svelte
      'dist',
      'public'
    ];

    return this.findBuildDirectory(candidates);
  }

  private async determineDeploymentType(buildDir: string): Promise<DeploymentType> {
    // Check for SvelteKit adapter output
    if (buildDir.includes('.svelte-kit')) {
      // Check for server files indicating SSR
      if (await fs.pathExists('.svelte-kit/output/server')) {
        return 'ssr';
      }
    }
    return 'static';
  }

  async validateEnvironment(): Promise<boolean> {
    const packageJson = await fs.readJson('package.json');
    return !!packageJson.dependencies?.svelte || 
           !!packageJson.devDependencies?.svelte ||
           !!packageJson.dependencies?.['@sveltejs/kit'] ||
           !!packageJson.devDependencies?.['@sveltejs/kit'];
  }
}
