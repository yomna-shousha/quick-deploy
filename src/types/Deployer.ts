import { DeploymentType, WranglerConfig, Framework } from './index.js';

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
  framework: Framework;  // Add this line
  wranglerConfig: WranglerConfig;
  environmentVariables?: Record<string, string>;
}
