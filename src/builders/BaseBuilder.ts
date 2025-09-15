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
    const commands = {
      npm: 'npm run build',
      pnpm: 'pnpm build',
      yarn: 'yarn build',
      bun: 'bun run build'
    };

    const command = commands[packageManager];
    await this.process.exec(command);
  }

  protected async findBuildDirectory(candidates: string[]): Promise<string> {
    for (const dir of candidates) {
      if (await fs.pathExists(dir)) {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
          const files = await fs.readdir(dir);
          if (files.length > 0) {
            return dir;
          }
        }
      }
    }

    throw new Error(`No build output found. Checked: ${candidates.join(', ')}`);
  }
}
