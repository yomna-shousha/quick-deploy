import fs from 'fs-extra';
import inquirer from 'inquirer';
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
    
    // Validate the detected package manager is available
    await this.validatePackageManager(packageManager);
    
    this.logger.success(`${packageManager} is ready`);
  }

  async install(): Promise<void> {
    const packageManager = await this.detectPackageManager();
    this.logger.info(`Installing dependencies with ${packageManager}...`);

    const commands = {
      npm: 'npm install',
      pnpm: 'pnpm install', 
      yarn: 'yarn install',
      bun: 'bun install'
    };

    try {
      await this.handlePackageManagerSpecificIssues(packageManager);
      await this.process.execWithOutput(commands[packageManager]);
      this.logger.success('Dependencies installed successfully');
    } catch (error) {
      await this.handleInstallFailure(packageManager, error);
    }
  }

  private async handlePackageManagerSpecificIssues(packageManager: PackageManager): Promise<void> {
    // Handle pnpm installation if not available
    if (packageManager === 'pnpm') {
      const hasPnpm = await this.process.hasCommand('pnpm');
      if (!hasPnpm) {
        this.logger.warn('pnpm-lock.yaml found but pnpm not available');
        await this.handleMissingPnpm();
      }
    }

    // Handle yarn issues (including Corepack)
    if (packageManager === 'yarn') {
      const hasYarn = await this.process.hasCommand('yarn');
      if (!hasYarn) {
        this.logger.warn('yarn.lock found but yarn not available');
        await this.installYarn();
      }
    }

    // Handle bun
    if (packageManager === 'bun') {
      const hasBun = await this.process.hasCommand('bun');
      if (!hasBun) {
        throw new Error(`bun.lockb found but bun not available. Install bun: curl -fsSL https://bun.sh/install | bash
Then restart your terminal and run quick-deploy again
Or delete bun.lockb to use npm instead`);
      }
    }
  }

  private async handleMissingPnpm(): Promise<void> {
    const hasNpm = await this.process.hasCommand('npm');
    if (!hasNpm) {
      throw new Error('No working package manager found. Install Node.js: https://nodejs.org');
    }

    this.logger.info('System npm is available');
    
    const { choice } = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: 'pnpm-lock.yaml found but pnpm not available. What would you like to do?',
      choices: [
        { name: 'Try to install pnpm', value: '1' },
        { name: 'Use npm instead (recommended - will work fine)', value: '2' },
        { name: 'Exit and install pnpm manually', value: '3' }
      ]
    }]);

    switch (choice) {
      case '1':
        await this.installPnpm();
        break;
      case '2':
        this.logger.info('Using npm (will work fine with pnpm-lock.yaml)');
        break;
      case '3':
        throw new Error(`User chose to exit. Install pnpm manually:
  - Via npm: npm install -g pnpm
  - Via Homebrew: brew install pnpm  
  - Via curl: curl -fsSL https://get.pnpm.io/install.sh | sh -
Then run quick-deploy again`);
      default:
        this.logger.info('Defaulting to npm');
        break;
    }
  }

  private async installPnpm(): Promise<void> {
    try {
      // Try Volta first if available
      const hasVolta = await this.process.hasCommand('volta');
      if (hasVolta) {
        this.logger.info('Installing pnpm via Volta...');
        await this.process.exec('volta install pnpm');
        this.logger.success('pnpm installed via Volta');
        return;
      }

      // Fallback to npm global install
      this.logger.info('Installing pnpm globally...');
      await this.process.exec('npm install -g pnpm');
      this.logger.success('pnpm installed globally');
    } catch (error) {
      this.logger.warn('pnpm installation failed, falling back to npm');
    }
  }

  private async installYarn(): Promise<void> {
    try {
      this.logger.info('Installing yarn globally...');
      await this.process.exec('npm install -g yarn');
      this.logger.success('yarn installed globally');
    } catch (error) {
      this.logger.warn('Yarn install failed, using npm');
    }
  }

  private async handleInstallFailure(packageManager: PackageManager, error: any): Promise<void> {
    this.logger.error(`Failed to install dependencies with ${packageManager}:`);
    
    // Check for Yarn Corepack issues
    if (packageManager === 'yarn' && error.message.includes('packageManager')) {
      await this.handleYarnCorepackIssue();
      return;
    }

    // Generic failure message with helpful suggestions
    const suggestions = [
      `Try: rm -rf node_modules ${this.getLockFile(packageManager)} && npm install`,
      'Check if you have write permissions in this directory',
      'Make sure you have a stable internet connection',
      'Check the error messages above for specific issues'
    ];

    throw new Error(`${packageManager} install failed. Try these solutions:\n${suggestions.map(s => `• ${s}`).join('\n')}`);
  }

  private async handleYarnCorepackIssue(): Promise<void> {
    this.logger.warn('Yarn version mismatch detected - project requires newer Yarn via Corepack');
    
    const { choice } = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: 'How would you like to handle this?',
      choices: [
        { name: 'Enable Corepack and use project\'s Yarn version (recommended)', value: '1' },
        { name: 'Use npm instead (delete yarn.lock)', value: '2' },
        { name: 'Exit and handle manually', value: '3' }
      ]
    }]);

    switch (choice) {
      case '1':
        await this.enableCorepack();
        break;
      case '2':
        this.logger.info('Switching to npm (yarn.lock will be ignored)');
        await this.process.execWithOutput('npm install');
        break;
      case '3':
        throw new Error(`User chose to exit. Enable Corepack manually:
• corepack enable
• corepack install  
Then run quick-deploy again
Or use npm: delete yarn.lock and run with npm`);
      default:
        this.logger.info('Invalid choice, falling back to npm');
        await this.process.execWithOutput('npm install');
        break;
    }
  }

  private async enableCorepack(): Promise<void> {
    try {
      this.logger.info('Enabling Corepack and using project\'s Yarn version...');
      await this.process.exec('corepack enable');
      await this.process.exec('corepack install');
      this.logger.success('Corepack enabled, retrying with correct Yarn version');
      await this.process.execWithOutput('yarn install');
      this.logger.success('Dependencies installed with Corepack Yarn');
    } catch (error) {
      this.logger.warn('Corepack setup failed, falling back to npm');
      await this.process.execWithOutput('npm install');
    }
  }

  private getLockFile(packageManager: PackageManager): string {
    const lockFiles = {
      npm: 'package-lock.json',
      pnpm: 'pnpm-lock.yaml',
      yarn: 'yarn.lock',
      bun: 'bun.lockb'
    };
    return lockFiles[packageManager];
  }

  async validatePackageManager(packageManager?: PackageManager): Promise<void> {
    const pm = packageManager || await this.detectPackageManager();
    const hasCommand = await this.process.hasCommand(pm);

    if (!hasCommand) {
      throw new Error(`${pm} is not available`);
    }
  }

  private async detectPackageManager(): Promise<PackageManager> {
    if (await fs.pathExists('pnpm-lock.yaml')) return 'pnpm';
    if (await fs.pathExists('yarn.lock')) return 'yarn'; 
    if (await fs.pathExists('bun.lockb')) return 'bun';
    return 'npm';
  }
}
