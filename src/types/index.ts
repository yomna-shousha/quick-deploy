export type Framework = 
  | 'nextjs' 
  | 'astro' 
  | 'vite' 
  | 'nuxt' 
  | 'svelte' 
  | 'remix' 
  | 'unknown';

export type PackageManager = 
  | 'npm' 
  | 'pnpm' 
  | 'yarn' 
  | 'bun';

export type DeploymentType = 
  | 'static' 
  | 'ssr' 
  | 'hybrid' 
  | 'opennext';

export type LogLevel = 
  | 'debug' 
  | 'info' 
  | 'warn' 
  | 'error' 
  | 'success';

export interface CLIOptions {
  verbose?: boolean;
  force?: boolean;
  skipDependencies?: boolean;
  skipEnvironmentCheck?: boolean;
  outputDir?: string;
  configFile?: string;
}

export interface WranglerConfig {
  name: string;
  compatibility_date: string;
  main?: string;
  assets?: {
    directory: string;
    binding: string;
  };
  site?: {
    bucket: string;
  };
  compatibility_flags?: string[];
}

export interface EnvironmentVariable {
  key: string;
  value?: string;
  required: boolean;
  description?: string;
}

export interface MonorepoConfig {
  isMonorepo: boolean;
  workspaceType?: 'pnpm' | 'yarn' | 'npm' | 'turbo' | 'lerna';
  projects?: string[];
  selectedProject?: string;
}

export * from './Project.js';
export * from './Builder.js';
export * from './Deployer.js';
