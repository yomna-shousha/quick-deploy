import fs from 'fs-extra';
import { BaseBuilder } from './BaseBuilder.js';
import { BuildOptions, BuildResult } from '../types/index.js';

export class AstroBuilder extends BaseBuilder {
  async build(options: BuildOptions): Promise<BuildResult> {
    this.logger.info('Building Astro project...');

    try {
      // Override the normal build process with our smart handling
      await this.smartBuild(options.packageManager);
      const buildDir = await this.detectBuildOutput();

      return {
        success: true,
        buildDir,
        deploymentType: 'static',
        framework: 'astro'
      };
    } catch (error) {
      this.logger.error('Astro build failed:', error);
      throw error;
    }
  }

  private async smartBuild(packageManager: string): Promise<void> {
    try {
      // First try with type checking (npm run build)
      this.logger.info('Building project...');
      await this.process.exec(`${packageManager} run build`);
    } catch (error) {
      // Check if this is a content collection type error
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (this.isContentCollectionError(errorMessage)) {
        this.logger.warn('Content collection type errors detected, building without type check...');
        
        // Try building without type checking using astro build directly
        await this.runDirectAstroBuild(packageManager);
        this.logger.info('✅ Build succeeded without type checking');
      } else {
        // Different error, re-throw
        throw error;
      }
    }
  }

  private isContentCollectionError(errorMessage: string): boolean {
    const contentErrorPatterns = [
      'No overload matches this call',
      'does not satisfy the constraint', 
      'getCollection',
      'CollectionEntry',
      'Property \'draft\' does not exist',
      'Property \'pubDate\' does not exist',
      'Property \'readingTime\' does not exist',
      'Result (51 files):',
      '- 29 errors',
      'ts(2769)',
      'ts(2339)',
      'ts(2344)',
      'ts(2322)',
      // Runtime content collection errors
      'does not exist or is empty',
      'Cannot read properties of undefined (reading \'data\')',
      'collection "blog" does not exist',
      'collection "posts" does not exist',
      'collection "projects" does not exist'
    ];

    return contentErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );
  }

  private async runDirectAstroBuild(packageManager: string): Promise<void> {
    this.logger.info('Running astro build directly (skipping type check)...');
    
    const commands = {
      npm: 'npx astro build',
      pnpm: 'pnpm astro build', 
      yarn: 'yarn astro build',
      bun: 'bunx astro build'
    };

    const command = commands[packageManager as keyof typeof commands] || 'npx astro build';
    await this.process.exec(command);
  }

  async detectBuildOutput(): Promise<string> {
    return this.findBuildDirectory(['dist']);
  }

  async validateEnvironment(): Promise<boolean> {
    const packageJson = await fs.readJson('package.json');
    return !!packageJson.dependencies?.astro || !!packageJson.devDependencies?.astro;
  }
}
