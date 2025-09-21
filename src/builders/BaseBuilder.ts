import fs from 'fs-extra';
import { execa } from 'execa';
import { Logger } from '../utils/Logger.js';

export interface BuildConfig {
  packageManager: string;
  framework: any; // Framework config from detector
  skipDependencies?: boolean;
}

export interface BuildResult {
  success: boolean;
  buildDir: string;
  deploymentType: 'static' | 'ssr' | 'hybrid';
}

export abstract class BaseBuilder {
  constructor(protected logger: Logger) {}

  abstract build(config: BuildConfig): Promise<BuildResult>;
  abstract configure(): Promise<void>;
  
  protected async runBuildCommand(packageManager: string): Promise<void> {
    this.logger.info('Building project...');
    
    const commands = {
      npm: 'npm run build',
      pnpm: 'pnpm build',
      yarn: 'yarn build',
      bun: 'bun run build'
    };

    const command = commands[packageManager as keyof typeof commands] || 'npm run build';
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    if (!cmd) {
      throw new Error(`Invalid build command: ${command}`);
    }
    
    await execa(cmd, args, { stdio: 'inherit' });
    this.logger.success('Build completed');
  }

  protected async detectPackageManager(): Promise<string> {
    if (await fs.pathExists('pnpm-lock.yaml')) return 'pnpm';
    if (await fs.pathExists('yarn.lock')) return 'yarn';
    if (await fs.pathExists('bun.lockb')) return 'bun';
    return 'npm';
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
}
