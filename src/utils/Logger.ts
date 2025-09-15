import chalk from 'chalk';
import { LogLevel } from '../types/index.js';

export class Logger {
  constructor(private verbose: boolean = false) {}

  debug(message: string, ...args: any[]): void {
    if (this.verbose) {
      console.log(chalk.gray(`🐛 ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue(`ℹ️  ${message}`), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow(`⚠️  ${message}`), ...args);
  }

  error(message: string, ...args: any[]): void {
    console.log(chalk.red(`❌ ${message}`), ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green(`✅ ${message}`), ...args);
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
}
