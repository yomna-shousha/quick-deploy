import path from 'path';
import { FileSystem } from './FileSystem.js';
import { ProjectConfig, WranglerConfig } from '../types/index.js';

interface QuickDeployConfig {
  projectName: string;
  framework: string;
  deploymentType: string;
  environmentVariables: Record<string, string>;
  wrangler: WranglerConfig;
}

export class Config {
  private configPath: string;
  private config: QuickDeployConfig | null = null;

  constructor(configFile?: string) {
    this.configPath = configFile || 'quick-deploy.config.json';
  }

  async load(): Promise<QuickDeployConfig | null> {
    if (this.config) {
      return this.config;
    }

    if (await FileSystem.exists(this.configPath)) {
      this.config = await FileSystem.readJson<QuickDeployConfig>(this.configPath);
      return this.config;
    }

    return null;
  }

  async save(config: QuickDeployConfig): Promise<void> {
    this.config = config;
    await FileSystem.writeJson(this.configPath, config);
  }

  async createConfigFile(projectConfig: ProjectConfig, template?: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const config: QuickDeployConfig = {
      projectName: projectConfig.name,
      framework: projectConfig.framework,
      deploymentType: 'static',
      environmentVariables: {},
      wrangler: {
        name: projectConfig.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        compatibility_date: today || '2024-01-01'
      }
    };

    await this.save(config);
  }

  getProjectName(): string {
    // Use current directory name if no config is loaded
    if (!this.config) {
      return path.basename(process.cwd());
    }
    return this.config.projectName;
  }

  getEnvironmentVariables(): Record<string, string> {
    return this.config?.environmentVariables || {};
  }

  getWranglerConfig(): WranglerConfig {
    const today = new Date().toISOString().split('T')[0];
    const projectName = this.getProjectName();
    
    const defaultConfig: WranglerConfig = {
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      compatibility_date: today || '2024-01-01'
    };

    return { ...defaultConfig, ...this.config?.wrangler };
  }
}
