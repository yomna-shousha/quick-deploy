// NuxtBuilder.ts
import fs from 'fs-extra';
import { BaseBuilder } from './BaseBuilder.js';
import { BuildOptions, BuildResult, DeploymentType } from '../types/index.js';

export class NuxtBuilder extends BaseBuilder {
  async build(options: BuildOptions): Promise<BuildResult> {
    this.logger.info('Building Nuxt project...');

    try {
      await this.runBuildCommand(options.packageManager);
      const buildDir = await this.detectBuildOutput();
      const deploymentType = await this.determineDeploymentType(buildDir);

      return {
        success: true,
        buildDir,
        deploymentType,
        framework: 'nuxt'
      };
    } catch (error) {
      this.logger.error('Nuxt build failed:', error);
      return {
        success: false,
        buildDir: '',
        deploymentType: 'static',
        framework: 'nuxt'
      };
    }
  }

  async detectBuildOutput(): Promise<string> {
    const candidates = [
      '.output/public', // Nuxt 3 static
      '.output', // Nuxt 3 with nitro
      'dist',
      'build'
    ];

    return this.findBuildDirectory(candidates);
  }

  private async determineDeploymentType(buildDir: string): Promise<DeploymentType> {
    // Check for Nitro server build
    if (buildDir === '.output' && await fs.pathExists('.output/server')) {
      return 'ssr';
    }
    return 'static';
  }

  async validateEnvironment(): Promise<boolean> {
    const packageJson = await fs.readJson('package.json');
    return !!packageJson.dependencies?.nuxt || !!packageJson.devDependencies?.nuxt;
  }
}

// SvelteBuilder.ts  
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
      return {
        success: false,
        buildDir: '',
        deploymentType: 'static',
        framework: 'svelte'
      };
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

// RemixBuilder.ts
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
      return {
        success: false,
        buildDir: '',
        deploymentType: 'ssr',
        framework: 'remix'
      };
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
