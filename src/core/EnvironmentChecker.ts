import semver from 'semver';
import { Logger } from '../utils/Logger.js';
import { Process } from '../utils/Process.js';
import { FileSystem } from '../utils/FileSystem.js';
import { ProjectConfig, EnvironmentVariable } from '../types/index.js';

export class EnvironmentChecker {
  private process: Process;

  constructor(private logger: Logger) {
    this.process = new Process(logger);
  }

  async checkProject(projectConfig: ProjectConfig): Promise<void> {
    this.logger.info('Checking environment...');

    await this.validateNodeVersion();
    
    // Enhanced environment variable checking for all frameworks
    await this.checkEnvironmentVariables(projectConfig);

    this.logger.success('Environment checks completed');
  }

  async validateNodeVersion(): Promise<void> {
    const nodeVersion = process.version;
    const minVersion = '18.0.0';

    if (!semver.gte(nodeVersion, minVersion)) {
      throw new Error(`Node.js ${minVersion} or higher is required. Current version: ${nodeVersion}`);
    }

    this.logger.debug(`Node.js version: ${nodeVersion} ✓`);
  }

  async validateCloudflareAuth(): Promise<void> {
    try {
      const output = await this.process.exec('wrangler whoami');
      const user = output.split('\n')[0];
      this.logger.debug(`Cloudflare authenticated as: ${user}`);
    } catch (error) {
      throw new Error('Not authenticated with Cloudflare. Run: wrangler login');
    }
  }

  private async checkEnvironmentVariables(projectConfig: ProjectConfig): Promise<void> {
    const requiredVars = await this.detectRequiredEnvironmentVariables(projectConfig);
    
    if (requiredVars.length === 0) {
      this.logger.debug('No environment variables detected');
      return;
    }

    this.logger.info('Checking environment variables...');

    const missingVars = requiredVars.filter(variable => {
      const hasEnvVar = process.env[variable.key] !== undefined;
      const hasEnvFile = this.hasEnvFileVariable(variable.key);
      return !hasEnvVar && !hasEnvFile;
    });

    if (missingVars.length > 0) {
      this.logger.warn('Missing environment variables:');
      missingVars.forEach(variable => {
        this.logger.warn(`  - ${variable.key}${variable.description ? `: ${variable.description}` : ''}`);
      });

      await this.handleMissingEnvironmentVariables(missingVars);
    }
  }

  private async detectRequiredEnvironmentVariables(projectConfig: ProjectConfig): Promise<EnvironmentVariable[]> {
    const variables: EnvironmentVariable[] = [];
    
    try {
      // Search for environment variable usage in source files
      const patterns = [
        'src/**/*.{js,ts,jsx,tsx,astro}',
        '**/*.config.{js,ts,mjs}',
        'content.config.{js,ts}'
      ];

      const sourceFiles = await FileSystem.glob(patterns, {
        ignore: ['node_modules/**', 'dist/**', 'build/**', '.next/**']
      });

      for (const file of sourceFiles) {
        try {
          const content = await FileSystem.readFile(file);
          
          // Look for import.meta.env.VARIABLE_NAME patterns
          const importMetaMatches = content.match(/import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g);
          if (importMetaMatches) {
            importMetaMatches.forEach(match => {
              const key = match.replace('import.meta.env.', '');
              if (!variables.find(v => v.key === key)) {
                variables.push({ key, required: true });
              }
            });
          }

          // Look for process.env.VARIABLE_NAME patterns
          const processEnvMatches = content.match(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
          if (processEnvMatches) {
            processEnvMatches.forEach(match => {
              const key = match.replace('process.env.', '');
              if (!variables.find(v => v.key === key)) {
                variables.push({ key, required: true });
              }
            });
          }
        } catch (error) {
          // Skip files that can't be read
          this.logger.debug(`Could not read file ${file}: ${error}`);
        }
      }
    } catch (error) {
      this.logger.debug('Could not scan for environment variables:', error);
    }

    return variables;
  }

  private hasEnvFileVariable(key: string): boolean {
    const envFiles = ['.env', '.env.local', '.env.production'];
    
    for (const file of envFiles) {
      try {
        const content = require('fs').readFileSync(file, 'utf8');
        if (content.includes(`${key}=`)) {
          return true;
        }
      } catch {
        // File doesn't exist
      }
    }

    return false;
  }

  private async handleMissingEnvironmentVariables(missingVars: EnvironmentVariable[]): Promise<void> {
    this.logger.warn('Some environment variables are missing.');
    this.logger.info('Creating .env.example template...');

    await this.createEnvironmentTemplate(missingVars);
    
    this.logger.warn('Build may fail without proper environment variables.');
    this.logger.info('Please check .env.example and create .env with actual values if needed.');
  }

  private async createEnvironmentTemplate(variables: EnvironmentVariable[]): Promise<void> {
    const envContent = [
      '# Environment variables for this project',
      '# Copy this file to .env and add your actual values',
      '',
      ...variables.map(variable => `${variable.key}=your_value_here${variable.description ? ` # ${variable.description}` : ''}`)
    ].join('\n');

    const envFile = '.env.example';
    await FileSystem.writeFile(envFile, envContent);
    
    this.logger.info(`Created ${envFile} with variable templates`);
  }
}
