// Visual and Animation Tests for the Polyrhythm Experiment
// These tests verify visualization functionality

// Test suite for visualizations
class VisualTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.originalVisualizationMode = null;
    }

    // Test runner
    async runTests() {
        console.group('Running Polyrhythm Experiment Visual Test Suite');
        console.time('Visual tests completed in');
        
        // Save original mode
        this.originalVisualizationMode = window.visualizationMode;
        
        // Run visualization mode tests
        await this.testCircularMode();
        await this.testPendulumMode();
        await this.testSpiralMode();
        await this.testGravityMode();
        
        // Test visualization mode switching
        await this.testModeSwitching();
        
        // Test visual responsiveness
        await this.testResponsiveSizing();
        
        // Test particle creation and cleanup
        await this.testParticleLifecycle();
        
        // Restore original mode
        window.visualizationMode = this.originalVisualizationMode;
        
        // Finish and display results
        console.timeEnd('Visual tests completed in');
        console.log(`Visual tests completed: ${this.results.passed} passed, ${this.results.failed} failed`);
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
    
    // Test circular visualization mode
    async testCircularMode() {
        try {
            // Set mode to circular
            window.visualizationMode = 'circular';
            
            // Force a redraw
            window.redraw();
            
            // Check that the select element reflects this mode
            const selectEl = document.getElementById('visualization-mode');
            const selectIsCorrect = selectEl && selectEl.value === 'circular';
            
            this.recordTest('Circular mode UI synced', selectIsCorrect, 
                selectIsCorrect ? '' : 'Visualization select element not updated to circular mode');
            
            // Check if the canvas contains content (not a completely empty canvas)
            const canvas = document.querySelector('canvas');
            // We can't check the actual rendering in a simple test,
            // but we can verify the canvas exists with size
            const canvasValid = canvas && canvas.width > 0 && canvas.height > 0;
            
            this.recordTest('Circular mode canvas valid', canvasValid, 
                canvasValid ? '' : 'Canvas not properly set up for circular mode');
        } catch (error) {
            this.recordTest('Circular mode test', false, `Error: ${error.message}`);
        }
    }
    
    // Test pendulum visualization mode
    async testPendulumMode() {
        try {
            // Set mode to pendulum
            window.visualizationMode = 'pendulum';
            
            // Force a redraw
            window.redraw();
            
            // Check that the select element reflects this mode
            const selectEl = document.getElementById('visualization-mode');
            const selectIsCorrect = selectEl && selectEl.value === 'pendulum';
            
            this.recordTest('Pendulum mode UI synced', selectIsCorrect, 
                selectIsCorrect ? '' : 'Visualization select element not updated to pendulum mode');
            
            // Check if the canvas contains content
            const canvas = document.querySelector('canvas');
            const canvasValid = canvas && canvas.width > 0 && canvas.height > 0;
            
            this.recordTest('Pendulum mode canvas valid', canvasValid, 
                canvasValid ? '' : 'Canvas not properly set up for pendulum mode');
        } catch (error) {
            this.recordTest('Pendulum mode test', false, `Error: ${error.message}`);
        }
    }
    
    // Test spiral visualization mode
    async testSpiralMode() {
        try {
            // Set mode to spiral
            window.visualizationMode = 'spiral';
            
            // Force a redraw
            window.redraw();
            
            // Check that the select element reflects this mode
            const selectEl = document.getElementById('visualization-mode');
            const selectIsCorrect = selectEl && selectEl.value === 'spiral';
            
            this.recordTest('Spiral mode UI synced', selectIsCorrect, 
                selectIsCorrect ? '' : 'Visualization select element not updated to spiral mode');
            
            // Check if the canvas contains content
            const canvas = document.querySelector('canvas');
            const canvasValid = canvas && canvas.width > 0 && canvas.height > 0;
            
            this.recordTest('Spiral mode canvas valid', canvasValid, 
                canvasValid ? '' : 'Canvas not properly set up for spiral mode');
        } catch (error) {
            this.recordTest('Spiral mode test', false, `Error: ${error.message}`);
        }
    }
    
    // Test gravity wells visualization mode
    async testGravityMode() {
        try {
            // Set mode to gravity
            window.visualizationMode = 'gravity';
            
            // Force a redraw
            window.redraw();
            
            // Check that the select element reflects this mode
            const selectEl = document.getElementById('visualization-mode');
            const selectIsCorrect = selectEl && selectEl.value === 'gravity';
            
            this.recordTest('Gravity mode UI synced', selectIsCorrect, 
                selectIsCorrect ? '' : 'Visualization select element not updated to gravity mode');
            
            // Check if the canvas contains content
            const canvas = document.querySelector('canvas');
            const canvasValid = canvas && canvas.width > 0 && canvas.height > 0;
            
            this.recordTest('Gravity mode canvas valid', canvasValid, 
                canvasValid ? '' : 'Canvas not properly set up for gravity mode');
        } catch (error) {
            this.recordTest('Gravity mode test', false, `Error: ${error.message}`);
        }
    }
    
    // Test switching between visualization modes
    async testModeSwitching() {
        try {
            // Start with circular
            window.visualizationMode = 'circular';
            window.redraw();
            
            // Verify it's set
            let modeCorrect = window.visualizationMode === 'circular';
            this.recordTest('Initial mode set to circular', modeCorrect, 
                modeCorrect ? '' : 'Failed to set initial visualization mode');
            
            // Switch to pendulum
            window.visualizationMode = 'pendulum';
            window.redraw();
            
            // Check if force update helper exists and use it
            if (typeof window.forceVisualizationUpdate === 'function') {
                window.forceVisualizationUpdate('pendulum');
            }
            
            // Wait a moment for update to apply
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Verify switch happened
            modeCorrect = window.visualizationMode === 'pendulum';
            this.recordTest('Mode switched to pendulum', modeCorrect, 
                modeCorrect ? '' : 'Failed to switch to pendulum mode');
            
            // Try setting mode using the UI select element
            const selectEl = document.getElementById('visualization-mode');
            if (selectEl) {
                // Set to spiral via the select element
                selectEl.value = 'spiral';
                
                // Dispatch a change event to trigger the handler
                const event = new Event('change');
                selectEl.dispatchEvent(event);
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Check if the global variable was updated
                modeCorrect = window.visualizationMode === 'spiral';
                this.recordTest('Mode updated from UI select element', modeCorrect,
                    modeCorrect ? '' : 'Failed to update mode from UI select element');
            } else {
                this.recordTest('Visualization select element exists', false, 'Select element not found in DOM');
            }
        } catch (error) {
            this.recordTest('Mode switching test', false, `Error: ${error.message}`);
        }
    }
    
    // Test responsive sizing
    async testResponsiveSizing() {
        try {
            // Check if responsive sizing function exists
            const responsiveSizingExists = typeof window.calculateResponsiveSizes === 'function';
            this.recordTest('Responsive sizing function exists', responsiveSizingExists,
                responsiveSizingExists ? '' : 'calculateResponsiveSizes function not found');
            
            if (responsiveSizingExists) {
                // Test with different window sizes
                const sizes = [
                    window.calculateResponsiveSizes(800, 600),  // Small
                    window.calculateResponsiveSizes(1920, 1080) // Large
                ];
                
                // Verify that sizes scale correctly - larger screen should have larger sizes
                const scalesCorrectly = sizes[1].baseSize > sizes[0].baseSize;
                this.recordTest('Responsive sizing scales correctly', scalesCorrectly,
                    scalesCorrectly ? '' : 'Responsive sizing does not scale with window size');
            }
            
            // Test window resize event
            if (typeof window.windowResized === 'function') {
                // Save original dimensions
                const originalWidth = window.innerWidth;
                const originalHeight = window.innerHeight;
                
                // Simulate window resize
                // (Note: We don't actually change window dimensions as this would affect the UI)
                window.windowResized();
                
                this.recordTest('Window resize handler executes without error', true);
            } else {
                this.recordTest('Window resize handler exists', false, 'windowResized function not found');
            }
        } catch (error) {
            this.recordTest('Responsive sizing test', false, `Error: ${error.message}`);
        }
    }
    
    // Test particle creation and lifecycle
    async testParticleLifecycle() {
        try {
            // Check if we have access to the tracks array
            const tracksExist = Array.isArray(window.tracks) && window.tracks.length > 0;
            this.recordTest('Tracks array accessible for particle testing', tracksExist,
                tracksExist ? '' : 'Tracks array not found or empty');
            
            if (tracksExist) {
                // Choose the first track for testing
                const testTrack = window.tracks[0];
                
                // Check if the track has a triggerParticles array
                const hasParticlesArray = Array.isArray(testTrack.triggerParticles);
                this.recordTest('Track has particles array', hasParticlesArray,
                    hasParticlesArray ? '' : 'triggerParticles array not found on track');
                
                if (hasParticlesArray) {
                    // Record initial particle count
                    const initialCount = testTrack.triggerParticles.length;
                    
                    // Add a test particle
                    testTrack.triggerParticles.push({
                        x: window.width / 2,
                        y: window.height / 2,
                        vx: 1,
                        vy: 1,
                        life: 100,
                        maxLife: 100,
                        size: 10,
                        creationTime: Date.now(),
                        color: testTrack.color,
                        isTest: true
                    });
                    
                    // Verify particle was added
                    const newCount = testTrack.triggerParticles.length;
                    this.recordTest('Can add particles to track', newCount === initialCount + 1,
                        newCount === initialCount + 1 ? '' : 'Failed to add test particle to track');
                    
                    // Force a redraw which should render the particle
                    window.redraw();
                    
                    // Remove the test particle
                    testTrack.triggerParticles = testTrack.triggerParticles.filter(p => !p.isTest);
                    
                    // Verify removal
                    const finalCount = testTrack.triggerParticles.length;
                    this.recordTest('Can remove particles from track', finalCount === initialCount,
                        finalCount === initialCount ? '' : 'Failed to remove test particle from track');
                }
            }
        } catch (error) {
            this.recordTest('Particle lifecycle test', false, `Error: ${error.message}`);
        }
    }
}

// Run tests when loaded directly
if (window.isTestMode) {
    const tester = new VisualTests();
    window.visualTestResults = tester.runTests();
}

// Export for module use
export default VisualTests; 