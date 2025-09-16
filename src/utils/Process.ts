import { execa, ExecaError } from 'execa';
import { Logger } from './Logger.js';

export class Process {
  constructor(private logger: Logger) {}

  async exec(command: string, options: { cwd?: string; env?: Record<string, string> } = {}): Promise<string> {
    this.logger.debug(`Executing: ${command}`);

    try {
      const { cmd, args } = this.parseCommand(command);
      
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
      const { cmd, args } = this.parseCommand(command);

      await execa(cmd, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error(`Command failed: ${command}`);
    }
  }

  private parseCommand(command: string): { cmd: string; args: string[] } {
    // Handle quoted arguments properly
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      args.push(current);
    }
    
    const cmd = args.shift();
    if (!cmd) throw new Error('Empty command');
    
    return { cmd, args };
  }

  async hasCommand(command: string): Promise<boolean> {
    try {
      // Use 'command -v' which is more universal than 'which'
      await execa('command', ['-v', command]);
      return true;
    } catch {
      try {
        // Fallback for Windows
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

