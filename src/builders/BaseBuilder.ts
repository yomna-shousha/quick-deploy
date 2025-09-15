import fs from 'fs-extra';
import { Logger } from '../utils/Logger.js';
import { Process } from '../utils/Process.js';
import { BuildOptions, BuildResult, PackageManager } from '../types/index.js';

export abstract class BaseBuilder {
  protected process: Process;

  constructor(protected logger: Logger) {
    this.process = new Process(logger);
  }

  abstract build(options: BuildOptions): Promise<BuildResult>;
  abstract detectBuildOutput(): Promise<string>;
  abstract validateEnvironment(): Promise<boolean>;

  protected async runBuildCommand(packageManager: PackageManager): Promise<void> {
    this.logger.info('Building project...');
    
    const commands = {
      npm: 'npm run build',
      pnpm: 'pnpm build',
      yarn: 'yarn build',
      bun: 'bun run build'
    };

    const command = commands[packageManager];
    
    try {
      await this.process.execWithOutput(command);
      this.logger.success('Build completed');
    } catch (error) {
      await this.handleBuildFailure(packageManager, error);
    }
  }

  private async handleBuildFailure(packageManager: PackageManager, error: any): Promise<void> {
    this.logger.error(`Build failed with ${packageManager}`);
    
    // Check for specific error patterns and provide helpful messages
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('Failed to parse URL from undefined')) {
      throw new Error(`Build failed: Missing environment variables
This project requires environment variables that aren't set
• Look for variables in src/content.config.ts or similar files
• Create a .env file:
  touch .env
• Add your variables (example based on your error):
  MARBLE_WORKSPACE_KEY=your_workspace_key
  MARBLE_API_URL=https://your-marble-api-url.com
• If you don't have these API credentials, this project can't be built
• This appears to be a CMS-connected project requiring external service access`);
    }
    
    if (errorMessage.includes('Invalid URL')) {
      throw new Error(`Build failed: Invalid URL configuration
• Check your environment variables for correct URLs
• Make sure all URLs start with http:// or https://
• Verify your .env file has correct values`);
    }
    
    // Generic build failure with helpful suggestions
    throw new Error(`Build failed with ${packageManager}
• Check the build errors above
• Try: ${packageManager} run dev (to test if the project works)
• Make sure all dependencies are compatible
• Check your framework's documentation for build issues`);
  }

  protected async findBuildDirectory(candidates: string[]): Promise<string> {
    this.logger.info('Locating build output...');

    for (const dir of candidates) {
      if (await fs.pathExists(dir)) {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
          const files = await fs.readdir(dir);
          if (files.length > 0) {
            this.logger.success(`Using ${dir}/ directory`);
            return dir;
          }
        }
      }
    }

    throw new Error(`No build output found. Checked: ${candidates.join(', ')}`);
  }

  protected async checkBuildSuccess(): Promise<boolean> {
    // This method can be overridden by specific builders for custom build validation
    return true;
  }
}
