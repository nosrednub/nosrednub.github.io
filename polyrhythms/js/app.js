// Main application file for Polyrhythm Experiment
console.log('Loading app.js...');

// Import modules at the top level as required
import { 
    defaultTempo, 
    defaultVisualizationMode,
    defaultBackgroundColor,
    trailLength
} from './config.js';
console.log('Config module loaded successfully');

import { 
    initAudio, 
    audioContext, 
    resumeAudioContext,
    getAnalyzerData
} from './audio.js';
console.log('Audio module loaded successfully');

import { 
    drawCircularOrbits, 
    drawPendulumWave,
    drawSpiralPatterns,
    drawGravityWells,
    calculateResponsiveSizes
} from './visualizations.js';
console.log('Visualizations module loaded successfully');

import { 
    startScheduler, 
    stopScheduler,
    scheduleBeat
} from './scheduler.js';
console.log('Scheduler module loaded successfully');

import { 
    initUI, 
    setupModalControls, 
    updateTempo,
    setupGlobalEffectsControls,
    setupTrackControls,
    handleWindowResize,
    setMainCanvas,
    setupVisualizationModeSelect
} from './ui.js';
console.log('UI module loaded successfully');

import { 
    saveAppState, 
    loadAppState, 
    debugState 
} from './state.js';
console.log('State module loaded successfully');

// Import debug tools
import * as debugTools from './debug.js';
console.log('Debug tools imported');
window.debugTools = debugTools;

// Track performance metrics
let lastPerformanceCheck = 0;
let performanceCheckInterval = 2000; // Check every 2 seconds
let isMobileBrowser = false;
let isLowPerformanceDevice = false;
let framesPerSecond = 60;
let targetParticleCount = 0;
let frameTimeAccumulator = 0;
let frameCount = 0;

// Application state and app setup
try {
    // Application state
    let tracks = [];
    let isPlaying = false;
    let globalTempo = defaultTempo;
    let visualizationMode = defaultVisualizationMode;
    let isModalOpen = false;
    let backgroundColor = defaultBackgroundColor;
    
    // UI elements
    let tempoSlider, tempoValueSpan;
    let numTracksInput, updateTracksButton;
    let trackSpecificControlsDiv;
    let startStopButton;
    let visualizationModeSelect;
    let backgroundColorPicker, backgroundOpacitySlider, backgroundOpacityValue, resetBackgroundColorBtn;
    
    // Canvas reference
    let localMainCanvas = null;
    
    // Make necessary globals available to other modules
    window.globalTempo = globalTempo;
    window.visualizationMode = visualizationMode;
    window.trailLength = trailLength;
    window.backgroundColor = backgroundColor;
    window.tracks = tracks; // Make tracks available globally for the scheduler
    
    // Add debug function to window
    window.debugPolyrhythmState = () => debugState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    
    // Detect mobile and low-performance devices
    function detectDeviceCapabilities() {
        // Simple mobile detection
        isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Initialize with conservative limits for mobile
        if (isMobileBrowser) {
            isLowPerformanceDevice = true;
            console.log('Mobile device detected - enabling performance optimizations');
            return;
        }
        
        // For desktop, try to detect GPU capabilities
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                // WebGL not available - assume low performance
                isLowPerformanceDevice = true;
                console.log('WebGL not available - enabling performance optimizations');
                return;
            }
            
            // Get GPU info
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                console.log('GPU detected:', renderer);
                
                // Check for known low-performance GPUs
                const lowEndGPUs = ['Intel', 'Microsoft Basic', 'SwiftShader', 'ANGLE'];
                isLowPerformanceDevice = lowEndGPUs.some(gpu => renderer.includes(gpu));
                
                if (isLowPerformanceDevice) {
                    console.log('Low performance GPU detected - enabling performance optimizations');
                }
            }
        } catch (e) {
            console.error('Error detecting GPU capabilities:', e);
            isLowPerformanceDevice = false;
        }
    }

    // Set up function
    window.setup = function() {
        console.log('Setting up canvas...');
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) {
            console.error('Canvas container not found!');
        } else {
            console.log('Canvas container found.');
        }
        
        // Create the canvas and set it in the UI module
        const canvas = createCanvas(windowWidth, windowHeight);
        canvas.parent('canvas-container');
        localMainCanvas = setMainCanvas(canvas);  // Set the canvas in the UI module
        
        colorMode(HSB, 360, 100, 100, 100);
        ellipseMode(RADIUS);

        // Initialize audio system
        initAudio();

        // Store the initial value before setting up event handlers
        const initialVisualizationMode = visualizationMode;
        
        // Initialize UI
        const ui = initUI(this);
        tempoSlider = ui.tempoSlider;
        tempoValueSpan = ui.tempoValueSpan;
        numTracksInput = ui.numTracksInput;
        updateTracksButton = ui.updateTracksButton;
        trackSpecificControlsDiv = ui.trackSpecificControlsDiv;
        startStopButton = ui.startStopButton;
        visualizationModeSelect = ui.visualizationModeSelect;
        
        // Initialize background color UI elements
        backgroundColorPicker = select('#background-color-picker');
        backgroundOpacitySlider = select('#background-opacity');
        backgroundOpacityValue = select('#background-opacity-value');
        resetBackgroundColorBtn = select('#reset-background-color');
        
        // Initialize global effects UI elements
        const globalReverbSlider = ui.globalReverbSlider;
        const globalDelayTimeSlider = ui.globalDelayTimeSlider;
        const globalDelayFeedbackSlider = ui.globalDelayFeedbackSlider;
        const globalFilterQSlider = ui.globalFilterQSlider;
        const globalFilterCutoffSlider = ui.globalFilterCutoffSlider;
        const globalWaveformSelect = ui.globalWaveformSelect;
        
        // Set up event handlers
        tempoSlider.input(() => {
            globalTempo = updateTempo(globalTempo, tempoSlider, tempoValueSpan, tracks, numTracksInput, isPlaying);
            window.globalTempo = globalTempo;
        });
        
        numTracksInput.input(() => saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying));
        
        updateTracksButton.mousePressed(() => {
            tracks = setupTrackControls(this, null, tracks, numTracksInput, trackSpecificControlsDiv, globalTempo, visualizationMode, isPlaying);
            window.tracks = tracks; // Update global reference
        });
        
        startStopButton.mousePressed(() => {
            togglePlayback();
        });
        
        visualizationModeSelect.changed(() => {
            visualizationMode = visualizationModeSelect.value();
            window.visualizationMode = visualizationMode;
            console.log('Visualization mode changed to:', visualizationMode);
            
            // Force immediate redraw to show the new visualization mode
            redraw();
            
            // Save the state
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
        });
        
        // Set up background color controls
        if (backgroundColorPicker) {
            backgroundColorPicker.input(() => {
                const hexColor = backgroundColorPicker.value();
                // Convert hex to HSB
                const c = color(hexColor);
                backgroundColor.h = hue(c);
                backgroundColor.s = saturation(c);
                backgroundColor.b = brightness(c);
                window.backgroundColor = backgroundColor;
                
                // Save state after changing color
                saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
            });
        }
        
        if (backgroundOpacitySlider && backgroundOpacityValue) {
            backgroundOpacitySlider.input(() => {
                const opacity = parseInt(backgroundOpacitySlider.value());
                backgroundColor.a = opacity;
                window.backgroundColor = backgroundColor;
                backgroundOpacityValue.html(opacity);
                
                // Save state after changing opacity
                saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
            });
        }
        
        if (resetBackgroundColorBtn) {
            resetBackgroundColorBtn.mousePressed(() => {
                // Reset to default background color
                backgroundColor = { ...defaultBackgroundColor };
                window.backgroundColor = backgroundColor;
                
                // Update UI controls
                if (backgroundColorPicker) {
                    // Convert HSB to hex for the color picker
                    const c = color(backgroundColor.h, backgroundColor.s, backgroundColor.b);
                    const hexColor = '#' + hex(red(c), 2) + hex(green(c), 2) + hex(blue(c), 2);
                    backgroundColorPicker.value(hexColor);
                }
                
                if (backgroundOpacitySlider && backgroundOpacityValue) {
                    backgroundOpacitySlider.value(backgroundColor.a);
                    backgroundOpacityValue.html(backgroundColor.a);
                }
                
                // Save state after resetting
                saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
            });
        }
        
        // Set up modal controls
        isModalOpen = setupModalControls(this, isModalOpen, globalTempo, visualizationMode);
        
        // Load saved state first, before any other initializations
        const savedState = loadAppState(
            tracks, 
            (stateTracks) => {
                tracks = setupTrackControls(this, stateTracks, tracks, numTracksInput, trackSpecificControlsDiv, globalTempo, visualizationMode, isPlaying);
                // Update global window.tracks
                window.tracks = tracks;
            }, 
            globalTempo, 
            tempoSlider, 
            tempoValueSpan, 
            numTracksInput, 
            visualizationMode, 
            visualizationModeSelect, 
            isPlaying, 
            togglePlayback
        );
        
        globalTempo = savedState.globalTempo;
        visualizationMode = savedState.visualizationMode;
        window.globalTempo = globalTempo;
        window.visualizationMode = visualizationMode;
        
        // Only initialize with defaults if no state was loaded
        if (tracks.length === 0) {
            console.log('No tracks found in saved state, initializing defaults');
            tracks = setupTrackControls(this, null, tracks, numTracksInput, trackSpecificControlsDiv, globalTempo, visualizationMode, isPlaying);
            window.tracks = tracks; // Update global reference
        }

        // Detect device capabilities for performance optimizations
        detectDeviceCapabilities();
        
        // Set initial target particle count based on device
        targetParticleCount = isLowPerformanceDevice ? 40 : 100;

        // Set current tempo value
        tempoSlider.value(globalTempo);
        tempoValueSpan.html(globalTempo);
        
        // Set current visualization mode
        setupVisualizationModeSelect(this, visualizationModeSelect, visualizationMode, globalTempo, tracks, numTracksInput, isPlaying);
        
        // Set up global effects controls
        setupGlobalEffectsControls(this, tracks, globalTempo, visualizationMode, numTracksInput, isPlaying);
        
        // Set up background color input
        if (backgroundColorPicker && window.backgroundColor) {
            const c = color(window.backgroundColor.h, window.backgroundColor.s, window.backgroundColor.b);
            const hexColor = '#' + hex(red(c), 2) + hex(green(c), 2) + hex(blue(c), 2);
            backgroundColorPicker.value(hexColor);
        }
        
        if (backgroundOpacitySlider && backgroundOpacityValue && window.backgroundColor) {
            backgroundOpacitySlider.value(window.backgroundColor.a);
            backgroundOpacityValue.html(window.backgroundColor.a);
        }
    };

    // Toggle playback state
    function togglePlayback() {
        console.log(`togglePlayback called, current isPlaying: ${isPlaying}`);
        
        // Toggle the state
        isPlaying = !isPlaying;
        
        if (isPlaying) {
            // Starting playback
            console.log('Starting playback with tracks:', tracks.length);
            
            // Resume audio context if needed
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Make sure global references are up to date
            window.tracks = tracks;
            window.globalTempo = globalTempo;
            
            // Start the scheduler with current tempo and tracks
            startScheduler(globalTempo, tracks);
            
            // Update the UI
            startStopButton.html('Stop');
            startStopButton.addClass('playing');
        } else {
            // Stopping playback
            console.log('Stopping playback');
            
            // First stop the scheduler to prevent new sounds
            stopScheduler();
            
            // Update the UI
            startStopButton.html('Start');
            startStopButton.removeClass('playing');
            
            // Reset all visual elements for all tracks
            tracks.forEach(track => {
                console.log(`Clearing visuals for track ${track.id}`);
                
                // Clear all particle arrays
                if (track.triggerParticles) {
                    track.triggerParticles = [];
                }
                
                // Reset all animation state
                track.pulse = 0;
                track.lastX = undefined;
                track.lastY = undefined;
                track.lastPhase = undefined;
                track.lastAngle = undefined;
                
                // Clear trails
                if (track.trail) {
                    track.trail = [];
                }
            });
            
            // Force multiple redraws to ensure visuals are cleared
            redraw();
            
            // Additional redraw after a short delay to ensure UI is completely updated
            setTimeout(() => {
                console.log("Forcing additional redraw after stop");
                redraw();
            }, 50);
        }
        
        // Save current state to persist across reloads
        saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    }

    // p5.js draw function
    window.draw = function() {
        // Start frame timing for performance monitoring
        const frameStartTime = performance.now();
        
        // Use the background color from the global variable or fall back to default
        const bg = window.backgroundColor || defaultBackgroundColor;
        background(bg.h, bg.s, bg.b, bg.a);

        // Calculate canvas center for convenience
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Perform regular memory cleanup for particles
        performParticleCleanup();

        // Always use the global visualization mode directly
        // This ensures we immediately pick up any changes to the mode
        const currentMode = window.visualizationMode;
        
        // Debug visualization mode to console if it changed since last frame
        if (this._lastMode !== currentMode) {
            console.log('Drawing with visualization mode:', currentMode);
            this._lastMode = currentMode;
        }
        
        // Draw the current visualization based on mode
        switch(currentMode) {
            case 'circular':
                drawCircularOrbits(tracks);
                break;
            case 'pendulum':
                drawPendulumWave(tracks);
                break;
            case 'spiral':
                drawSpiralPatterns(tracks);
                break;
            case 'gravity':
                drawGravityWells(tracks);
                break;
            default:
                // Fallback to circular if somehow we got an invalid mode
                console.warn('Invalid visualization mode:', currentMode, 'falling back to circular');
                drawCircularOrbits(tracks);
                break;
        }
        
        // Track frame time for performance monitoring
        const frameEndTime = performance.now();
        const frameTime = frameEndTime - frameStartTime;
        
        // Accumulate frame times and update FPS periodically
        frameTimeAccumulator += frameTime;
        frameCount++;
        
        if (frameEndTime - lastPerformanceCheck > performanceCheckInterval) {
            // Calculate average frame time and FPS
            const avgFrameTime = frameTimeAccumulator / frameCount;
            framesPerSecond = 1000 / avgFrameTime;
            
            // Adjust particle count dynamically based on performance
            if (framesPerSecond < 40) {
                // Significant slowdown - reduce particle limit more aggressively
                targetParticleCount = Math.max(20, Math.floor(targetParticleCount * 0.8));
                console.log(`Performance optimization: reducing target particles to ${targetParticleCount} (${framesPerSecond.toFixed(1)} FPS)`);
            } else if (framesPerSecond < 55 && targetParticleCount > 30) {
                // Minor slowdown - reduce particles slightly
                targetParticleCount = Math.max(20, Math.floor(targetParticleCount * 0.9));
                console.log(`Performance optimization: adjusting target particles to ${targetParticleCount} (${framesPerSecond.toFixed(1)} FPS)`);
            } else if (framesPerSecond > 58 && targetParticleCount < 100) {
                // Good performance - gradually increase particle count if below max
                targetParticleCount = Math.min(100, Math.floor(targetParticleCount * 1.1));
                console.log(`Performance good: increasing target particles to ${targetParticleCount} (${framesPerSecond.toFixed(1)} FPS)`);
            }
            
            // Reset accumulators
            frameTimeAccumulator = 0;
            frameCount = 0;
            lastPerformanceCheck = frameEndTime;
        }
    };

    // Enhanced cleanup function for better performance management
    function performParticleCleanup() {
        if (!tracks || !tracks.length) return;
        
        const now = millis();
        const maxParticleAge = 3000; // 3 seconds max lifetime (reduced from 5 seconds)
        
        // Track memory usage metrics
        let totalParticleCount = 0;
        
        // Occlusion detection
        // Calculate which particles might be obscuring others
        const visibleAreaMap = {}; // Grid-based visibility tracking
        const gridSize = 20; // Size of grid cells for occlusion detection
        
        tracks.forEach(track => {
            if (track.triggerParticles && track.triggerParticles.length > 0) {
                totalParticleCount += track.triggerParticles.length;
                
                // First pass: map particles to grid cells for occlusion detection
                if (totalParticleCount > 40) { // Only do occlusion culling when we have many particles
                    track.triggerParticles.forEach(p => {
                        // Map particle to grid cell
                        const cellX = Math.floor(p.x / gridSize);
                        const cellY = Math.floor(p.y / gridSize);
                        const cellKey = `${cellX},${cellY}`;
                        
                        if (!visibleAreaMap[cellKey]) {
                            visibleAreaMap[cellKey] = [];
                        }
                        
                        // Add particle to this cell
                        visibleAreaMap[cellKey].push({
                            particle: p,
                            track: track,
                            ageRatio: 1 - (p.life / p.maxLife),
                            alpha: p.alpha || 0.8 * (1 - (1 - (p.life / p.maxLife)))
                        });
                    });
                }
                
                // Second pass: standard cleanup
                for (let i = track.triggerParticles.length - 1; i >= 0; i--) {
                    const p = track.triggerParticles[i];
                    
                    // Remove particles that are too old in absolute time (safety cleanup)
                    if (p.creationTime && (now - p.creationTime > maxParticleAge)) {
                        track.triggerParticles.splice(i, 1);
                        continue;
                    }
                    
                    // More aggressive cleanup for fully transparent particles (they're invisible anyway)
                    // Calculate transparency using the same formula as in visualization
                    const ageRatio = 1 - (p.life / p.maxLife);
                    
                    // If particle is nearly invisible (>98% transparent) or has very low life, remove it
                    if (ageRatio > 0.98 || p.life <= 1) {
                        track.triggerParticles.splice(i, 1);
                        continue;
                    }
                    
                    // Performance optimization: prioritize removal of particles that are far off-screen
                    if (track.triggerParticles.length > 40) { // Lower threshold (was 50)
                        // Calculate distance from center of screen to determine if it's far away
                        const centerX = width / 2;
                        const centerY = height / 2;
                        const distanceFromCenter = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
                        const maxAllowedDistance = Math.max(width, height) * 0.75;
                        
                        // If particle is far away from center and aging, remove it
                        if (distanceFromCenter > maxAllowedDistance && ageRatio > 0.7) {
                            track.triggerParticles.splice(i, 1);
                            continue;
                        }
                        
                        // More aggressive removal for almost-dead particles
                        if (p.life < 10 || 
                            p.x < -50 || p.x > width + 50 || 
                            p.y < -50 || p.y > height + 50) {
                            track.triggerParticles.splice(i, 1);
                            continue;
                        }
                    }
                }
                
                // Occlusion culling - remove particles that are fully obscured by others
                if (totalParticleCount > 60 && framesPerSecond < 50) {
                    // Only do expensive occlusion culling when we have performance issues
                    Object.values(visibleAreaMap).forEach(cellParticles => {
                        if (cellParticles.length > 10) { // Only process dense cells
                            // Sort by alpha and age - keep most visible particles
                            cellParticles.sort((a, b) => b.alpha - a.alpha || a.ageRatio - b.ageRatio);
                            
                            // Remove the most obscured particles (ones that are covered by others)
                            const toKeep = Math.max(5, Math.ceil(cellParticles.length * 0.6));
                            
                            // Remove particles beyond the keep count
                            for (let i = toKeep; i < cellParticles.length; i++) {
                                const item = cellParticles[i];
                                const particleIndex = item.track.triggerParticles.indexOf(item.particle);
                                if (particleIndex !== -1) {
                                    item.track.triggerParticles.splice(particleIndex, 1);
                                }
                            }
                        }
                    });
                }
                
                // Check overall memory usage per track
                if (track.triggerParticles.length > targetParticleCount * 0.7) { // Dynamic threshold based on performance
                    // Hard cap - sort by life and remove the oldest particles first
                    const removalCount = track.triggerParticles.length - Math.floor(targetParticleCount * 0.6);
                    
                    // Sort by life (ascending) so we remove oldest particles first
                    // This avoids visual popping by removing nearly-dead particles first
                    track.triggerParticles.sort((a, b) => a.life - b.life);
                    track.triggerParticles.splice(0, removalCount);
                }
            }
        });
        
        // System-wide memory management - if we have too many particles across all tracks, be more aggressive
        if (totalParticleCount > targetParticleCount * 2) { 
            // Get the most memory-efficient per-track cap based on active track count
            const activeTrackCount = tracks.filter(t => t.triggerParticles && t.triggerParticles.length > 0).length;
            const maxParticlesPerTrack = Math.floor(targetParticleCount * 1.5 / Math.max(activeTrackCount, 1));
            
            // Enforce the per-track limit
            tracks.forEach(track => {
                if (track.triggerParticles && track.triggerParticles.length > maxParticlesPerTrack) {
                    // Sort by life and remove oldest particles
                    track.triggerParticles.sort((a, b) => a.life - b.life);
                    track.triggerParticles.splice(0, track.triggerParticles.length - maxParticlesPerTrack);
                }
            });
        }
    }

    // Make the performance variables available to other modules
    window.getPerformanceInfo = function() {
        return {
            fps: framesPerSecond,
            targetParticleCount: targetParticleCount,
            isLowPerformanceDevice: isLowPerformanceDevice,
            isMobile: isMobileBrowser
        };
    };

    // Make sure to handle audioContext suspension on user interaction
    window.mousePressed = function() {
        resumeAudioContext();
    };

    // Handle window resize events
    window.windowResized = function() {
        // Use the improved handler from ui.js
        handleWindowResize(this, isModalOpen);
        console.log(`Canvas resized to ${windowWidth} x ${windowHeight}`);
        
        // Clear any existing trails when resizing to avoid visual artifacts
        if (tracks && tracks.length) {
            tracks.forEach(track => {
                if (track.trail) track.trail = [];
                if (track.triggerParticles) track.triggerParticles = [];
            });
        }
    };

    // Make the audio analyzer function available to other modules
    window.getAnalyzerData = getAnalyzerData;
} catch (error) {
    console.error('Error in application execution:', error);
} 