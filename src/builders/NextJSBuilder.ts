import fs from 'fs-extra';
import { execa } from 'execa';
import { BaseBuilder, BuildConfig, BuildResult } from './BaseBuilder.js';

export class NextJSBuilder extends BaseBuilder {
  async configure(): Promise<void> {
    this.logger.info('Installing OpenNext Cloudflare adapter...');
    
    const packageManager = await this.detectPackageManager();
    
    try {
      // Install @opennextjs/cloudflare like C3 does
      await execa(packageManager, ['add', '@opennextjs/cloudflare@^1.3.0'], { stdio: 'inherit' });
      this.logger.success('OpenNext Cloudflare adapter installed');
      
      await this.updateNextConfig();
    } catch (error) {
      this.logger.error('Failed to configure Next.js:', error);
      throw error;
    }
  }

  async build(config: BuildConfig): Promise<BuildResult> {
    this.logger.info('Building Next.js project with OpenNext...');

    try {
      // Use OpenNext build command
      await execa('npx', ['opennextjs-cloudflare', 'build'], { stdio: 'inherit' });
      
      const buildDir = await this.findBuildDirectory(['.open-next', 'out', '.next']);

      return {
        success: true,
        buildDir,
        deploymentType: 'ssr' // OpenNext is always SSR
      };
    } catch (error) {
      this.logger.error('Next.js build failed:', error);
      throw error;
    }
  }

  private async updateNextConfig(): Promise<void> {
    const configFiles = ['next.config.ts', 'next.config.mjs', 'next.config.js'];
    let configFile = null;
    
    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        configFile = file;
        break;
      }
    }

    if (configFile) {
      this.logger.info(`Updating ${configFile} for OpenNext...`);
      
      const isTypeScript = configFile.endsWith('.ts');
      const content = await fs.readFile(configFile, 'utf8');
      
      // Add OpenNext initialization (like C3 does)
      const openNextImport = `
// added by quick-deploy to enable calling \`getCloudflareContext()\` in \`next dev\`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
`;

      const updatedContent = content + openNextImport;
      await fs.writeFile(configFile, updatedContent);
      
      this.logger.success(`Updated ${configFile} with OpenNext configuration`);
    }

    // Create open-next.config.ts if it doesn't exist
    if (!await fs.pathExists('open-next.config.ts')) {
      const openNextConfig = `import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Uncomment to enable R2 cache,
  // It should be imported as:
  // \`import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";\`
  // See https://opennext.js.org/cloudflare/caching for more details
  // incrementalCache: r2IncrementalCache,
});`;

      await fs.writeFile('open-next.config.ts', openNextConfig);
      this.logger.info('Created open-next.config.ts');
    }
  }
}
