import { DeploymentType, WranglerConfig } from './index.js';

export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  logs: string[];
  error?: string;
}

export interface DeploymentConfig {
  projectName: string;
  buildDir: string;
  deploymentType: DeploymentType;
  wranglerConfig: WranglerConfig;
  environmentVariables?: Record<string, string>;
}
