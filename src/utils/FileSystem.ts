import fs from 'fs-extra';
import path from 'path';
import { globby } from 'globby';

export class FileSystem {
  static async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  static async writeJson(filePath: string, data: any, options?: fs.WriteOptions): Promise<void> {
    await fs.writeJson(filePath, data, { spaces: 2, ...options });
  }

  static async readJson<T = any>(filePath: string): Promise<T> {
    return await fs.readJson(filePath);
  }

  static async copy(src: string, dest: string): Promise<void> {
    await fs.copy(src, dest);
  }

  static async remove(path: string): Promise<void> {
    await fs.remove(path);
  }

  static async exists(path: string): Promise<boolean> {
    return await fs.pathExists(path);
  }

  static async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    return await fs.readFile(filePath, encoding);
  }

  static async writeFile(filePath: string, data: string): Promise<void> {
    await fs.writeFile(filePath, data);
  }

  static async glob(patterns: string | string[], options?: { cwd?: string; ignore?: string[] }): Promise<string[]> {
    return await globby(patterns, options);
  }

  static resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  static join(...paths: string[]): string {
    return path.join(...paths);
  }

  static dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  static basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }
}
