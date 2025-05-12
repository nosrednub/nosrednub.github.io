// State Module Tests for the Polyrhythm Experiment
// These tests specifically verify state management and debugState functionality

// Test suite for state functions
class StateTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    // Test runner
    async runTests() {
        console.group('Running Polyrhythm Experiment State Module Test Suite');
        console.time('State tests completed in');
        
        // Basic module tests
        await this.testStateModuleLoaded();
        await this.testStateExports();
        
        // Debug function tests
        await this.testDebugStateFunction();
        
        // State functionality tests
        await this.testStateSaving();
        await this.testStateLoading();
        
        // Finish and display results
        console.timeEnd('State tests completed in');
        console.log(`State tests completed: ${this.results.passed} passed, ${this.results.failed} failed`);
        console.groupEnd();
        
        return this.results;
    }
    
    // Record a test result
    recordTest(name, passed, message) {
        if (passed) {
            this.results.passed++;
            console.log(`✅ PASS: ${name}`);
        } else {
            this.results.failed++;
            console.error(`❌ FAIL: ${name} - ${message}`);
        }
        this.results.tests.push({
            name,
            passed,
            message: message || ''
        });
    }
    
    // Test 1: Verify state module can be loaded
    async testStateModuleLoaded() {
        try {
            // Try to import the state module
            const stateModule = await import('../state.js');
            
            this.recordTest('State module can be imported', true);
            
            // Check if module has content
            const hasContent = Object.keys(stateModule).length > 0;
            this.recordTest('State module has content', hasContent,
                hasContent ? '' : 'State module imported but appears to be empty');
            
            // Create simple validation of module object (for debugging)
            console.log('State module exports:', Object.keys(stateModule));
        } catch (error) {
            this.recordTest('State module can be imported', false, `Error: ${error.message}`);
        }
    }
    
    // Test 2: Verify all expected exports are present
    async testStateExports() {
        try {
            // Try to import the state module
            const stateModule = await import('../state.js');
            
            // Check for the presence of each expected export
            const expectedExports = [
                'getAppState',
                'loadAppState',
                'saveAppState',
                'getTrackState',
                'debugState',
                'STORAGE_KEY'
            ];
            
            // Test each export individually for better debugging
            expectedExports.forEach(exportName => {
                const hasExport = exportName in stateModule;
                this.recordTest(`State module exports '${exportName}'`, hasExport,
                    hasExport ? '' : `Export '${exportName}' not found in state module`);
            });
            
            // Specifically check debugState function since that's the issue
            const hasDebugState = 'debugState' in stateModule;
            if (hasDebugState) {
                const isFunction = typeof stateModule.debugState === 'function';
                this.recordTest('debugState is a function', isFunction,
                    isFunction ? '' : 'debugState exists but is not a function');
            }
        } catch (error) {
            this.recordTest('State exports test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 3: Test the debugState function specifically
    async testDebugStateFunction() {
        try {
            // Try to import the state module
            const stateModule = await import('../state.js');
            
            // Check if debugState exists
            if (!('debugState' in stateModule)) {
                this.recordTest('debugState function available', false, 'debugState not exported from state.js');
                return;
            }
            
            // Create test data
            const mockGlobalTempo = 120;
            const mockVisualizationMode = 'circular';
            const mockTracks = [
                {
                    rhythmValue: 3,
                    soundType: 'sine',
                    frequency: 220,
                    color: { toString: () => '#ff0000' },
                    notePattern: [220, 330, 440],
                    reverbAmount: 0.5,
                    patternIndex: 0,
                    cloneCount: 1,
                    cloneSpeedVariance: 0.1
                }
            ];
            const mockNumTracksInput = { value: () => '1' };
            const mockIsPlaying = false;
            
            // Try to call the function
            try {
                const result = stateModule.debugState(
                    mockGlobalTempo,
                    mockVisualizationMode,
                    mockTracks,
                    mockNumTracksInput,
                    mockIsPlaying
                );
                
                // Verify the result
                const validResult = result && 
                                  typeof result === 'object' && 
                                  'global' in result && 
                                  'tracks' in result;
                
                this.recordTest('debugState function returns valid result', validResult,
                    validResult ? '' : 'debugState did not return expected structure');
                
                // Check if global values were captured correctly
                if (validResult) {
                    const correctGlobalTempo = result.global.tempo === mockGlobalTempo;
                    this.recordTest('debugState captures tempo correctly', correctGlobalTempo,
                        correctGlobalTempo ? '' : `Expected tempo ${mockGlobalTempo}, got ${result.global.tempo}`);
                    
                    const correctMode = result.global.visualizationMode === mockVisualizationMode;
                    this.recordTest('debugState captures visualization mode correctly', correctMode,
                        correctMode ? '' : `Expected mode ${mockVisualizationMode}, got ${result.global.visualizationMode}`);
                }
            } catch (e) {
                this.recordTest('debugState function executes without error', false, `Error: ${e.message}`);
            }
        } catch (error) {
            this.recordTest('debugState function test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 4: Test state saving functionality
    async testStateSaving() {
        try {
            // Try to import the state module
            const stateModule = await import('../state.js');
            
            // Check if saveAppState exists
            if (!('saveAppState' in stateModule)) {
                this.recordTest('saveAppState function available', false, 'saveAppState not exported from state.js');
                return;
            }
            
            // Create test data
            const mockGlobalTempo = 110;
            const mockVisualizationMode = 'pendulum';
            const mockTracks = [
                {
                    rhythmValue: 4,
                    soundType: 'sine',
                    frequency: 220,
                    color: { toString: () => '#00ff00' },
                    notePattern: [220, 330],
                    reverbAmount: 0.3,
                    patternIndex: 0
                }
            ];
            const mockNumTracksInput = { value: () => '1' };
            const mockIsPlaying = true;
            
            // Backup existing state
            const storageKey = stateModule.STORAGE_KEY;
            const originalState = localStorage.getItem(storageKey);
            
            // Try to call the function
            try {
                stateModule.saveAppState(
                    mockGlobalTempo,
                    mockVisualizationMode,
                    mockTracks,
                    mockNumTracksInput,
                    mockIsPlaying
                );
                
                // Verify state was saved
                const savedState = localStorage.getItem(storageKey);
                const stateSaved = savedState !== null;
                
                this.recordTest('saveAppState saves data to localStorage', stateSaved,
                    stateSaved ? '' : 'No data was saved to localStorage');
                
                // Check saved content
                if (stateSaved) {
                    try {
                        const parsed = JSON.parse(savedState);
                        const hasGlobal = 'global' in parsed;
                        const hasTracks = 'tracks' in parsed;
                        
                        this.recordTest('Saved state has correct structure', hasGlobal && hasTracks,
                            (hasGlobal && hasTracks) ? '' : 'Saved state missing expected structure');
                        
                        if (hasGlobal) {
                            const correctTempo = parsed.global.tempo === mockGlobalTempo;
                            this.recordTest('Saved state has correct tempo', correctTempo,
                                correctTempo ? '' : `Expected tempo ${mockGlobalTempo}, got ${parsed.global.tempo}`);
                            
                            const correctMode = parsed.global.visualizationMode === mockVisualizationMode;
                            this.recordTest('Saved state has correct visualization mode', correctMode,
                                correctMode ? '' : `Expected mode ${mockVisualizationMode}, got ${parsed.global.visualizationMode}`);
                            
                            const correctPlaying = parsed.global.isPlaying === mockIsPlaying;
                            this.recordTest('Saved state has correct playing state', correctPlaying,
                                correctPlaying ? '' : `Expected isPlaying ${mockIsPlaying}, got ${parsed.global.isPlaying}`);
                        }
                    } catch (e) {
                        this.recordTest('Saved state is valid JSON', false, `Error parsing saved state: ${e.message}`);
                    }
                }
                
                // Restore original state
                if (originalState) {
                    localStorage.setItem(storageKey, originalState);
                } else {
                    localStorage.removeItem(storageKey);
                }
            } catch (e) {
                this.recordTest('saveAppState executes without error', false, `Error: ${e.message}`);
                
                // Restore original state
                if (originalState) {
                    localStorage.setItem(storageKey, originalState);
                } else {
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (error) {
            this.recordTest('State saving test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 5: Test state loading functionality
    async testStateLoading() {
        try {
            // Try to import the state module
            const stateModule = await import('../state.js');
            
            // Check if loadAppState exists
            if (!('loadAppState' in stateModule)) {
                this.recordTest('loadAppState function available', false, 'loadAppState not exported from state.js');
                return;
            }
            
            // Backup existing state
            const storageKey = stateModule.STORAGE_KEY;
            const originalState = localStorage.getItem(storageKey);
            
            // Create test state
            const testState = {
                global: {
                    tempo: 100,
                    numTracks: 2,
                    visualizationMode: 'spiral',
                    isPlaying: false,
                    timestamp: Date.now()
                },
                tracks: [
                    {
                        rhythmValue: 5,
                        soundType: 'triangle',
                        frequency: 440,
                        color: '#0000ff',
                        notePattern: [440, 550]
                    }
                ]
            };
            
            // Save test state
            localStorage.setItem(storageKey, JSON.stringify(testState));
            
            // Create test data for loading
            const mockTracks = [];
            const mockSetupTrackControls = (tracks) => {
                // Mock implementation that just returns
                return;
            };
            const mockGlobalTempo = 60;
            const mockTempoSlider = { value: () => {} };
            const mockTempoValueSpan = { html: () => {} };
            const mockNumTracksInput = { value: () => '4' };
            const mockVisualizationMode = 'circular';
            const mockVisualizationModeSelect = { value: () => {} };
            const mockIsPlaying = false;
            const mockTogglePlayback = () => {};
            
            // Try to call the function
            try {
                const result = stateModule.loadAppState(
                    mockTracks,
                    mockSetupTrackControls,
                    mockGlobalTempo,
                    mockTempoSlider,
                    mockTempoValueSpan,
                    mockNumTracksInput,
                    mockVisualizationMode,
                    mockVisualizationModeSelect,
                    mockIsPlaying,
                    mockTogglePlayback
                );
                
                // Verify function returned something
                const returnedValue = result !== undefined;
                this.recordTest('loadAppState returns a value', returnedValue,
                    returnedValue ? '' : 'loadAppState did not return a value');
                
                // Check returned object
                if (returnedValue) {
                    const hasGlobalTempo = 'globalTempo' in result;
                    const hasVisualizationMode = 'visualizationMode' in result;
                    
                    this.recordTest('loadAppState returns correct structure', hasGlobalTempo && hasVisualizationMode,
                        (hasGlobalTempo && hasVisualizationMode) ? '' : 'loadAppState result missing expected properties');
                }
                
                // Restore original state
                if (originalState) {
                    localStorage.setItem(storageKey, originalState);
                } else {
                    localStorage.removeItem(storageKey);
                }
            } catch (e) {
                this.recordTest('loadAppState executes without error', false, `Error: ${e.message}`);
                
                // Restore original state
                if (originalState) {
                    localStorage.setItem(storageKey, originalState);
                } else {
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (error) {
            this.recordTest('State loading test', false, `Error: ${error.message}`);
        }
    }
}

// Run tests when loaded directly
if (window.isTestMode) {
    const tester = new StateTests();
    window.stateTestResults = tester.runTests();
}

// Export for module use
export default StateTests; 