// src/core/FrameworkDetector.ts
import fs from 'fs-extra';
import { Logger } from '../utils/Logger.js';

interface FrameworkConfig {
  name: string;
  detection: {
    configFiles?: string[];
    dependencies?: string[];
    staticFiles?: string[];
  };
  build: {
    command: string;
    outputDir: string;
  };
  deploy: {
    type: 'static' | 'ssr';
    adapter?: string;
    compatibility_flags?: string[];
  };
  dev: {
    command: string;
    port?: number;
  };
}

const FRAMEWORKS: FrameworkConfig[] = [
  {
    name: 'angular',
    detection: {
      configFiles: ['angular.json'],
      dependencies: ['@angular/core', '@angular/cli']
    },
    build: {
      command: 'npm run build',
      outputDir: 'dist'
    },
    deploy: {
      type: 'ssr',
      compatibility_flags: ['nodejs_compat']
    },
    dev: {
      command: 'npm run dev',
      port: 4200
    }
  },
  {
    name: 'nuxt',
    detection: {
      configFiles: ['nuxt.config.ts', 'nuxt.config.js'],
      dependencies: ['nuxt', '@nuxt/kit']
    },
    build: {
      command: 'npm run build',
      outputDir: '.output'
    },
    deploy: {
      type: 'ssr',
      compatibility_flags: ['nodejs_compat']
    },
    dev: {
      command: 'npm run dev',
      port: 3000
    }
  },
  {
    name: 'nextjs',
    detection: {
      configFiles: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
      dependencies: ['next']
    },
    build: {
      command: 'npm run build',
      outputDir: '.open-next'
    },
    deploy: {
      type: 'ssr',
      compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public']
    },
    dev: {
      command: 'npm run dev',
      port: 3000
    }
  },
  {
    name: 'astro',
    detection: {
      configFiles: ['astro.config.mjs', 'astro.config.js', 'astro.config.ts'],
      dependencies: ['astro']
    },
    build: {
      command: 'npm run build',
      outputDir: 'dist'
    },
    deploy: {
      type: 'ssr',
      adapter: '@astrojs/cloudflare',
      compatibility_flags: ['nodejs_compat']
    },
    dev: {
      command: 'npm run dev',
      port: 4321
    }
  },
  {
    name: 'svelte',
    detection: {
      configFiles: ['svelte.config.js'],
      dependencies: ['svelte', '@sveltejs/kit']
    },
    build: {
      command: 'npm run build',
      outputDir: '.svelte-kit/cloudflare'
    },
    deploy: {
      type: 'ssr',
      adapter: '@sveltejs/adapter-cloudflare'
    },
    dev: {
      command: 'npm run dev',
      port: 5173
    }
  },
  {
    name: 'react-router',
    detection: {
      configFiles: ['react-router.config.ts', 'react-router.config.js'],
      dependencies: ['react-router', '@react-router/dev']
    },
    build: {
      command: 'npm run build',
      outputDir: 'build'
    },
    deploy: {
      type: 'ssr',
      compatibility_flags: ['nodejs_compat']
    },
    dev: {
      command: 'npm run dev',
      port: 3000
    }
  },
  {
    name: 'remix',
    detection: {
      configFiles: ['remix.config.js'],
      dependencies: ['@remix-run/node', '@remix-run/react']
    },
    build: {
      command: 'npm run build',
      outputDir: 'build'
    },
    deploy: {
      type: 'ssr',
      compatibility_flags: ['nodejs_compat']
    },
    dev: {
      command: 'npm run dev',
      port: 3000
    }
  },
  {
    name: 'react',
    detection: {
      configFiles: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
      dependencies: ['vite', 'react']
    },
    build: {
      command: 'npm run build',
      outputDir: 'dist'
    },
    deploy: {
      type: 'static'
    },
    dev: {
      command: 'npm run dev',
      port: 5173
    }
  },
  {
    name: 'static',
    detection: {
      staticFiles: ['index.html']
    },
    build: {
      command: '', // No build needed
      outputDir: '.'
    },
    deploy: {
      type: 'static'
    },
    dev: {
      command: '', // No dev server for static sites
      port: 8080
    }
  }
];

export class FrameworkDetector {
  constructor(private logger: Logger) {}

  async detect(): Promise<FrameworkConfig | null> {
    this.logger.info('Detecting framework...');

    const packageJson = await this.readPackageJson();
    
    // If no package.json, check for static site
    if (!packageJson) {
      return await this.detectStaticSite();
    }

    const scores = await Promise.all(
      FRAMEWORKS.filter(f => f.name !== 'static').map(async (framework) => ({
        framework,
        score: await this.scoreFramework(framework, packageJson)
      }))
    );

    const bestMatch = scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (!bestMatch) {
      // If no framework detected but package.json exists, might still be static
      return await this.detectStaticSite();
    }

    this.logger.success(`Detected ${bestMatch.framework.name}`);
    return await this.enhanceFrameworkConfig(bestMatch.framework, packageJson);
  }

  private async detectStaticSite(): Promise<FrameworkConfig | null> {
    this.logger.info('Checking for static site...');
    
    // Look for index.html in common locations
    const staticLocations = [
      'index.html', // Root directory
      'public/index.html', // Public folder
      'dist/index.html', // Built static site
      'build/index.html', // Another common build folder
      '_site/index.html', // Jekyll
      'out/index.html' // Some static generators
    ];

    for (const location of staticLocations) {
      if (await fs.pathExists(location)) {
        this.logger.success('Detected static site');
        const staticFramework = FRAMEWORKS.find(f => f.name === 'static')!;
        
        // Update output directory based on where we found index.html
        if (location !== 'index.html') {
          staticFramework.build.outputDir = location.replace('/index.html', '');
        }
        
        return staticFramework;
      }
    }

    return null;
  }

  private async scoreFramework(framework: FrameworkConfig, packageJson: any): Promise<number> {
    let score = 0;

    // Check dependencies first (higher priority for specific frameworks)
    if (framework.detection.dependencies) {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      for (const dep of framework.detection.dependencies) {
        if (allDeps[dep]) {
          // Give Angular highest priority when detected
          if (framework.name === 'angular' && (dep === '@angular/core' || dep === '@angular/cli')) {
            score += 200;
          }
          // Give Nuxt high priority
          else if (framework.name === 'nuxt' && dep === 'nuxt') {
            score += 180;
          }
          // Give React Router v7 higher priority over generic React
          else if (framework.name === 'react-router' && (dep === 'react-router' || dep === '@react-router/dev')) {
            score += 200; // Highest priority
          } 
          // Give Next.js high priority
          else if (framework.name === 'nextjs' && dep === 'next') {
            score += 150;
          }
          // Give Astro high priority
          else if (framework.name === 'astro' && dep === 'astro') {
            score += 150;
          }
          // Give SvelteKit high priority  
          else if (framework.name === 'svelte' && dep === '@sveltejs/kit') {
            score += 150;
          }
          // Classic Remix gets medium priority
          else if (framework.name === 'remix') {
            score += 100;
          }
          // Generic React + Vite gets lower priority
          else if (framework.name === 'react') {
            score += 50;
          } else {
            score += 75;
          }
        }
      }
    }

    // Check config files (medium priority)
    if (framework.detection.configFiles) {
      for (const configFile of framework.detection.configFiles) {
        if (await fs.pathExists(configFile)) {
          score += 100;
          break;
        }
      }
    }

    return score;
  }

  private async enhanceFrameworkConfig(
    framework: FrameworkConfig, 
    packageJson: any
  ): Promise<FrameworkConfig> {
    const enhanced = { ...framework };
    
    // Don't adapt commands for static sites (no package manager)
    if (framework.name === 'static') {
      return enhanced;
    }
    
    // Adapt commands for detected package manager
    const packageManager = await this.detectPackageManager();
    enhanced.build.command = this.adaptCommand(framework.build.command, packageManager);
    enhanced.dev.command = this.adaptCommand(framework.dev.command, packageManager);
    
    return enhanced;
  }

  private adaptCommand(command: string, packageManager: string): string {
    if (!command || command.startsWith('npm run')) {
      const script = command.replace('npm run ', '');
      switch (packageManager) {
        case 'pnpm': return `pnpm run ${script}`;
        case 'yarn': return `yarn ${script}`;
        case 'bun': return `bun run ${script}`;
        default: return command;
      }
    }
    return command;
  }

  private async detectPackageManager(): Promise<string> {
    if (await fs.pathExists('pnpm-lock.yaml')) return 'pnpm';
    if (await fs.pathExists('yarn.lock')) return 'yarn';
    if (await fs.pathExists('bun.lockb')) return 'bun';
    return 'npm';
  }

  private async readPackageJson(): Promise<any> {
    try {
      return await fs.readJson('package.json');
    } catch {
      return null;
    }
  }
}
