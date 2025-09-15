import { BaseDeployer } from './BaseDeployer.js';
import { CloudflareDeployer } from './CloudflareDeployer.js';
import { Logger } from '../utils/Logger.js';

export class DeployerFactory {
  static create(type: string, logger: Logger): BaseDeployer {
    switch (type) {
      case 'cloudflare':
        return new CloudflareDeployer(logger);
      default:
        throw new Error(`Unsupported deployment target: ${type}`);
    }
  }
}

export * from './BaseDeployer.js';
export * from './CloudflareDeployer.js';
