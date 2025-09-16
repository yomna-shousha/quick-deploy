import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
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
    // Check for package.json first
    const hasPackageJson = await fs.pathExists('package.json');
    if (!hasPackageJson) {
      throw new Error('No package.json found - this doesn\'t look like a web project');
    }

    // Check for monorepo patterns
    await this.handleMonorepo();
  }

  private async handleMonorepo(): Promise<void> {
    const isMonorepo = await this.isMonorepoRoot();
    
    if (isMonorepo) {
      this.logger.warn('Detected monorepo - this is likely framework source code, not a deployable project');
      
      // Check for examples directory
      if (await fs.pathExists('examples')) {
        this.logger.info('Found examples directory with deployable projects:');
        const examples = await fs.readdir('examples');
        console.log(examples.slice(0, 10).join('\n'));
        console.log('');
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const exampleName = await new Promise<string>((resolve) => {
          rl.question('Enter example name to deploy (or \'q\' to quit): ', (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });
        
        if (exampleName === 'q') {
          console.log('Exiting');
          process.exit(0);
        } else if (exampleName && await fs.pathExists(`examples/${exampleName}`)) {
          process.chdir(`examples/${exampleName}`);
          this.logger.success(`Switched to examples/${exampleName}`);
          return; // Continue with deployment from the example directory
        } else {
          throw new Error(`Example '${exampleName}' not found. Check available examples: ls examples/\nOr create a new project: npm create astro@latest my-site`);
        }
      } else if (await fs.pathExists('packages')) {
        this.logger.info('Found packages directory:');
        const packages = await fs.readdir('packages');
        console.log(packages.slice(0, 10).join('\n'));
        
        throw new Error(`This looks like framework source code. Create a new project instead:
  cd ~
  npm create astro@latest my-site
  cd my-site
  quick-deploy`);
      } else {
        throw new Error(`This appears to be framework source code, not a deployable project. Create a new project:
  cd ~
  npm create astro@latest my-site
  cd my-site
  quick-deploy`);
      }
    }
  }

  private async isMonorepoRoot(): Promise<boolean> {
    const monorepoFiles = [
      'pnpm-workspace.yaml',
      'turbo.json', 
      'lerna.json'
    ];

    for (const file of monorepoFiles) {
      if (await fs.pathExists(file)) {
        return true;
      }
    }

    return false;
  }

  async removeDirectory(dir: string): Promise<void> {
    await fs.remove(dir);
  }

  private async readPackageJson(): Promise<any> {
    return await fs.readJson('package.json');
  }

  private async detectFramework(): Promise<Framework> {
    // Check for config files first (more reliable)
    const configChecks = [
      { files: ['astro.config.mjs', 'astro.config.js', 'astro.config.ts'], framework: 'astro' as Framework },
      { files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], framework: 'nextjs' as Framework },
      { files: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'], framework: 'vite' as Framework },
      { files: ['nuxt.config.js', 'nuxt.config.ts'], framework: 'nuxt' as Framework },
      { files: ['svelte.config.js'], framework: 'svelte' as Framework },
      { files: ['remix.config.js'], framework: 'remix' as Framework }
    ];

    for (const check of configChecks) {
      for (const file of check.files) {
        if (await fs.pathExists(file)) {
          return check.framework;
        }
      }
    }

    // Fallback to package.json dependencies
    const packageJson = await this.readPackageJson();
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.astro) return 'astro';
    if (deps.next) return 'nextjs';
    if (deps.vite) return 'vite';
    if (deps.nuxt) return 'nuxt';
    if (deps['@remix-run/node'] || deps['@remix-run/react']) return 'remix';
    
    // If we have dependencies but no clear framework, show helpful error
    if (Object.keys(deps).length > 0) {
      throw new Error(`Unknown framework detected. Supported frameworks: Astro, Next.js, Vite, Nuxt, SvelteKit, Remix
Make sure you're in a web project directory or create a new project:
  npm create astro@latest my-site  (Astro)
  npx create-next-app@latest my-app  (Next.js)
  npm create vite@latest my-app  (Vite)`);
    }

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
