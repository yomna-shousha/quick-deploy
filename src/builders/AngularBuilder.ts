import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseBuilder, BuildConfig, BuildResult } from './BaseBuilder.js';

interface AngularJson {
  projects: Record<string, {
    architect: {
      build: {
        options: {
          outputPath: string;
          outputMode?: string;
          ssr?: Record<string, unknown>;
          assets?: string[];
          platform?: string;
        };
      };
    };
  }>;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export class AngularBuilder extends BaseBuilder {
  async configure(): Promise<void> {
    this.logger.info('Installing Angular SSR dependencies...');
    
    const packageManager = await this.detectPackageManager();
    
    try {
      // Install xhr2 for Angular SSR compatibility like C3 does
      await execa(packageManager, ['add', '-D', 'xhr2'], { stdio: 'inherit' });
      this.logger.success('Angular SSR dependencies installed');
      
      await this.updateAngularConfig();
      await this.updateAppCode();
      await this.createServerFile();
      await this.createWranglerConfig();
    } catch (error) {
      this.logger.error('Failed to configure Angular:', error);
      throw error;
    }
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    this.logger.info('Building Angular project...');

    try {
      // Use standard Angular build command - remove the custom platform flag
      await this.runBuildCommand(config.packageManager);
      
      const buildDir = await this.findBuildDirectory(['dist']);

      return {
        success: true,
        buildDir,
        deploymentType: 'ssr' // Angular with SSR
      };
    } catch (error) {
      this.logger.error('Angular build failed:', error);
      throw error;
    }
  }

  private async updateAngularConfig(): Promise<void> {
    if (!await fs.pathExists('angular.json')) {
      this.logger.warn('No angular.json found - this might not be an Angular project');
      return;
    }

    this.logger.info('Updating angular.json for Cloudflare...');
    
    const angularJson = await fs.readJson('angular.json') as AngularJson;
    const projectName = await this.getProjectName();
    
    // Update builder configuration like C3 does
    const architectSection = angularJson.projects[projectName]?.architect;
    if (architectSection?.build?.options) {
      architectSection.build.options.outputPath = 'dist';
      architectSection.build.options.outputMode = 'server';
      
      if (!architectSection.build.options.ssr) {
        architectSection.build.options.ssr = {};
      }
      
      // Set experimentalPlatform to neutral for Cloudflare Workers
      (architectSection.build.options.ssr as any).experimentalPlatform = 'neutral';
    }
    
    await fs.writeJson('angular.json', angularJson, { spaces: 2 });
    this.logger.success('Updated angular.json');
  }

  private async updateAppCode(): Promise<void> {
    this.logger.info('Updating Angular application code...');
    
    // Update app.config.ts to enable fetch usage in HttpClient like C3 does
    const appConfigPath = 'src/app/app.config.ts';
    if (await fs.pathExists(appConfigPath)) {
      let appConfig = await fs.readFile(appConfigPath, 'utf8');
      
      // Add the import if not present
      if (!appConfig.includes("import { provideHttpClient, withFetch } from '@angular/common/http'")) {
        appConfig = "import { provideHttpClient, withFetch } from '@angular/common/http';\n" + appConfig;
      }
      
      // Add the provider if not present
      if (!appConfig.includes('provideHttpClient(withFetch())')) {
        appConfig = appConfig.replace(
          'providers: [',
          'providers: [provideHttpClient(withFetch()), '
        );
      }
      
      await fs.writeFile(appConfigPath, appConfig);
      this.logger.success('Updated app.config.ts');
    }
    
    // Update app.routes.server.ts to use Server rendering like C3 does
    const appServerRoutesPath = 'src/app/app.routes.server.ts';
    if (await fs.pathExists(appServerRoutesPath)) {
      let appRoutes = await fs.readFile(appServerRoutesPath, 'utf8');
      appRoutes = appRoutes.replace(
        'RenderMode.Prerender',
        'RenderMode.Server'
      );
      await fs.writeFile(appServerRoutesPath, appRoutes);
      this.logger.success('Updated app.routes.server.ts');
    }
    
    // Remove unwanted dependencies like C3 does
    await this.cleanupPackageJson();
  }

  private async cleanupPackageJson(): Promise<void> {
    this.logger.info('Cleaning up package.json...');
    
    const packageJsonPath = 'package.json';
    const packageManifest = await fs.readJson(packageJsonPath) as PackageJson;
    
    // Remove express dependencies as they're not needed for Cloudflare Workers
    if (packageManifest.dependencies?.['express']) {
      delete packageManifest.dependencies['express'];
    }
    if (packageManifest.devDependencies?.['@types/express']) {
      delete packageManifest.devDependencies['@types/express'];
    }
    
    await fs.writeJson(packageJsonPath, packageManifest, { spaces: 2 });
    this.logger.success('Cleaned up package.json');
  }

  private async createServerFile(): Promise<void> {
    // Only create server.ts if it doesn't exist (Angular with SSR already has it)
    if (!await fs.pathExists('src/server.ts')) {
      const serverContent = `import { AngularAppEngine, createRequestHandler } from '@angular/ssr';

const angularApp = new AngularAppEngine();

/**
 * This is a request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(async (req) => {
  const res = await angularApp.handle(req);

  return res ?? new Response('Page not found.', { status: 404 });
});

export default { fetch: reqHandler };`;

      await fs.writeFile('src/server.ts', serverContent);
      this.logger.info('Created src/server.ts');
    } else {
      this.logger.info('Using existing src/server.ts');
    }
  }

  private async createWranglerConfig(): Promise<void> {
    if (!await fs.pathExists('wrangler.jsonc')) {
      const projectName = await this.getProjectName();
      
      const wranglerConfig = {
        "name": projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        "main": "./dist/server/server.mjs",
        "compatibility_date": new Date().toISOString().split('T')[0],
        "compatibility_flags": ["nodejs_compat"],
        "assets": {
          "binding": "ASSETS",
          "directory": "./dist/browser"
        },
        "observability": {
          "enabled": true
        }
      };

      await fs.writeJson('wrangler.jsonc', wranglerConfig, { spaces: 2 });
      this.logger.info('Created wrangler.jsonc');
    }
  }

  private async getProjectName(): Promise<string> {
    try {
      const packageJson = await fs.readJson('package.json');
      return packageJson.name || 'angular-app';
    } catch {
      // Try to get project name from angular.json
      try {
        const angularJson = await fs.readJson('angular.json') as AngularJson;
        const projectNames = Object.keys(angularJson.projects);
        return projectNames[0] || 'angular-app';
      } catch {
        return 'angular-app';
      }
    }
  }
}
