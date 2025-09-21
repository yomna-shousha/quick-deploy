// src/deployers/BaseDeployer.ts
import { execa } from 'execa';
import { Logger } from '../utils/Logger.js';

export interface DeployConfig {
  projectName: string;
  buildDir: string;
  deploymentType: 'static' | 'ssr' | 'hybrid';
  framework: string;
}

export interface DeployResult {
  success: boolean;
  url?: string;
  error?: string;
}

export abstract class BaseDeployer {
  constructor(protected logger: Logger) {}

  abstract deploy(config: DeployConfig): Promise<DeployResult>;

  protected async ensureWrangler(): Promise<void> {
    try {
      await execa('wrangler', ['--version'], { stdio: 'pipe' });
    } catch {
      this.logger.info('Installing Wrangler...');
      await execa('npm', ['install', '-g', 'wrangler@latest'], { stdio: 'inherit' });
    }
  }
}
