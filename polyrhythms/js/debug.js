// Debug module for the Polyrhythm Experiment

// Test function to check if modules can load correctly
export function testModuleLoading() {
    console.log('Debug module loaded successfully');
    return true;
}

// Test connection to the audio module
export async function testAudioModule() {
    try {
        const audioModule = await import('./audio.js');
        console.log('Audio module loaded successfully in test');
        return true;
    } catch (error) {
        console.error('Error loading audio module:', error);
        return false;
    }
}

// Test connection to the scheduler module
export async function testSchedulerModule() {
    try {
        const schedulerModule = await import('./scheduler.js');
        console.log('Scheduler module loaded successfully in test');
        return true;
    } catch (error) {
        console.error('Error loading scheduler module:', error);
        return false;
    }
}

// Test connection to the visualizations module
export async function testVisualizationsModule() {
    try {
        const visualizationsModule = await import('./visualizations.js');
        console.log('Visualizations module loaded successfully in test');
        return true;
    } catch (error) {
        console.error('Error loading visualizations module:', error);
        return false;
    }
}

// Test all module connections
export async function testAllModules() {
    const results = {
        audio: await testAudioModule(),
        scheduler: await testSchedulerModule(),
        visualizations: await testVisualizationsModule()
    };
    console.log('Module test results:', results);
    return results;
}

// Add to window for console testing
window.testModules = {
    testModuleLoading,
    testAudioModule,
    testSchedulerModule,
    testVisualizationsModule,
    testAllModules
}; 