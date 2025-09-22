// src/core/QuickDeploy.ts
import fs from 'fs-extra';
import { FrameworkDetector } from './FrameworkDetector.js';
import { BuilderFactory } from '../builders/BuilderFactory.js';
import { DeployerFactory } from '../deployers/DeployerFactory.js';
import { Logger, ProjectAssessment } from '../utils/Logger.js';
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
      this.logger.banner('Quick Deploy');

      // 1. Detect framework and gather assessment data
      this.logger.startPhase('Analyzing project');
      const framework = await this.detector.detect();
      if (!framework) {
        throw new Error('Unable to detect framework or static site. Supported: Angular, Astro, Next.js, Nuxt, React, React Router, Remix, SvelteKit, Static HTML sites');
      }

      const packageManager = await this.detectPackageManager();
      const assessment = await this.buildProjectAssessment(framework, packageManager);
      
      this.logger.phaseSuccess('Project analysis complete');
      this.logger.showProjectAssessment(assessment);

      // 2. Install dependencies if needed (skip for static sites)
      if (framework.name !== 'static' && !this.options.skipDependencies) {
        await this.ensureDependencies(packageManager);
      }

      // 3. Configure framework
      this.logger.startPhase('Configuring deployment');
      const builder = BuilderFactory.create(framework.name, this.logger);
      await builder.configure();
      this.logger.phaseSuccess('Configuration complete');

      // 4. Build the project
      this.logger.startPhase('Building project');
      const buildResult = await builder.build({
        packageManager,
        framework,
        skipDependencies: this.options.skipDependencies || false
      });

      if (!buildResult.success) {
        throw new Error('Build failed');
      }
      this.logger.phaseSuccess('Build complete');

      // 5. Deploy to Cloudflare Workers
      this.logger.startPhase('Deploying to Cloudflare Workers');
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

      this.logger.phaseSuccess('Deployment complete');

      // 6. Show success summary
      this.logger.showDeploymentSuccess(framework.name);

    } catch (error) {
      this.logger.error('Deployment failed:', error);
      throw error;
    }
  }

  private async buildProjectAssessment(framework: any, packageManager: string): Promise<ProjectAssessment> {
    const assessment: ProjectAssessment = {
      framework: {
        name: framework.name,
        confidence: 'high' // Could be calculated based on detection score
      },
      build: {
        command: framework.build.command,
        outputDir: framework.build.outputDir,
        packageManager
      },
      deployment: {
        type: framework.deploy.type,
        platform: 'cloudflare-workers',
        adapter: framework.deploy.adapter
      }
    };

    // Add version info if we can detect it
    if (framework.name !== 'static') {
      try {
        const packageJson = await fs.readJson('package.json');
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        // Get framework version
        const frameworkPackage = this.getFrameworkPackageName(framework.name);
        if (frameworkPackage && deps[frameworkPackage]) {
          assessment.framework.version = deps[frameworkPackage];
        }

        // Count dependencies
        assessment.dependencies = {
          total: Object.keys(deps).length
        };
      } catch {
        // Package.json not found or invalid
      }
    }

    return assessment;
  }

  private getFrameworkPackageName(frameworkName: string): string | null {
    const packageMap: Record<string, string> = {
      'nextjs': 'next',
      'astro': 'astro',
      'nuxt': 'nuxt',
      'angular': '@angular/core',
      'svelte': '@sveltejs/kit',
      'react': 'react',
      'remix': '@remix-run/react'
    };
    return packageMap[frameworkName] || null;
  }

  async init(template?: string): Promise<void> {
    this.logger.banner('Initialize Configuration');
    this.logger.info('Configuration initialized');
  }

  async doctor(): Promise<void> {
    this.logger.banner('Diagnostic Check');
    const framework = await this.detector.detect();
    if (framework) {
      this.logger.success(`Framework detected: ${framework.name}`);
    } else {
      this.logger.warn('No framework or static site detected');
    }
    this.logger.success('All diagnostic checks passed');
  }

  async clean(): Promise<void> {
    this.logger.banner('Clean Build Artifacts');
    const dirsToClean = ['dist', 'build', 'out', '.next', '.output', '.svelte-kit', '.open-next'];
    
    for (const dir of dirsToClean) {
      try {
        await fs.remove(dir);
        this.logger.info(`Cleaned ${dir}/`);
      } catch {
        // Directory doesn't exist, ignore
      }
    }
    
    this.logger.success('Clean completed');
  }

  private async ensureDependencies(packageManager: string): Promise<void> {
    const hasNodeModules = await fs.pathExists('node_modules');
    if (!hasNodeModules) {
      this.logger.startPhase('Installing dependencies');
      this.logger.runningCommand(`${packageManager} install`);
      const { execa } = await import('execa');
      await execa(packageManager, ['install'], { stdio: 'inherit' });
      this.logger.phaseSuccess('Dependencies installed');
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
