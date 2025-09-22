// src/core/QuickDeploy.ts
import fs from 'fs-extra';
import { FrameworkDetector } from './FrameworkDetector.js';
import { BuilderFactory } from '../builders/BuilderFactory.js';
import { DeployerFactory } from '../deployers/DeployerFactory.js';
import { Logger } from '../utils/Logger.js';
import { CLIOptions } from '../types/index.js';

export class QuickDeploy {
  private logger: Logger;
  private detector: FrameworkDetector;

  constructor(private options: CLIOptions = {}) {
    this.logger = new Logger(options.verbose);
    this.detector = new FrameworkDetector(this.logger);
  }

  async deploy(): Promise<void> {
    try {
      this.logger.info('🚀 Quick Deploy starting...');

      // 1. Detect framework
      const framework = await this.detector.detect();
      if (!framework) {
        throw new Error('Unable to detect framework or static site. Supported: Angular, Astro, Next.js, Nuxt, React, React Router, Remix, SvelteKit, Static HTML sites');
      }

      // 2. Install dependencies if needed (skip for static sites)
      if (framework.name !== 'static' && !this.options.skipDependencies) {
        await this.ensureDependencies();
      }

      // 3. Get framework builder and configure
      const builder = BuilderFactory.create(framework.name, this.logger);
      await builder.configure();

      // 4. Build the project (or prepare static files)
      const buildResult = await builder.build({
        packageManager: await this.detectPackageManager(),
        framework,
        skipDependencies: this.options.skipDependencies || false
      });

      if (!buildResult.success) {
        throw new Error('Build failed');
      }

      // 5. Deploy to Cloudflare Workers
      const deployer = DeployerFactory.create('cloudflare', this.logger);
      const deployResult = await deployer.deploy({
        projectName: await this.getProjectName(),
        buildDir: buildResult.buildDir,
        deploymentType: buildResult.deploymentType,
        framework: framework.name
      });

      if (!deployResult.success) {
        throw new Error(`Deployment failed: ${deployResult.error}`);
      }

      if (framework.name === 'static') {
        this.logger.success('🎉 Static site deployed successfully to Cloudflare Workers!');
      } else {
        this.logger.success('🎉 Deployment completed successfully!');
      }
    } catch (error) {
      this.logger.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  async init(template?: string): Promise<void> {
    this.logger.info('Initializing quick-deploy configuration...');
    this.logger.success('Configuration initialized!');
  }

  async doctor(): Promise<void> {
    this.logger.info('Running diagnostic checks...');
    const framework = await this.detector.detect();
    if (framework) {
      this.logger.success(`Framework detected: ${framework.name}`);
    } else {
      this.logger.warn('No framework or static site detected');
    }
    this.logger.success('All diagnostic checks passed!');
  }

  async clean(): Promise<void> {
    this.logger.info('Cleaning build artifacts...');
    const dirsToClean = ['dist', 'build', 'out', '.next', '.output', '.svelte-kit', '.open-next'];
    
    for (const dir of dirsToClean) {
      try {
        await fs.remove(dir);
        this.logger.info(`Cleaned ${dir}/`);
      } catch {
        // Directory doesn't exist, ignore
      }
    }
    
    this.logger.success('Clean completed!');
  }

  private async ensureDependencies(): Promise<void> {
    const hasNodeModules = await fs.pathExists('node_modules');
    if (!hasNodeModules) {
      this.logger.info('Installing dependencies...');
      const packageManager = await this.detectPackageManager();
      const { execa } = await import('execa');
      await execa(packageManager, ['install'], { stdio: 'inherit' });
    }
  }

  private async detectPackageManager(): Promise<string> {
    if (await fs.pathExists('pnpm-lock.yaml')) return 'pnpm';
    if (await fs.pathExists('yarn.lock')) return 'yarn';
    if (await fs.pathExists('bun.lockb')) return 'bun';
    return 'npm';
  }

  private async getProjectName(): Promise<string> {
    try {
      const packageJson = await fs.readJson('package.json');
      return packageJson.name || 'quick-deploy-app';
    } catch {
      // For static sites without package.json, use directory name
      const currentDir = process.cwd();
      const dirName = currentDir.split('/').pop() || 'static-site';
      return dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
  }
}
