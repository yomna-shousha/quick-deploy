// src/builders/BuilderFactory.ts
import { BaseBuilder } from './BaseBuilder.js';
import { AstroBuilder } from './AstroBuilder.js';
import { NextJSBuilder } from './NextJSBuilder.js';
import { ReactBuilder } from './ReactBuilder.js';
import { ReactRouterBuilder } from './ReactRouterBuilder.js';
import { RemixBuilder } from './RemixBuilder.js';
import { SvelteBuilder } from './SvelteBuilder.js';
import { NuxtBuilder } from './NuxtBuilder.js';
import { AngularBuilder } from './AngularBuilder.js';
import { Logger } from '../utils/Logger.js';

export class BuilderFactory {
  static create(framework: string, logger: Logger): BaseBuilder {
    switch (framework) {
      case 'astro':
        return new AstroBuilder(logger);
      case 'nextjs':
        return new NextJSBuilder(logger);
      case 'react':
      case 'vite':
        return new ReactBuilder(logger);
      case 'react-router':
        return new ReactRouterBuilder(logger);
      case 'remix':
        return new RemixBuilder(logger);
      case 'svelte':
        return new SvelteBuilder(logger);
      case 'nuxt':
        return new NuxtBuilder(logger);
      case 'angular':
        return new AngularBuilder(logger);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }
}
