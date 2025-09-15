import { execa, ExecaError } from 'execa';
import { Logger } from './Logger.js';

export class Process {
  constructor(private logger: Logger) {}

  async exec(command: string, options: { cwd?: string; env?: Record<string, string> } = {}): Promise<string> {
    this.logger.debug(`Executing: ${command}`);

    try {
      const args = command.split(' ');
      const cmd = args.shift();
      if (!cmd) throw new Error('Empty command');

      const result = await execa(cmd, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: 'pipe'
      });

      this.logger.debug(`Command completed: ${command}`);
      return result.stdout;
    } catch (error) {
      const execaError = error as ExecaError;
      this.logger.error(`Command failed: ${command}`);
      throw new Error(`Command failed: ${command}\n${execaError.stderr || execaError.message}`);
    }
  }

  async execWithOutput(command: string, options: { cwd?: string; env?: Record<string, string> } = {}): Promise<void> {
    this.logger.debug(`Executing with output: ${command}`);

    try {
      const args = command.split(' ');
      const cmd = args.shift();
      if (!cmd) throw new Error('Empty command');

      await execa(cmd, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error(`Command failed: ${command}`);
    }
  }

  async hasCommand(command: string): Promise<boolean> {
    try {
      await execa('which', [command]);
      return true;
    } catch {
      try {
        await execa('where', [command]);
        return true;
      } catch {
        return false;
      }
    }
  }

  async getCommandVersion(command: string): Promise<string | null> {
    try {
      const result = await execa(command, ['--version']);
      return result.stdout.trim();
    } catch {
      return null;
    }
  }
}
