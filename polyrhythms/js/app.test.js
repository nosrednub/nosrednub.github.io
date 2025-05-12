// Test app.js for debugging module loading
console.log('Loading test app.js...');

// Try importing from the config.js file
try {
    import { 
        defaultTempo, 
        defaultVisualizationMode, 
        trailLength 
    } from './config.js';
    
    console.log('Config module loaded successfully!');
    console.log('Imported values:', { defaultTempo, defaultVisualizationMode, trailLength });
    
    // Try to make the values available globally for testing
    window.testConfig = {
        defaultTempo, 
        defaultVisualizationMode, 
        trailLength
    };
} catch (error) {
    console.error('Error importing from config.js:', error);
}

// Try importing from the alternate config file
try {
    import('./config.js.new')
        .then(module => {
            console.log('Alternative config module loaded dynamically!');
            console.log('Alternative config values:', {
                defaultTempo: module.defaultTempo,
                defaultVisualizationMode: module.defaultVisualizationMode,
                trailLength: module.trailLength
            });
        })
        .catch(error => {
            console.error('Error importing alternate config.js dynamically:', error);
        });
} catch (error) {
    console.error('Error setting up dynamic import:', error);
}

// Simple p5.js setup function for testing
window.setup = function() {
    console.log('p5.js setup function called');
    createCanvas(400, 400);
    background(20);
    
    // Try to display config values on canvas
    fill(255);
    textSize(16);
    textAlign(LEFT, TOP);
    text('Module Loading Test', 20, 20);
    
    if (window.testConfig) {
        text(`Tempo: ${window.testConfig.defaultTempo}`, 20, 60);
        text(`Visualization: ${window.testConfig.defaultVisualizationMode}`, 20, 90);
        text(`Trail Length: ${window.testConfig.trailLength}`, 20, 120);
    } else {
        text('Config module not loaded successfully', 20, 60);
    }
};

window.draw = function() {
    // Just a simple animation to show the canvas is working
    noStroke();
    fill(random(255), random(255), random(255), 50);
    ellipse(random(width), random(height), 20, 20);
}; 