import { BaseDeployer } from './BaseDeployer.js';
import { CloudflareDeployer } from './CloudflareDeployer.js';
import { Logger } from '../utils/Logger.js';

export class DeployerFactory {
  static create(platform: string, logger: Logger): BaseDeployer {
    switch (platform) {
      case 'cloudflare':
        return new CloudflareDeployer(logger);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
