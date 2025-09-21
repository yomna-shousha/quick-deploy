import { FrameworkDetector } from './src/core/FrameworkDetector.js';
import { Logger } from './src/utils/Logger.js';

async function testDetection() {
  const logger = new Logger(true);
  
  // Test in temp-test directory
  process.chdir('../temp-test');
  
  const detector = new FrameworkDetector(logger);
  const framework = await detector.detect();
  
  console.log('Full framework config:', JSON.stringify(framework, null, 2));
}

testDetection().catch(console.error);
