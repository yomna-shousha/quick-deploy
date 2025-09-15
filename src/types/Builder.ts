import { DeploymentType, PackageManager } from './index.js';

export interface BuildResult {
  success: boolean;
  buildDir: string;
  deploymentType: DeploymentType;
  framework: string;
  metadata?: Record<string, any>;
}

export interface BuildOptions {
  packageManager: PackageManager;
  environmentVariables?: Record<string, string>;
  production?: boolean;
  verbose?: boolean;
}
