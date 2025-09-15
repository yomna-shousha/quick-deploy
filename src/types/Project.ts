import { Framework, PackageManager } from './index.js';

export interface ProjectConfig {
  name: string;
  framework: Framework;
  packageManager: PackageManager;
  buildDir: string;
  hasEnvironmentVariables: boolean;
  environmentFiles: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}
