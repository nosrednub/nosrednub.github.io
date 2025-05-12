// Audio Tests for the Polyrhythm Experiment
// These tests verify audio functionality

// Test suite for audio features
class AudioTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    // Test runner
    async runTests() {
        console.group('Running Polyrhythm Experiment Audio Test Suite');
        console.time('Audio tests completed in');
        
        // Run audio module tests
        await this.testAudioModuleLoaded();
        await this.testAudioContext();
        await this.testAudioResuming();
        
        // Run note pattern tests
        await this.testNotePatterns();
        
        // Run scheduler tests
        await this.testScheduler();
        
        // Test clone functionality
        await this.testCloning();
        
        // Finish and display results
        console.timeEnd('Audio tests completed in');
        console.log(`Audio tests completed: ${this.results.passed} passed, ${this.results.failed} failed`);
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
    
    // Test audio module loading
    async testAudioModuleLoaded() {
        try {
            // Attempt to import audio module
            const audioModule = await import('../audio.js');
            const hasRequiredExports = typeof audioModule.initAudio === 'function' && 
                                      typeof audioModule.audioContext !== 'undefined';
            
            this.recordTest('Audio module can be imported', true);
            this.recordTest('Audio module has required exports', hasRequiredExports,
                hasRequiredExports ? '' : 'Audio module missing expected exports');
            
            // Check if parseNotePattern function is available
            const hasParseNotePattern = typeof audioModule.parseNotePattern === 'function';
            this.recordTest('Note pattern parser available', hasParseNotePattern,
                hasParseNotePattern ? '' : 'parseNotePattern function not found');
        } catch (error) {
            this.recordTest('Audio module import', false, `Error: ${error.message}`);
        }
    }
    
    // Test audio context
    async testAudioContext() {
        try {
            // Check if audio context exists in window
            const contextExists = typeof window.audioContext !== 'undefined';
            this.recordTest('Audio context exists in window', contextExists,
                contextExists ? '' : 'audioContext not found in window');
            
            if (contextExists) {
                // Check if it's a valid AudioContext
                const isAudioContext = window.audioContext instanceof AudioContext;
                this.recordTest('Audio context is valid AudioContext instance', isAudioContext,
                    isAudioContext ? '' : 'audioContext is not an AudioContext instance');
                
                // Check state
                if (isAudioContext) {
                    const validState = ['running', 'suspended'].includes(window.audioContext.state);
                    this.recordTest('Audio context has valid state', validState,
                        validState ? '' : `Invalid audio context state: ${window.audioContext.state}`);
                    
                    // Check context properties
                    const hasExpectedProperties = 
                        typeof window.audioContext.currentTime === 'number' &&
                        typeof window.audioContext.sampleRate === 'number' &&
                        typeof window.audioContext.createOscillator === 'function';
                    
                    this.recordTest('Audio context has expected properties', hasExpectedProperties,
                        hasExpectedProperties ? '' : 'Audio context missing expected properties');
                }
            }
        } catch (error) {
            this.recordTest('Audio context test', false, `Error: ${error.message}`);
        }
    }
    
    // Test audio resuming
    async testAudioResuming() {
        try {
            // Check if resume function exists
            const resumeExists = typeof window.resumeAudioContext === 'function';
            this.recordTest('Audio resume function exists', resumeExists,
                resumeExists ? '' : 'resumeAudioContext function not found');
            
            if (resumeExists) {
                // We can't force a user interaction, so just verify the function runs without errors
                await window.resumeAudioContext();
                this.recordTest('Audio resume function executes without error', true);
                
                // Check if context is either running or suspended (can't force to running without user interaction)
                const validState = ['running', 'suspended'].includes(window.audioContext.state);
                this.recordTest('Audio context has valid state after resume attempt', validState,
                    validState ? '' : `Invalid audio context state: ${window.audioContext.state}`);
            }
        } catch (error) {
            this.recordTest('Audio resume test', false, `Error: ${error.message}`);
        }
    }
    
    // Test note pattern parsing
    async testNotePatterns() {
        try {
            // Import the parseNotePattern function
            const audioModule = await import('../audio.js');
            const parseNotePattern = audioModule.parseNotePattern;
            
            if (typeof parseNotePattern === 'function') {
                // Test numeric pattern
                const numericPattern = parseNotePattern('220,330,440', 220);
                const numericCorrect = Array.isArray(numericPattern) && 
                                       numericPattern.length === 3 &&
                                       numericPattern[0] === 220 &&
                                       numericPattern[1] === 330 &&
                                       numericPattern[2] === 440;
                
                this.recordTest('Numeric note pattern parsing', numericCorrect,
                    numericCorrect ? '' : 'Failed to parse numeric note pattern correctly');
                
                // Test note name pattern
                const notePattern = parseNotePattern('C4,E4,G4', 220);
                const noteCorrect = Array.isArray(notePattern) && notePattern.length === 3;
                
                this.recordTest('Note name pattern parsing', noteCorrect,
                    noteCorrect ? '' : 'Failed to parse note name pattern');
                
                // Test empty pattern
                const emptyPattern = parseNotePattern('', 220);
                const emptyCorrect = Array.isArray(emptyPattern) && 
                                    (emptyPattern.length === 0 || 
                                     (emptyPattern.length === 1 && emptyPattern[0] === 220));
                
                this.recordTest('Empty pattern handling', emptyCorrect,
                    emptyCorrect ? '' : 'Failed to handle empty pattern correctly');
            } else {
                this.recordTest('parseNotePattern function available', false, 'Function not found');
            }
        } catch (error) {
            this.recordTest('Note pattern test', false, `Error: ${error.message}`);
        }
    }
    
    // Test scheduler functionality
    async testScheduler() {
        try {
            // Import scheduler functions
            const schedulerModule = await import('../scheduler.js');
            const hasRequiredExports = typeof schedulerModule.startScheduler === 'function' && 
                                     typeof schedulerModule.stopScheduler === 'function' &&
                                     typeof schedulerModule.scheduleBeat === 'function';
            
            this.recordTest('Scheduler module has required exports', hasRequiredExports,
                hasRequiredExports ? '' : 'Scheduler module missing expected exports');
            
            // Check if window functions are available
            const windowSchedulerExists = typeof window.startScheduler === 'function' && 
                                        typeof window.stopScheduler === 'function';
            
            this.recordTest('Scheduler functions accessible from window', windowSchedulerExists,
                windowSchedulerExists ? '' : 'Scheduler functions not exposed on window object');
            
            // We can't fully test scheduling without actually running audio,
            // but we can check if the functions run without errors
            
            // Get current state
            const wasPlaying = window.isPlaying || false;
            
            // Test stop function first in case it was playing
            if (windowSchedulerExists) {
                window.stopScheduler();
                this.recordTest('Stop scheduler executes without error', true);
                
                // Check if we can access tracks
                if (Array.isArray(window.tracks) && window.tracks.length > 0) {
                    // Try to schedule a beat
                    const track = window.tracks[0];
                    const tempo = window.globalTempo || 60;
                    
                    try {
                        // Just test that the function executes without error
                        // We don't actually want to play sounds in the test
                        window.scheduleBeat(track, tempo, window.audioContext.currentTime);
                        this.recordTest('Schedule beat executes without error', true);
                    } catch (e) {
                        this.recordTest('Schedule beat executes without error', false, `Error: ${e.message}`);
                    }
                } else {
                    this.recordTest('Tracks available for scheduler testing', false, 'Tracks array not found or empty');
                }
            }
        } catch (error) {
            this.recordTest('Scheduler test', false, `Error: ${error.message}`);
        }
    }
    
    // Test cloning functionality
    async testCloning() {
        try {
            // Check if tracks exist
            const tracksExist = Array.isArray(window.tracks) && window.tracks.length > 0;
            
            if (tracksExist) {
                // Test track has clone properties
                const track = window.tracks[0];
                const hasCloneProps = 'cloneCount' in track && 'cloneSpeedVariance' in track;
                
                this.recordTest('Track has clone properties', hasCloneProps,
                    hasCloneProps ? '' : 'Track missing clone properties');
                
                // Test setting clone properties
                if (hasCloneProps) {
                    // Save original values
                    const originalCount = track.cloneCount;
                    const originalVariance = track.cloneSpeedVariance;
                    
                    // Set test values
                    track.cloneCount = 2;
                    track.cloneSpeedVariance = 0.2;
                    
                    // Verify values were set
                    const valuesSet = track.cloneCount === 2 && track.cloneSpeedVariance === 0.2;
                    this.recordTest('Can set clone properties', valuesSet,
                        valuesSet ? '' : 'Failed to set clone properties');
                    
                    // Restore original values
                    track.cloneCount = originalCount;
                    track.cloneSpeedVariance = originalVariance;
                }
                
                // Check if scheduler handles clones
                // We can only check if the code doesn't throw an error
                // when we have clones, not if it actually creates audio correctly
                if (hasCloneProps && typeof window.scheduleBeat === 'function') {
                    const originalCount = track.cloneCount;
                    
                    // Set test value - 1 clone
                    track.cloneCount = 1;
                    
                    try {
                        window.scheduleBeat(track, window.globalTempo || 60, window.audioContext.currentTime);
                        this.recordTest('Scheduler handles clones without error', true);
                    } catch (e) {
                        this.recordTest('Scheduler handles clones without error', false, `Error: ${e.message}`);
                    }
                    
                    // Restore original value
                    track.cloneCount = originalCount;
                }
            } else {
                this.recordTest('Tracks available for clone testing', false, 'Tracks array not found or empty');
            }
        } catch (error) {
            this.recordTest('Clone functionality test', false, `Error: ${error.message}`);
        }
    }
}

// Run tests when loaded directly
if (window.isTestMode) {
    const tester = new AudioTests();
    window.audioTestResults = tester.runTests();
}

// Export for module use
export default AudioTests; 