import { BaseBuilder } from './BaseBuilder.js';
import { NextJSBuilder } from './NextJSBuilder.js';
import { AstroBuilder } from './AstroBuilder.js';
import { ViteBuilder } from './ViteBuilder.js';
import { NuxtBuilder } from './NuxtBuilder.js';
import { SvelteBuilder } from './SvelteBuilder.js';
import { RemixBuilder } from './RemixBuilder.js';
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
        return new NuxtBuilder(logger);
      case 'svelte':
        return new SvelteBuilder(logger);
      case 'remix':
        return new RemixBuilder(logger);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }
}

export * from './BaseBuilder.js';
export * from './NextJSBuilder.js';
export * from './AstroBuilder.js';
export * from './ViteBuilder.js';
export * from './NuxtBuilder.js';
export * from './SvelteBuilder.js';
export * from './RemixBuilder.js';

