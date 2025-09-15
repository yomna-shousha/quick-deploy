import fs from 'fs-extra';
import { BaseDeployer } from './BaseDeployer.js';
import { DeploymentConfig, DeploymentResult } from '../types/index.js';

export class CloudflareDeployer extends BaseDeployer {
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    this.logger.info('Deploying to Cloudflare...');

    try {
      await this.ensureWranglerInstalled();
      await this.ensureWranglerAuth();

      // Generate wrangler.toml based on detected project info
      await this.generateWranglerConfig(config);

      // Use interactive deployment (inherit stdio for account selection)
      this.logger.info('Running wrangler deploy...');
      await this.process.execWithOutput('wrangler deploy');
      
      return {
        success: true,
        logs: ['Deployment completed via interactive wrangler']
      };
    } catch (error) {
      return {
        success: false,
        logs: [],
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
  }

  private async generateWranglerConfig(config: DeploymentConfig): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if wrangler config already exists
    if (await fs.pathExists('wrangler.toml') || await fs.pathExists('wrangler.jsonc')) {
      this.logger.info('Using existing wrangler configuration');
      return;
    }

    // Generate appropriate config based on deployment type
    let wranglerConfig: any = {
      name: config.projectName,
      compatibility_date: today
    };

    switch (config.deploymentType) {
      case 'static':
        wranglerConfig.assets = {
          directory: config.buildDir
        };
        break;
        
      case 'ssr':
        wranglerConfig.main = `${config.buildDir}/_worker.js/index.js`;
        break;
        
      case 'hybrid':
        wranglerConfig.main = `${config.buildDir}/_worker.js/index.js`;
        wranglerConfig.assets = {
          directory: config.buildDir,
          binding: "ASSETS"
        };
        break;
        
      case 'opennext':
        wranglerConfig.main = ".open-next/worker.js";
        wranglerConfig.compatibility_flags = ["nodejs_compat"];
        wranglerConfig.assets = {
          directory: ".open-next/assets",
          binding: "ASSETS"
        };
        break;
    }

    // Write as wrangler.jsonc
    const configContent = JSON.stringify(wranglerConfig, null, 2);
    await fs.writeFile('wrangler.jsonc', configContent);
    
    this.logger.success(`Generated wrangler.jsonc for ${config.deploymentType} deployment`);
  }

  async validateDeployment(deploymentId: string): Promise<boolean> {
    try {
      await this.process.exec(`wrangler deployments view ${deploymentId}`);
      return true;
    } catch {
      return false;
    }
  }

  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const output = await this.process.exec(`wrangler tail --deployment-id ${deploymentId}`);
      return output.split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }
}
