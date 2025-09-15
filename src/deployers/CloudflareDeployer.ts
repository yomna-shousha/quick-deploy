import fs from 'fs-extra';
import { BaseDeployer } from './BaseDeployer.js';
import { DeploymentConfig, DeploymentResult } from '../types/index.js';

export class CloudflareDeployer extends BaseDeployer {
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    this.logger.info('Deploying to Cloudflare...');

    try {
      await this.ensureWranglerInstalled();
      await this.ensureWranglerAuth();

      // Detect project type and deploy accordingly
      const deploymentStrategy = await this.detectDeploymentStrategy(config);
      const result = await this.executeDeployment(deploymentStrategy, config);

      return {
        success: true,
        logs: ['Deployment completed successfully'],
        ...result
      };
    } catch (error) {
      return {
        success: false,
        logs: [],
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
  }

  private async detectDeploymentStrategy(config: DeploymentConfig): Promise<string> {
    const buildDir = config.buildDir;
    
    // Check for hybrid build (static + SSR) - prioritize isolated assets deployment
    if (await fs.pathExists(`${buildDir}/_worker.js/index.js`) && 
        await fs.pathExists(`${buildDir}/index.html`)) {
      return 'hybrid';
    }
    
    // Pure SSR project with worker
    if (await fs.pathExists(`${buildDir}/_worker.js/index.js`)) {
      return 'ssr';
    }
    
    // OpenNext deployment
    if (config.deploymentType === 'opennext' && await fs.pathExists('.open-next')) {
      return 'opennext';
    }
    
    // Static site
    if (await fs.pathExists(`${buildDir}/index.html`)) {
      return 'static';
    }
    
    return 'unknown';
  }

  private async executeDeployment(strategy: string, config: DeploymentConfig): Promise<{ url?: string; deploymentId?: string }> {
    switch (strategy) {
      case 'hybrid':
        return await this.deployHybridBuild(config);
      case 'ssr':
        return await this.deploySsrBuild(config);
      case 'opennext':
        return await this.deployOpenNextBuild(config);
      case 'static':
        return await this.deployStaticBuild(config);
      default:
        return await this.deployUnknownBuild(config);
    }
  }

  private async deployHybridBuild(config: DeploymentConfig): Promise<{ url?: string }> {
    this.logger.info('Detected hybrid build (static + SSR) - using isolated assets deployment');
    
    // Create clean deployment directory to avoid Pages config conflicts
    const tempDir = `/tmp/deploy-${Date.now()}`;
    await fs.ensureDir(tempDir);
    
    try {
      // Copy only static files (ignore _worker.js for static deployment)
      await fs.copy(config.buildDir, tempDir);
      await fs.remove(`${tempDir}/_worker.js`);
      await fs.remove(`${tempDir}/_routes.json`);
      
      // Generate wrangler.toml for static assets
      const wranglerConfig = {
        name: `${config.projectName}-static`,
        compatibility_date: new Date().toISOString().split('T')[0],
        main: 'index.js',
        site: {
          bucket: '.'
        }
      };
      
      await fs.writeFile(`${tempDir}/wrangler.toml`, this.tomlStringify(wranglerConfig));
      
      // Create simple static site worker
      const workerContent = `export default {
    async fetch(request, env, ctx) {
        try {
            return await env.ASSETS.fetch(request);
        } catch (error) {
            const url = new URL(request.url);
            const pathname = url.pathname;
            
            // Try with index.html for directory requests
            if (pathname.endsWith('/')) {
                const indexRequest = new Request(
                    request.url.replace(pathname, pathname + 'index.html'),
                    request
                );
                try {
                    return await env.ASSETS.fetch(indexRequest);
                } catch (e) {
                    // Continue to 404
                }
            }
            
            // Try adding .html extension
            if (!pathname.includes('.') && !pathname.endsWith('/')) {
                const htmlRequest = new Request(
                    request.url.replace(pathname, pathname + '.html'),
                    request
                );
                try {
                    return await env.ASSETS.fetch(htmlRequest);
                } catch (e) {
                    // Continue to 404
                }
            }
            
            return new Response('Not found', { status: 404 });
        }
    }
};`;
      
      await fs.writeFile(`${tempDir}/index.js`, workerContent);
      
      this.logger.info('Deploying hybrid project as static site (isolated)');
      await this.process.execWithOutput(`wrangler deploy`, { cwd: tempDir });
      
      this.logger.success('Hybrid deployment complete!');
      return {};
    } finally {
      await fs.remove(tempDir);
    }
  }

  private async deploySsrBuild(config: DeploymentConfig): Promise<{ url?: string }> {
    this.logger.info('Detected pure SSR build - using framework\'s built-in worker');
    
    const tempDir = `/tmp/deploy-${Date.now()}`;
    await fs.ensureDir(tempDir);
    
    try {
      await fs.copy(config.buildDir, tempDir);
      
      const wranglerConfig = {
        name: `${config.projectName}-ssr`,
        compatibility_date: new Date().toISOString().split('T')[0],
        main: '_worker.js/index.js'
      };
      
      await fs.writeFile(`${tempDir}/wrangler.toml`, this.tomlStringify(wranglerConfig));
      
      this.logger.info('Deploying SSR project with framework worker');
      await this.process.execWithOutput(`wrangler deploy`, { cwd: tempDir });
      
      this.logger.success('SSR deployment complete!');
      return {};
    } finally {
      await fs.remove(tempDir);
    }
  }

  private async deployOpenNextBuild(config: DeploymentConfig): Promise<{ url?: string }> {
    this.logger.info('Deploying Next.js SSR with OpenNext');
    
    const tempDir = `/tmp/deploy-${Date.now()}`;
    await fs.ensureDir(tempDir);
    
    try {
      await fs.copy('.open-next', tempDir);
      
      // Check for worker file (OpenNext should generate this)
      if (await fs.pathExists(`${tempDir}/worker.js`)) {
        const wranglerConfig = {
          name: `${config.projectName}-nextjs`,
          compatibility_date: new Date().toISOString().split('T')[0],
          compatibility_flags: ['nodejs_compat'],
          main: 'worker.js',
          assets: {
            directory: 'assets',
            binding: 'ASSETS'
          }
        };
        
        await fs.writeFile(`${tempDir}/wrangler.toml`, this.tomlStringify(wranglerConfig));
        
        this.logger.info('Deploying Next.js SSR with OpenNext worker');
        await this.process.execWithOutput(`wrangler deploy`, { cwd: tempDir });
        
        this.logger.success('Next.js SSR deployment complete!');
        return {};
      } else {
        this.logger.info('worker.js not found, checking for alternative structure...');
        const files = await fs.readdir(tempDir);
        this.logger.debug('OpenNext directory contents:', files);
        
        throw new Error(`OpenNext build incomplete - no worker file found. Check .open-next directory contents:
Expected files: worker.js, assets/ directory
OpenNext documentation: https://opennext.js.org/cloudflare
Try running: npx opennextjs-cloudflare --help`);
      }
    } finally {
      await fs.remove(tempDir);
    }
  }

  private async deployStaticBuild(config: DeploymentConfig): Promise<{ url?: string }> {
    this.logger.info('Detected static build - using assets deployment');
    
    // For static builds, use wrangler deploy --assets directly
    this.logger.info('Deploying static site');
    await this.process.execWithOutput(`wrangler deploy --assets=${config.buildDir}`);
    
    this.logger.success('Static deployment complete!');
    return {};
  }

  private async deployUnknownBuild(config: DeploymentConfig): Promise<{ url?: string }> {
    this.logger.warn('Unknown build structure - attempting assets deployment');
    this.logger.info('Build contents:');
    
    try {
      const files = await fs.readdir(config.buildDir);
      console.log(files.slice(0, 5).join('\n'));
      
      await this.process.execWithOutput(`wrangler deploy --assets=${config.buildDir}`);
      this.logger.success('Deployment complete!');
      return {};
    } catch (error) {
      throw new Error(`Could not deploy project. Build directory structure:
• Check build directory: ls -la ${config.buildDir}
• For SSR: ensure _worker.js/index.js exists
• For static: ensure index.html exists
• Manual deploy: wrangler deploy --assets=${config.buildDir}`);
    }
  }

  private tomlStringify(obj: any): string {
    let result = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result += `${key} = "${value}"\n`;
      } else if (typeof value === 'boolean') {
        result += `${key} = ${value}\n`;
      } else if (Array.isArray(value)) {
        result += `${key} = [${value.map(v => `"${v}"`).join(', ')}]\n`;
      } else if (typeof value === 'object' && value !== null) {
        result += `\n[${key}]\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          if (typeof subValue === 'string') {
            result += `${subKey} = "${subValue}"\n`;
          } else {
            result += `${subKey} = ${subValue}\n`;
          }
        }
      }
    }
    
    return result;
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
