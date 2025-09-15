import { BaseBuilder } from './BaseBuilder.js';
import { NextJSBuilder } from './NextJSBuilder.js';
import { AstroBuilder } from './AstroBuilder.js';
import { ViteBuilder } from './ViteBuilder.js';
import { Logger } from '../utils/Logger.js';
import { Framework } from '../types/index.js';

export class BuilderFactory {
  static create(framework: Framework, logger: Logger): BaseBuilder {
    switch (framework) {
      case 'nextjs':
        return new NextJSBuilder(logger);
      case 'astro':
        return new AstroBuilder(logger);
      case 'vite':
        return new ViteBuilder(logger);
      case 'nuxt':
        return new ViteBuilder(logger);
      case 'svelte':
        return new ViteBuilder(logger);
      case 'remix':
        return new ViteBuilder(logger);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }
}

export * from './BaseBuilder.js';
export * from './NextJSBuilder.js';
export * from './AstroBuilder.js';
export * from './ViteBuilder.js';
