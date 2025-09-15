#!/usr/bin/env node

import { Command } from 'commander';
import { QuickDeploy } from './core/QuickDeploy.js';
import { Logger } from './utils/Logger.js';
import { CLIOptions } from './types/index.js';

const program = new Command();
const logger = new Logger();

program
  .name('quick-deploy')
  .description('One-command deployment for modern web frameworks to Cloudflare Workers & Pages')
  .version('2.0.0-typescript');

program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-f, --force', 'Force deployment even if checks fail')
  .option('--skip-deps', 'Skip dependency installation')
  .option('--skip-env', 'Skip environment variable checks')
  .option('-o, --output-dir <dir>', 'Specify custom output directory')
  .option('-c, --config <file>', 'Use custom configuration file')
  .action(async (options: any) => {
    try {
      const cliOptions: CLIOptions = {
        verbose: options.verbose || false,
        force: options.force || false,
        skipDependencies: options.skipDeps || false,
        skipEnvironmentCheck: options.skipEnv || false,
        ...(options.outputDir && { outputDir: options.outputDir }),
        ...(options.config && { configFile: options.config })
      };

      const quickDeploy = new QuickDeploy(cliOptions);
      await quickDeploy.deploy();
      
      // Explicitly exit to prevent hanging
      process.exit(0);
    } catch (error) {
      logger.error('Deployment failed:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize quick-deploy configuration')
  .option('-t, --template <framework>', 'Specify framework template')
  .action(async (options) => {
    try {
      const quickDeploy = new QuickDeploy({ verbose: true });
      await quickDeploy.init(options.template);
      process.exit(0);
    } catch (error) {
      logger.error('Initialization failed:', error);
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Run diagnostic checks')
  .action(async () => {
    try {
      const quickDeploy = new QuickDeploy({ verbose: true });
      await quickDeploy.doctor();
      process.exit(0);
    } catch (error) {
      logger.error('Doctor check failed:', error);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Clean build artifacts')
  .action(async () => {
    try {
      const quickDeploy = new QuickDeploy({ verbose: true });
      await quickDeploy.clean();
      process.exit(0);
    } catch (error) {
      logger.error('Clean failed:', error);
      process.exit(1);
    }
  });

program.parse();
