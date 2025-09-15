import fs from 'fs-extra';
import path from 'path';
import { BaseBuilder } from './BaseBuilder.js';
import { BuildOptions, BuildResult, DeploymentType, PackageManager } from '../types/index.js';

export class NextJSBuilder extends BaseBuilder {
  async build(options: BuildOptions): Promise<BuildResult> {
    this.logger.info('Building Next.js project...');

    try {
      await this.runBuildCommand(options.packageManager);
      
      const needsConfiguration = await this.needsSpecialHandling();
      
      if (needsConfiguration) {
        await this.handleNextJSConfiguration(options.packageManager);
      }
      
      const buildDir = await this.detectBuildOutput();
      const deploymentType = await this.determineDeploymentType(buildDir);

      return {
        success: true,
        buildDir,
        deploymentType,
        framework: 'nextjs'
      };
    } catch (error) {
      this.logger.error('Build failed:', error);
      throw error; // Re-throw the error so it can be handled upstream
    }
  }

  private async needsSpecialHandling(): Promise<boolean> {
    // Check if we have a .next directory but no out directory
    if (await fs.pathExists('.next')) {
      const hasOutDir = await fs.pathExists('out');
      
      if (!hasOutDir) {
        // Check if this looks like SSR build
        const hasServerDir = await fs.pathExists('.next/server');
        return hasServerDir;
      }
    }
    return false;
  }

  private async handleNextJSConfiguration(packageManager: PackageManager): Promise<void> {
    this.logger.info('Detected Next.js SSR build - analyzing configuration');
    
    const configFile = await this.findNextConfig();
    if (configFile) {
      this.logger.info(`Found ${configFile}`);
      
      // Check if already configured for static export
      const content = await fs.readFile(configFile, 'utf8');
      if (content.includes("output.*['\"]export['\"]")) {
        this.logger.warn('Config shows static export but build didn\'t create \'out\' directory');
      }
    }

    console.log('');
    console.log('Deployment options for Next.js:');
    console.log('  1. Configure for static export (recommended - simpler)');
    console.log('  2. Use OpenNext for SSR deployment');
    console.log('  3. Exit and configure manually');
    console.log('');

    const choice = await this.promptUser('Choose option (1/2/3): ');

    switch (choice.trim()) {
      case '1':
        await this.configureStaticExport(packageManager, configFile);
        break;
      case '2':
        await this.setupOpenNext(packageManager);
        break;
      case '3':
        throw new Error(`User chose to exit. Configuration options:
• Static export: Add output: 'export' to next.config
• OpenNext SSR: npm install @opennextjs/cloudflare && npx opennextjs-cloudflare build
• Cloudflare Pages: Use @cloudflare/next-on-pages`);
      default:
        this.logger.warn('Invalid choice. Please enter 1, 2, or 3.');
        // Recursively ask again
        await this.handleNextJSConfiguration(packageManager);
    }
  }

  private async configureStaticExport(packageManager: PackageManager, configFile: string | null): Promise<void> {
    this.logger.info('Configuring for static export...');
    
    if (configFile) {
      await fs.copy(configFile, `${configFile}.backup`);
      this.logger.info(`Backed up existing config to ${configFile}.backup`);
    }

    const targetFile = configFile || 'next.config.js';
    const isTypeScript = targetFile.endsWith('.ts');

    const configContent = isTypeScript ? this.getTypeScriptConfig() : this.getJavaScriptConfig();
    await fs.writeFile(targetFile, configContent);
    
    this.logger.success('Configuration updated for static export');
    this.logger.info('Rebuilding with static export configuration...');

    await this.runBuildCommand(packageManager);
    
    if (await fs.pathExists('out') && (await fs.readdir('out')).length > 0) {
      this.logger.success('Static export completed - using out/ directory');
    } else {
      throw new Error(`Static export failed - no 'out' directory created
• Check the build output above for errors
• Make sure your app doesn't use server-side features
• Try running: ${this.getBuildCommand(packageManager)}`);
    }
  }

  private async setupOpenNext(packageManager: PackageManager): Promise<void> {
    this.logger.info('Setting up OpenNext for SSR deployment...');
    
    // Check if OpenNext is installed
    const packageJson = await fs.readJson('package.json');
    const hasOpenNext = packageJson.dependencies?.['@opennextjs/cloudflare'] || 
                       packageJson.devDependencies?.['@opennextjs/cloudflare'];
    
    if (!hasOpenNext) {
      this.logger.info('Installing @opennextjs/cloudflare...');
      const installCommand = this.getInstallCommand(packageManager, '@opennextjs/cloudflare');
      await this.process.execWithOutput(installCommand);
      this.logger.success('OpenNext installed');
    }
    
    // Build with OpenNext
    this.logger.info('Building with OpenNext...');
    try {
      await this.process.execWithOutput('npx opennextjs-cloudflare build');
      
      // Check if OpenNext generated the expected output
      if (await fs.pathExists('.open-next')) {
        this.logger.success('OpenNext build completed');
      } else {
        throw new Error('OpenNext build failed - no .open-next directory found');
      }
    } catch (error) {
      throw new Error(`OpenNext build failed. Check OpenNext documentation: https://opennext.js.org/cloudflare
Try: npx opennextjs-cloudflare build --help`);
    }
  }

  private async findNextConfig(): Promise<string | null> {
    const configFiles = ['next.config.ts', 'next.config.js', 'next.config.mjs'];
    
    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        return file;
      }
    }
    
    return null;
  }

  private getTypeScriptConfig(): string {
    return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
`;
  }

  private getJavaScriptConfig(): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
`;
  }

  private getBuildCommand(packageManager: PackageManager): string {
    const commands = {
      npm: 'npm run build',
      pnpm: 'pnpm build',
      yarn: 'yarn build',
      bun: 'bun run build'
    };
    return commands[packageManager];
  }

  private getInstallCommand(packageManager: PackageManager, pkg: string): string {
    const commands = {
      npm: `npm install ${pkg}`,
      pnpm: `pnpm add ${pkg}`,
      yarn: `yarn add ${pkg}`,
      bun: `bun add ${pkg}`
    };
    return commands[packageManager];
  }

  private async promptUser(question: string): Promise<string> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer: string) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async detectBuildOutput(): Promise<string> {
    // Check build directories in order of preference
    const candidates = ['out', '.open-next', 'dist', 'build', '.next'];
    
    for (const dir of candidates) {
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir);
        if (files.length > 0) {
          this.logger.success(`Using ${dir}/ directory`);
          return dir;
        }
      }
    }
    
    throw new Error('No build output found. Checked: ' + candidates.join(', '));
  }

  async validateEnvironment(): Promise<boolean> {
    const packageJson = await fs.readJson('package.json');
    return !!packageJson.dependencies?.next;
  }

  private async determineDeploymentType(buildDir: string): Promise<DeploymentType> {
    if (buildDir === 'out') return 'static';
    if (buildDir === '.open-next') return 'opennext';
    if (buildDir === '.next') {
      // Check if it has both static and worker files (hybrid)
      const hasWorker = await fs.pathExists('.next/_worker.js');
      const hasStatic = await fs.pathExists('.next/static');
      if (hasWorker && hasStatic) return 'hybrid';
      if (hasWorker) return 'ssr';
    }
    return 'static';
  }
}
