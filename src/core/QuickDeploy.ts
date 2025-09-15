import { ProjectAnalyzer } from './ProjectAnalyzer.js';
import { DependencyManager } from './DependencyManager.js';
import { EnvironmentChecker } from './EnvironmentChecker.js';
import { BuilderFactory } from '../builders/index.js';
import { DeployerFactory } from '../deployers/index.js';
import { Logger } from '../utils/Logger.js';
import { Config } from '../utils/Config.js';
import { CLIOptions, ProjectConfig, BuildResult, DeploymentResult } from '../types/index.js';

export class QuickDeploy {
  private logger: Logger;
  private config: Config;
  private projectAnalyzer: ProjectAnalyzer;
  private dependencyManager: DependencyManager;
  private environmentChecker: EnvironmentChecker;

  constructor(private options: CLIOptions = {}) {
    this.logger = new Logger(options.verbose);
    this.config = new Config(options.configFile);
    this.projectAnalyzer = new ProjectAnalyzer(this.logger);
    this.dependencyManager = new DependencyManager(this.logger);
    this.environmentChecker = new EnvironmentChecker(this.logger);
  }

  async deploy(): Promise<void> {
    this.logger.info('Starting Quick Deploy...');

    try {
      const projectConfig = await this.analyzeProject();
      
      if (!this.options.skipDependencies) {
        await this.setupDependencies(projectConfig);
      }

      if (!this.options.skipEnvironmentCheck) {
        await this.checkEnvironment(projectConfig);
      }

      const buildResult = await this.buildProject(projectConfig);
      const deploymentResult = await this.deployProject(buildResult);

      this.logger.success('Deployment completed successfully!');
      if (deploymentResult.url) {
        this.logger.info(`Your site is live at: ${deploymentResult.url}`);
      }
    } catch (error) {
      this.logger.error('Deployment failed:', error);
      throw error;
    }
  }

  async init(template?: string): Promise<void> {
    this.logger.info('Initializing quick-deploy configuration...');
    const projectConfig = await this.projectAnalyzer.analyze();
    await this.config.createConfigFile(projectConfig, template);
    this.logger.success('Configuration initialized!');
  }

  async doctor(): Promise<void> {
    this.logger.info('Running diagnostic checks...');
    await this.projectAnalyzer.validateProject();
    await this.dependencyManager.validatePackageManager();
    this.logger.success('All diagnostic checks passed!');
  }

  async clean(): Promise<void> {
    this.logger.info('Cleaning build artifacts...');
    const dirsToClean = ['dist', 'build', 'out', '.next', '.output'];
    
    for (const dir of dirsToClean) {
      try {
        await this.projectAnalyzer.removeDirectory(dir);
        this.logger.info(`Cleaned ${dir}/`);
      } catch {
        // Directory doesn't exist, ignore
      }
    }
    
    this.logger.success('Clean completed!');
  }

  private async analyzeProject(): Promise<ProjectConfig> {
    this.logger.info('Analyzing project...');
    const projectConfig = await this.projectAnalyzer.analyze();
    this.logger.success(`Found ${projectConfig.framework} project`);
    return projectConfig;
  }

  private async setupDependencies(projectConfig: ProjectConfig): Promise<void> {
    this.logger.info('Setting up dependencies...');
    await this.dependencyManager.setup(projectConfig.packageManager);
    await this.dependencyManager.install();
    this.logger.success('Dependencies installed');
  }

  private async checkEnvironment(projectConfig: ProjectConfig): Promise<void> {
    this.logger.info('Checking environment...');
    await this.environmentChecker.checkProject(projectConfig);
    this.logger.success('Environment check completed');
  }

  private async buildProject(projectConfig: ProjectConfig): Promise<BuildResult> {
    this.logger.info('Building project...');
    const builder = BuilderFactory.create(projectConfig.framework, this.logger);
    
    const buildResult = await builder.build({
      packageManager: projectConfig.packageManager,
      environmentVariables: this.config.getEnvironmentVariables(),
      production: true,
      verbose: this.options.verbose || false
    });

    if (!buildResult.success) {
      throw new Error('Build failed');
    }

    this.logger.success('Build completed');
    return buildResult;
  }

  private async deployProject(buildResult: BuildResult): Promise<DeploymentResult> {
    this.logger.info('Deploying to Cloudflare...');
    const deployer = DeployerFactory.create('cloudflare', this.logger);
    
    const deploymentResult = await deployer.deploy({
      projectName: this.config.getProjectName(),
      buildDir: buildResult.buildDir,
      deploymentType: buildResult.deploymentType,
      wranglerConfig: this.config.getWranglerConfig(),
      environmentVariables: this.config.getEnvironmentVariables()
    });

    if (!deploymentResult.success) {
      throw new Error(`Deployment failed: ${deploymentResult.error}`);
    }

    return deploymentResult;
  }
}
