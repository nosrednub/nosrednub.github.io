// Test app.js
console.log('Loading app-test.js...');

// Try to import the config module
import { defaultTempo, defaultVisualizationMode } from './config.js';
console.log('Config successfully imported');
console.log(`Default values: tempo=${defaultTempo}, visualization=${defaultVisualizationMode}`);

// Export something to verify this module loaded successfully
export const testLoaded = true; 