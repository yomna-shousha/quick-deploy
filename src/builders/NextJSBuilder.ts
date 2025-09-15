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
      return {
        success: false,
        buildDir: '',
        deploymentType: 'static',
        framework: 'nextjs'
      };
    }
  }

  private async needsSpecialHandling(): Promise<boolean> {
    if (await fs.pathExists('.next')) {
      const hasIndexHtml = await fs.pathExists('.next/server/app/index.html');
      const hasOutDir = await fs.pathExists('out');
      return !hasOutDir && hasIndexHtml;
    }
    return false;
  }

  private async handleNextJSConfiguration(packageManager: PackageManager): Promise<void> {
    this.logger.info('Detected Next.js SSR build - analyzing configuration');
    
    const configFile = await this.findNextConfig();
    if (configFile) {
      this.logger.info(`Found ${configFile}`);
    }

    console.log('\nDeployment options for Next.js:');
    console.log('  1. Configure for static export (recommended - simpler)');
    console.log('  2. Use OpenNext for SSR deployment');
    console.log('  3. Exit and configure manually');
    console.log('');

    // Use readline for better input handling
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const choice = await new Promise<string>((resolve) => {
      rl.question('Choose option (1/2/3): ', (answer: string) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    switch (choice) {
      case '1':
        await this.configureStaticExport(packageManager, configFile);
        break;
      case '2':
        throw new Error('OpenNext setup not implemented yet');
      case '3':
        throw new Error('User chose to exit - please configure Next.js manually');
      default:
        this.logger.warn('Invalid choice, defaulting to static export');
        await this.configureStaticExport(packageManager, configFile);
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
      throw new Error('Static export failed - no out/ directory created');
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

  async detectBuildOutput(): Promise<string> {
    if (await fs.pathExists('out') && (await fs.readdir('out')).length > 0) {
      return 'out';
    }
    
    if (await fs.pathExists('.open-next')) {
      return '.open-next';
    }
    
    if (await fs.pathExists('.next') && (await fs.readdir('.next')).length > 0) {
      return '.next';
    }
    
    throw new Error('No build output found');
  }

  async validateEnvironment(): Promise<boolean> {
    const packageJson = await fs.readJson('package.json');
    return !!packageJson.dependencies?.next;
  }

  private async determineDeploymentType(buildDir: string): Promise<DeploymentType> {
    if (buildDir === 'out') return 'static';
    if (buildDir === '.open-next') return 'opennext';
    return 'ssr';
  }
}
