import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/Logger.js';
import { Framework, PackageManager, ProjectConfig } from '../types/index.js';

export class ProjectAnalyzer {
  constructor(private logger: Logger) {}

  async analyze(): Promise<ProjectConfig> {
    const cwd = process.cwd();
    await this.validateProject();

    const packageJson = await this.readPackageJson();
    const framework = await this.detectFramework();
    const packageManager = await this.detectPackageManager();
    const environmentFiles = await this.detectEnvironmentFiles();
    
    return {
      name: packageJson.name || path.basename(cwd),
      framework,
      packageManager,
      buildDir: await this.detectBuildDir(framework),
      hasEnvironmentVariables: environmentFiles.length > 0,
      environmentFiles,
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      scripts: packageJson.scripts || {}
    };
  }

  async validateProject(): Promise<void> {
    const hasPackageJson = await fs.pathExists('package.json');
    if (!hasPackageJson) {
      throw new Error('No package.json found');
    }
  }

  async removeDirectory(dir: string): Promise<void> {
    await fs.remove(dir);
  }

  private async readPackageJson(): Promise<any> {
    return await fs.readJson('package.json');
  }

  private async detectFramework(): Promise<Framework> {
    const packageJson = await this.readPackageJson();
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.next) return 'nextjs';
    if (deps.astro) return 'astro';
    if (deps.vite) return 'vite';
    if (deps.nuxt) return 'nuxt';
    return 'unknown';
  }

  private async detectPackageManager(): Promise<PackageManager> {
    if (await fs.pathExists('pnpm-lock.yaml')) return 'pnpm';
    if (await fs.pathExists('yarn.lock')) return 'yarn';
    if (await fs.pathExists('bun.lockb')) return 'bun';
    return 'npm';
  }

  private async detectEnvironmentFiles(): Promise<string[]> {
    const envFiles = ['.env', '.env.local', '.env.production'];
    const found: string[] = [];

    for (const file of envFiles) {
      if (await fs.pathExists(file)) {
        found.push(file);
      }
    }

    return found;
  }

  private async detectBuildDir(framework: Framework): Promise<string> {
    const buildDirs = {
      nextjs: 'out',
      astro: 'dist', 
      vite: 'dist',
      nuxt: '.output/public',
      svelte: '.svelte-kit/output',
      remix: 'build',
      unknown: 'dist'
    };

    return buildDirs[framework];
  }
}
