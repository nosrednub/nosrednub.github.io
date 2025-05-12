// State management for the Polyrhythm Experiment

import { STORAGE_KEY } from './config.js';

// Get the complete application state
function getAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying) {
    return {
        global: {
            tempo: globalTempo,
            numTracks: parseInt(numTracksInput.value()),
            visualizationMode: visualizationMode,
            isPlaying: isPlaying,
            backgroundColor: window.backgroundColor || { h: 20, s: 80, b: 10, a: 100 },
            timestamp: Date.now() // Add timestamp for debugging
        },
        tracks: tracks.map(track => ({
            rhythmValue: track.rhythmValue,
            soundType: track.soundType,
            frequency: track.frequency,
            color: track.color.toString('#rrggbb'),
            notePattern: track.notePattern,
            attack: track.attack,
            decay: track.decay,
            sustain: track.sustain,
            release: track.release,
            detune: track.detune,
            filterCutoff: track.filterCutoff,
            reverbAmount: track.reverbAmount,
            delayTime: track.delayTime,
            delayFeedback: track.delayFeedback,
            filterQ: track.filterQ,
            waveformBlend: track.waveformBlend,
            pan: track.pan,
            patternIndex: track.patternIndex || 0,
            
            // Clone settings
            cloneCount: track.cloneCount || 0,
            cloneSpeedVariance: track.cloneSpeedVariance || 0.1,
            
            // Store override flags
            overrideReverb: track.overrideReverb || false,
            overrideDelayTime: track.overrideDelayTime || false,
            overrideDelayFeedback: track.overrideDelayFeedback || false,
            overrideFilterQ: track.overrideFilterQ || false,
            overrideFilterCutoff: track.overrideFilterCutoff || false,
            overrideWaveform: track.overrideWaveform || false
        }))
    };
}

// Set the application state from a saved state
function setAppState(state, tracks, setupTrackControls, globalTempo, tempoSlider, tempoValueSpan, numTracksInput, visualizationMode, visualizationModeSelect) {
    if (!state) return;
    if (state.global) {
        globalTempo = state.global.tempo;
        tempoSlider.value(state.global.tempo);
        tempoValueSpan.html(state.global.tempo);
        
        numTracksInput.value(state.global.numTracks);
        
        // Make sure visualization mode is properly set
        visualizationMode = state.global.visualizationMode;
        visualizationModeSelect.value(state.global.visualizationMode);
        console.log('Setting visualization mode to:', state.global.visualizationMode);
        
        // Set background color if it exists in state
        if (state.global.backgroundColor) {
            window.backgroundColor = state.global.backgroundColor;
            
            // Update the color picker and opacity slider if they exist
            const bgColorPicker = document.getElementById('background-color-picker');
            const bgOpacitySlider = document.getElementById('background-opacity');
            const bgOpacityValue = document.getElementById('background-opacity-value');
            
            if (bgColorPicker) {
                // Convert HSB to hex for the color picker
                const { h, s, b } = window.backgroundColor;
                // We need to convert HSB to RGB, then to hex
                colorMode(HSB, 360, 100, 100); // Ensure we're in HSB mode
                const c = color(h, s, b);
                const hexColor = '#' + hex(red(c), 2) + hex(green(c), 2) + hex(blue(c), 2);
                bgColorPicker.value = hexColor;
            }
            
            if (bgOpacitySlider && bgOpacityValue) {
                bgOpacitySlider.value = window.backgroundColor.a;
                bgOpacityValue.innerHTML = window.backgroundColor.a;
            }
        }
        
        // Don't change isPlaying here - it's handled in loadAppState
    }
    if (state.tracks && state.tracks.length) {
        setupTrackControls(state.tracks);
        for (let i = 0; i < state.tracks.length && i < tracks.length; i++) {
            const t = state.tracks[i];
            Object.assign(tracks[i], t);
            tracks[i].color = color(t.color);
            
            // Make sure we have a trail array
            if (!tracks[i].trail) {
                tracks[i].trail = [];
            }
        }
    }
    
    return { 
        globalTempo, 
        visualizationMode 
    };
}

// Save application state to localStorage
function saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying) {
    if (!globalTempo || !tracks || !numTracksInput) {
        console.error("Cannot save application state - missing required parameters");
        return;
    }
    
    try {
        const appState = {
            global: {
                tempo: parseFloat(globalTempo) || 60,
                numTracks: parseInt(numTracksInput.value()) || 4,
                visualizationMode: visualizationMode || 'circular',
                isPlaying: Boolean(isPlaying),
                backgroundColor: window.backgroundColor || { h: 20, s: 80, b: 10, a: 100 },
                timestamp: Date.now() // Add timestamp for debugging
            },
            tracks: tracks.map(track => getTrackState(track))
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        console.log(`App state saved successfully at ${new Date().toISOString()}`);
    } catch (error) {
        console.error("Error saving application state:", error);
    }
}

// Load application state from localStorage
function loadAppState(tracks, setupTrackControls, globalTempo, tempoSlider, tempoValueSpan, numTracksInput, visualizationMode, visualizationModeSelect, isPlaying, togglePlayback) {
    try {
        console.log('Loading state...');
        const state = localStorage.getItem(STORAGE_KEY);
        if (state) {
            console.log('State found in localStorage');
            const parsedState = JSON.parse(state);
            const updatedState = setAppState(
                parsedState, 
                tracks, 
                setupTrackControls, 
                globalTempo, 
                tempoSlider, 
                tempoValueSpan, 
                numTracksInput, 
                visualizationMode, 
                visualizationModeSelect
            );
            
            // Update global variables from setAppState result
            globalTempo = updatedState.globalTempo;
            visualizationMode = updatedState.visualizationMode;
            
            // Update UI based on loaded state
            tempoValueSpan.html(globalTempo);
            console.log('Set tempo to', globalTempo);
            
            // Update play/pause state
            if (parsedState.global && parsedState.global.isPlaying) {
                console.log('Restoring playing state to:', parsedState.global.isPlaying);
                if (!isPlaying) {
                    togglePlayback(); // Start playback if it was playing before
                }
            } else {
                if (isPlaying) {
                    togglePlayback(); // Stop playback if it was stopped before
                }
            }
            console.log('State loaded successfully');
        } else {
            console.log('No saved state found');
        }
    } catch (error) {
        console.error("Error loading app state:", error);
        // In case of error, initialize with defaults
        // without erasing existing localStorage
    }
    
    return { globalTempo, visualizationMode };
}

// Get track state representation for storage
function getTrackState(track) {
    // Check if color is a p5.Color object
    const colorStr = typeof track.color.toString === 'function' ? 
        track.color.toString('#rrggbb') : track.color;
    
    // Ensure all values are the correct types
    const rhythmValue = parseInt(track.rhythmValue) || 2;
    const frequency = parseFloat(track.frequency) || 220;
    const cloneCount = parseInt(track.cloneCount) || 0;
    const cloneSpeedVariance = parseFloat(track.cloneSpeedVariance) || 0.1;
    
    return {
        rhythmValue: rhythmValue,
        soundType: track.soundType || 'sine',
        frequency: frequency,
        color: colorStr,
        notePattern: Array.isArray(track.notePattern) ? track.notePattern : [],
        reverbAmount: parseFloat(track.reverbAmount) || 0.5,
        delayTime: parseFloat(track.delayTime) || 0.15,
        delayFeedback: parseFloat(track.delayFeedback) || 0.3,
        filterQ: parseFloat(track.filterQ) || 1,
        filterCutoff: parseFloat(track.filterCutoff) || 2000,
        attack: parseFloat(track.attack) || 0.01,
        decay: parseFloat(track.decay) || 0.1,
        sustain: parseFloat(track.sustain) || 0.5,
        release: parseFloat(track.release) || 0.2,
        waveformBlend: track.waveformBlend || 'sine',
        pan: parseFloat(track.pan) || 0,
        detune: parseFloat(track.detune) || 0,
        overrideReverb: Boolean(track.overrideReverb),
        overrideDelayTime: Boolean(track.overrideDelayTime),
        overrideDelayFeedback: Boolean(track.overrideDelayFeedback),
        overrideFilterQ: Boolean(track.overrideFilterQ),
        overrideFilterCutoff: Boolean(track.overrideFilterCutoff),
        overrideWaveform: Boolean(track.overrideWaveform),
        cloneCount: cloneCount,
        cloneSpeedVariance: cloneSpeedVariance
    };
}

// Debug utility function for application state
function debugState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying) {
    const current = getAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    const saved = localStorage.getItem(STORAGE_KEY);
    
    console.group('Polyrhythm State Debug');
    console.log('Current State:', current);
    
    try {
        const parsedSaved = saved ? JSON.parse(saved) : null;
        console.log('Saved State:', parsedSaved);
        
        if (parsedSaved) {
            // Compare key aspects
            console.log('States match?', 
                current.global.tempo === parsedSaved.global.tempo &&
                current.global.numTracks === parsedSaved.global.numTracks &&
                current.global.visualizationMode === parsedSaved.global.visualizationMode &&
                current.global.isPlaying === parsedSaved.global.isPlaying &&
                current.tracks.length === parsedSaved.tracks.length
            );
        }
    } catch (e) {
        console.error('Error parsing saved state:', e);
        console.log('Raw saved state:', saved);
    }
    
    console.log('localStorage size:', 
        new Blob([JSON.stringify(localStorage)]).size / 1024, 'KB');
    console.groupEnd();
    
    return current;
}

export {
    getAppState,
    loadAppState,
    saveAppState,
    getTrackState,
    debugState,
    STORAGE_KEY
};