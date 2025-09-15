import { Logger } from '../utils/Logger.js';
import { Process } from '../utils/Process.js';
import { DeploymentConfig, DeploymentResult } from '../types/index.js';

export abstract class BaseDeployer {
  protected process: Process;

  constructor(protected logger: Logger) {
    this.process = new Process(logger);
  }

  abstract deploy(config: DeploymentConfig): Promise<DeploymentResult>;
  abstract validateDeployment(deploymentId: string): Promise<boolean>;
  abstract getDeploymentLogs(deploymentId: string): Promise<string[]>;

  protected async ensureWranglerAuth(): Promise<void> {
    try {
      await this.process.exec('wrangler whoami');
      this.logger.success('Cloudflare authentication verified');
    } catch {
      throw new Error('Not authenticated with Cloudflare');
    }
  }

  protected async ensureWranglerInstalled(): Promise<void> {
    const hasWrangler = await this.process.hasCommand('wrangler');
    
    if (!hasWrangler) {
      this.logger.info('Installing Wrangler...');
      await this.process.exec('npm install -g wrangler@latest');
      this.logger.success('Wrangler installed');
    }
  }
}
