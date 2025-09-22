import chalk from 'chalk';
import { LogLevel } from '../types/index.js';

export interface ProjectAssessment {
  framework: {
    name: string;
    version?: string;
    confidence: 'high' | 'medium' | 'low';
  };
  build: {
    command: string;
    outputDir: string;
    packageManager: string;
  };
  deployment: {
    type: 'static' | 'ssr' | 'hybrid';
    adapter?: string;
    platform: 'cloudflare-workers';
  };
  dependencies?: {
    total: number;
    missing?: string[];
    outdated?: string[];
  };
  config?: {
    files: string[];
    generated: string[];
  };
}

export class Logger {
  constructor(private verbose: boolean = false) {}

  // Project Assessment Display
  showProjectAssessment(assessment: ProjectAssessment): void {
    console.log();
    console.log(chalk.cyan('🔍 Project Assessment'));
    console.log(chalk.gray('─'.repeat(50)));

    // Framework Detection
    const confidenceColor = assessment.framework.confidence === 'high' ? chalk.green : 
                           assessment.framework.confidence === 'medium' ? chalk.yellow : chalk.red;
    
    console.log(chalk.white('Framework:'), chalk.bold(assessment.framework.name), 
                confidenceColor(`(${assessment.framework.confidence} confidence)`));
    
    if (assessment.framework.version) {
      console.log(chalk.gray(`           Version: ${assessment.framework.version}`));
    }

    // Build Configuration
    console.log(chalk.white('Build:    '), chalk.blue(assessment.build.command));
    console.log(chalk.white('Output:   '), chalk.blue(assessment.build.outputDir));
    console.log(chalk.white('Manager:  '), chalk.blue(assessment.build.packageManager));

    // Deployment Strategy
    const deploymentTypeColor = assessment.deployment.type === 'static' ? chalk.cyan : 
                               assessment.deployment.type === 'ssr' ? chalk.magenta : chalk.blue;
    
    console.log(chalk.white('Deploy:   '), deploymentTypeColor(assessment.deployment.type.toUpperCase()), 
                chalk.gray('→'), chalk.gray(assessment.deployment.platform));
    
    if (assessment.deployment.adapter) {
      console.log(chalk.gray(`           Adapter: ${assessment.deployment.adapter}`));
    }

    // Dependencies (if available)
    if (assessment.dependencies) {
      const depColor = assessment.dependencies.missing?.length ? chalk.yellow : chalk.green;
      console.log(chalk.white('Deps:     '), depColor(`${assessment.dependencies.total} packages`));
      
      if (assessment.dependencies.missing?.length) {
        console.log(chalk.gray(`           Missing: ${assessment.dependencies.missing.join(', ')}`));
      }
    }

    // Configuration Files (if any were generated)
    if (assessment.config?.generated?.length) {
      console.log(chalk.white('Config:   '), chalk.green(`Generated ${assessment.config.generated.join(', ')}`));
    }

    console.log(chalk.gray('─'.repeat(50)));
    console.log();
  }

  // Build Progress with Cleaner Output
  startPhase(phase: string): void {
    console.log(chalk.blue('▶'), chalk.white(phase));
  }

  phaseSuccess(phase: string, duration?: string): void {
    const time = duration ? chalk.gray(`(${duration})`) : '';
    console.log(chalk.green('✓'), chalk.white(phase), time);
  }

  phaseInfo(message: string): void {
    console.log(chalk.gray('  '), chalk.white(message));
  }

  phaseWarning(message: string): void {
    console.log(chalk.yellow('  ⚠'), chalk.white(message));
  }

  // Deployment Summary
  showDeploymentSuccess(framework: string): void {
    console.log();
    console.log(chalk.green('🎉 Deployment Successful'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.white('Platform:'), chalk.blue('Cloudflare Workers'));
    console.log(chalk.white('Runtime: '), chalk.gray(`${framework} → Cloudflare Runtime`));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
  }

  // Replace the emoji-heavy methods with cleaner alternatives
  debug(message: string, ...args: any[]): void {
    if (this.verbose) {
      console.log(chalk.gray(`🔧 ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue('•'), chalk.white(message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow('⚠'), chalk.white(message), ...args);
  }

  error(message: string, ...args: any[]): void {
    console.log(chalk.red('✗'), chalk.white(message), ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green('✓'), chalk.white(message), ...args);
  }

  log(level: LogLevel, message: string, ...args: any[]): void {
    switch (level) {
      case 'debug':
        this.debug(message, ...args);
        break;
      case 'info':
        this.info(message, ...args);
        break;
      case 'warn':
        this.warn(message, ...args);
        break;
      case 'error':
        this.error(message, ...args);
        break;
      case 'success':
        this.success(message, ...args);
        break;
    }
  }

  separator(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  banner(text: string): void {
    console.log();
    console.log(chalk.cyan(`🚀 ${text}`));
    this.separator();
  }

  // For when tools need to show their own output
  passthrough(message: string): void {
    console.log(message);
  }

  // Clean command execution display
  runningCommand(command: string): void {
    console.log(chalk.gray(`  $ ${command}`));
  }
}
