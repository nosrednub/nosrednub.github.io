// Application Tests for the Polyrhythm Experiment
// These tests validate core application functionality

import { STORAGE_KEY } from '../config.js';

// Test suite for the Polyrhythm Experiment
class AppTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    // Test runner
    async runTests() {
        console.group('Running Polyrhythm Experiment Test Suite');
        console.time('Tests completed in');
        
        // Basic setup tests
        await this.testModulesLoaded();
        await this.testGlobalVariables();
        await this.testCanvasSetup();
        
        // State management tests
        await this.testStateStorage();
        await this.testStateLoading();
        
        // Audio tests
        await this.testAudioContext();
        
        // UI tests
        await this.testUIControls();
        
        // Finish and display results
        console.timeEnd('Tests completed in');
        console.log(`Tests completed: ${this.results.passed} passed, ${this.results.failed} failed`);
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
    
    // Test 1: Ensure all modules are loaded
    async testModulesLoaded() {
        try {
            // Check key modules
            const configExists = typeof defaultTempo !== 'undefined' && 
                                 typeof defaultVisualizationMode !== 'undefined';
            this.recordTest('Config module loaded', configExists, configExists ? '' : 'Default configuration values not found');
            
            const audioExists = typeof window.audioContext !== 'undefined';
            this.recordTest('Audio module loaded', audioExists, audioExists ? '' : 'Audio context not initialized');
            
            const schedulerExists = typeof window.startScheduler === 'function' && 
                                   typeof window.stopScheduler === 'function';
            this.recordTest('Scheduler module loaded', schedulerExists, schedulerExists ? '' : 'Scheduler functions not found');
            
            const visualizationsExist = typeof window.drawCircularOrbits === 'function';
            this.recordTest('Visualizations module loaded', visualizationsExist, visualizationsExist ? '' : 'Visualization functions not found');
            
            // Import debug tools explicitly to test dynamic imports
            const debugModule = await import('../debug.js');
            const debugExists = typeof debugModule.testModuleLoading === 'function';
            this.recordTest('Debug module can be imported', debugExists, debugExists ? '' : 'Debug module cannot be imported');
        } catch (error) {
            this.recordTest('Modules loaded test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 2: Check global variables existence
    async testGlobalVariables() {
        try {
            // Check essential global variables
            const tempoExists = typeof window.globalTempo !== 'undefined';
            this.recordTest('Global tempo variable exists', tempoExists, tempoExists ? '' : 'Global tempo not found');
            
            const visualizationModeExists = typeof window.visualizationMode !== 'undefined';
            this.recordTest('Visualization mode variable exists', visualizationModeExists, 
                visualizationModeExists ? '' : 'Visualization mode not found');
            
            const tracksExists = Array.isArray(window.tracks);
            this.recordTest('Tracks array exists', tracksExists, tracksExists ? '' : 'Tracks array not found or not an array');
        } catch (error) {
            this.recordTest('Global variables test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 3: Validate canvas setup
    async testCanvasSetup() {
        try {
            // Check if p5 canvas exists
            const canvasExists = document.querySelector('canvas') !== null;
            this.recordTest('Canvas exists in DOM', canvasExists, canvasExists ? '' : 'Canvas element not found in DOM');
            
            if (canvasExists) {
                const canvas = document.querySelector('canvas');
                const hasCorrectSize = canvas.width > 0 && canvas.height > 0;
                this.recordTest('Canvas has valid dimensions', hasCorrectSize, 
                    hasCorrectSize ? '' : `Invalid canvas size: ${canvas.width}x${canvas.height}`);
            }
        } catch (error) {
            this.recordTest('Canvas setup test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 4: Test state storage
    async testStateStorage() {
        try {
            // Check if state can be saved to localStorage
            const initialState = localStorage.getItem(STORAGE_KEY);
            
            // Create a test state
            const testState = {
                global: {
                    tempo: 120,
                    numTracks: 4,
                    visualizationMode: 'circular',
                    isPlaying: false,
                    timestamp: Date.now()
                },
                tracks: []
            };
            
            // Save it
            localStorage.setItem(STORAGE_KEY, JSON.stringify(testState));
            
            // Verify it was saved correctly
            const savedState = localStorage.getItem(STORAGE_KEY);
            const parsed = JSON.parse(savedState);
            
            const stateCorrect = parsed && 
                                 parsed.global && 
                                 parsed.global.tempo === 120 && 
                                 parsed.global.visualizationMode === 'circular';
            
            this.recordTest('State can be saved to localStorage', stateCorrect, 
                stateCorrect ? '' : 'State was not saved correctly to localStorage');
            
            // Restore the original state if there was one
            if (initialState) {
                localStorage.setItem(STORAGE_KEY, initialState);
            }
        } catch (error) {
            this.recordTest('State storage test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 5: Test state loading
    async testStateLoading() {
        try {
            // Set a known state in localStorage
            const testState = {
                global: {
                    tempo: 130,
                    numTracks: 3,
                    visualizationMode: 'pendulum',
                    isPlaying: false,
                    timestamp: Date.now()
                },
                tracks: []
            };
            
            // Backup the current state
            const initialState = localStorage.getItem(STORAGE_KEY);
            
            // Save our test state
            localStorage.setItem(STORAGE_KEY, JSON.stringify(testState));
            
            // Check if we have the debugState function
            const canDebugState = typeof window.debugPolyrhythmState === 'function';
            this.recordTest('Debug state function exists', canDebugState, 
                canDebugState ? '' : 'debugPolyrhythmState function not found on window');
            
            // Restore the original state if there was one
            if (initialState) {
                localStorage.setItem(STORAGE_KEY, initialState);
            }
        } catch (error) {
            this.recordTest('State loading test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 6: Test audio context
    async testAudioContext() {
        try {
            // Verify audio context exists
            const contextExists = window.audioContext instanceof AudioContext;
            this.recordTest('Audio context exists', contextExists, 
                contextExists ? '' : 'AudioContext not found or not initialized');
            
            if (contextExists) {
                // Since we can't automate user interaction, just check it's in a valid state
                const validState = ['running', 'suspended'].includes(window.audioContext.state);
                this.recordTest('Audio context in valid state', validState, 
                    validState ? '' : `Invalid audio context state: ${window.audioContext.state}`);
            }
        } catch (error) {
            this.recordTest('Audio context test', false, `Error: ${error.message}`);
        }
    }
    
    // Test 7: Test UI controls
    async testUIControls() {
        try {
            // Check if essential UI controls exist
            const startButtonExists = document.getElementById('start-stop-button') !== null;
            this.recordTest('Start/Stop button exists', startButtonExists, 
                startButtonExists ? '' : 'Start/Stop button not found');
            
            const tempoSliderExists = document.getElementById('tempo') !== null;
            this.recordTest('Tempo slider exists', tempoSliderExists, 
                tempoSliderExists ? '' : 'Tempo slider not found');
            
            const trackControlsExist = document.getElementById('track-specific-controls') !== null;
            this.recordTest('Track controls container exists', trackControlsExist, 
                trackControlsExist ? '' : 'Track controls container not found');
            
            const visualizationSelectExists = document.getElementById('visualization-mode') !== null;
            this.recordTest('Visualization mode select exists', visualizationSelectExists, 
                visualizationSelectExists ? '' : 'Visualization mode select not found');
        } catch (error) {
            this.recordTest('UI controls test', false, `Error: ${error.message}`);
        }
    }
}

// Run tests when loaded directly
if (window.isTestMode) {
    const tester = new AppTests();
    window.testResults = tester.runTests();
}

// Export for module use
export default AppTests; 