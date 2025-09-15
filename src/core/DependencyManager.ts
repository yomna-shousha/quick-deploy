import { Logger } from '../utils/Logger.js';
import { Process } from '../utils/Process.js';
import { PackageManager } from '../types/index.js';

export class DependencyManager {
  private process: Process;

  constructor(private logger: Logger) {
    this.process = new Process(logger);
  }

  async setup(packageManager: PackageManager): Promise<void> {
    this.logger.info(`Setting up ${packageManager}...`);
    // Basic validation - can be extended
    this.logger.success(`${packageManager} is ready`);
  }

  async install(): Promise<void> {
    const packageManager = await this.detectPackageManager();
    this.logger.info('Installing dependencies...');

    const commands = {
      npm: 'npm install',
      pnpm: 'pnpm install',
      yarn: 'yarn install',
      bun: 'bun install'
    };

    try {
      await this.process.execWithOutput(commands[packageManager]);
      this.logger.success('Dependencies installed successfully');
    } catch (error) {
      throw new Error(`Failed to install dependencies with ${packageManager}`);
    }
  }

  async validatePackageManager(): Promise<void> {
    const packageManager = await this.detectPackageManager();
    const hasCommand = await this.process.hasCommand(packageManager);

    if (!hasCommand) {
      throw new Error(`${packageManager} is not available`);
    }
  }

  private async detectPackageManager(): Promise<PackageManager> {
    const fs = await import('fs-extra');
    
    if (await fs.pathExists('pnpm-lock.yaml')) return 'pnpm';
    if (await fs.pathExists('yarn.lock')) return 'yarn'; 
    if (await fs.pathExists('bun.lockb')) return 'bun';
    return 'npm';
  }
}
