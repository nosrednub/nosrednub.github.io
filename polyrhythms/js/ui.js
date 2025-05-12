// UI controls and event handling for the Polyrhythm Experiment

import { parseNotePattern } from './audio.js';
import { saveAppState } from './state.js';

// UI Elements
let tempoSlider, tempoValueSpan;
let numTracksInput, updateTracksButton;
let trackSpecificControlsDiv;
let startStopButton;
let visualizationModeSelect;

// Global Effects Elements
let globalReverbSlider, globalDelayTimeSlider, globalDelayFeedbackSlider;
let globalFilterQSlider, globalFilterCutoffSlider, globalWaveformSelect;

// Modal Elements
let controlsModal, openModalBtn, closeModalBtn;
let tabGlobal, tabTracks, tabGlobalContent, tabTracksContent;

// Create a variable to store the main canvas reference, but initialize it in app.js
let mainCanvas = null;
function setMainCanvas(canvas) {
    mainCanvas = canvas;
    return mainCanvas;
}

// Initialize UI elements
function initUI(p5) {
    // Select all UI elements
    tempoSlider = p5.select('#tempo');
    tempoValueSpan = p5.select('#tempo-value');
    numTracksInput = p5.select('#num-tracks');
    updateTracksButton = p5.select('#update-tracks-button');
    trackSpecificControlsDiv = p5.select('#track-specific-controls');
    startStopButton = p5.select('#start-stop-button');
    visualizationModeSelect = p5.select('#visualization-mode');

    // Select global effects elements
    globalReverbSlider = p5.select('#global-reverb');
    globalDelayTimeSlider = p5.select('#global-delay-time');
    globalDelayFeedbackSlider = p5.select('#global-delay-feedback');
    globalFilterQSlider = p5.select('#global-filter-q');
    globalFilterCutoffSlider = p5.select('#global-filter-cutoff');
    globalWaveformSelect = p5.select('#global-waveform');

    // Get modal elements
    openModalBtn = document.getElementById('open-modal-btn');
    closeModalBtn = document.getElementById('close-modal-btn');
    controlsModal = document.getElementById('controls-modal');
    tabGlobal = document.getElementById('tab-global');
    tabTracks = document.getElementById('tab-tracks');
    tabGlobalContent = document.getElementById('tab-global-content');
    tabTracksContent = document.getElementById('tab-tracks-content');

    return {
        tempoSlider,
        tempoValueSpan,
        numTracksInput,
        updateTracksButton,
        trackSpecificControlsDiv,
        startStopButton,
        visualizationModeSelect,
        globalReverbSlider,
        globalDelayTimeSlider,
        globalDelayFeedbackSlider,
        globalFilterQSlider,
        globalFilterCutoffSlider,
        globalWaveformSelect
    };
}

// Set up event handlers for modal controls
function setupModalControls(p5, isModalOpen, globalTempo, visualizationMode) {
    // Modal control
    openModalBtn.onclick = () => {
        controlsModal.style.display = 'block';
        isModalOpen = true;
        
        // Keep the main canvas visible behind the modal
        if (mainCanvas && mainCanvas.canvas) {
            mainCanvas.canvas.style.zIndex = '1';
        }
    };
    
    closeModalBtn.onclick = () => {
        controlsModal.style.display = 'none';
        isModalOpen = false;
        
        // Restore main canvas z-index
        if (mainCanvas && mainCanvas.canvas) {
            mainCanvas.canvas.style.zIndex = '2';
        }
    };
    
    // When the user clicks anywhere outside the modal content, close it
    window.onclick = (event) => {
        if (event.target === controlsModal) {
            closeModalBtn.onclick();
        }
    };
    
    // Tab switching
    tabGlobal.onclick = () => {
        tabGlobal.classList.add('active');
        tabTracks.classList.remove('active');
        tabGlobalContent.style.display = '';
        tabTracksContent.style.display = 'none';
    };
    
    tabTracks.onclick = () => {
        tabTracks.classList.add('active');
        tabGlobal.classList.remove('active');
        tabTracksContent.style.display = '';
        tabGlobalContent.style.display = 'none';
    };
    
    // Start with modal closed
    controlsModal.style.display = 'none';
    
    return isModalOpen;
}

// Update tempo from UI and save state
function updateTempo(globalTempo, tempoSlider, tempoValueSpan, tracks, numTracksInput, isPlaying) {
    globalTempo = parseFloat(tempoSlider.value());
    tempoValueSpan.html(globalTempo);
    saveAppState(globalTempo, window.visualizationMode, tracks, numTracksInput, isPlaying);
    return globalTempo;
}

// Setup global effects controls and their event handlers
function setupGlobalEffectsControls(p5, tracks, globalTempo, visualizationMode, numTracksInput, isPlaying) {
    // Set up event handlers for global effects
    globalReverbSlider.input(() => {
        const value = parseFloat(globalReverbSlider.value());
        tracks.forEach(track => {
            if (!track.overrideReverb) {
                track.reverbAmount = value;
            }
        });
        saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    });
    
    globalDelayTimeSlider.input(() => {
        const value = parseFloat(globalDelayTimeSlider.value());
        tracks.forEach(track => {
            if (!track.overrideDelayTime) {
                track.delayTime = value;
            }
        });
        saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    });
    
    globalDelayFeedbackSlider.input(() => {
        const value = parseFloat(globalDelayFeedbackSlider.value());
        tracks.forEach(track => {
            if (!track.overrideDelayFeedback) {
                track.delayFeedback = value;
            }
        });
        saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    });
    
    globalFilterQSlider.input(() => {
        const value = parseFloat(globalFilterQSlider.value());
        tracks.forEach(track => {
            if (!track.overrideFilterQ) {
                track.filterQ = value;
            }
        });
        saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    });
    
    globalFilterCutoffSlider.input(() => {
        const value = parseFloat(globalFilterCutoffSlider.value());
        tracks.forEach(track => {
            if (!track.overrideFilterCutoff) {
                track.filterCutoff = value;
            }
        });
        saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    });
    
    globalWaveformSelect.changed(() => {
        const value = globalWaveformSelect.value();
        tracks.forEach(track => {
            if (!track.overrideWaveform) {
                track.waveformBlend = value;
            }
        });
        saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    });
}

// Setup track controls UI
function setupTrackControls(p5, stateTracks, tracks, numTracksInput, trackSpecificControlsDiv, globalTempo, visualizationMode, isPlaying) {
    const num = parseInt(numTracksInput.value());
    tracks = [];
    trackSpecificControlsDiv.html('');
    
    // Initialize global effects controls
    setupGlobalEffectsControls(p5, tracks, globalTempo, visualizationMode, numTracksInput, isPlaying);
    
    for (let i = 0; i < num; i++) {
        // Use stateTracks if provided, else defaults
        const t = stateTracks && stateTracks[i] ? stateTracks[i] : {};
        const trackDefaults = {
            id: i,
            rhythmValue: t.rhythmValue !== undefined ? t.rhythmValue : i + 2,
            soundType: t.soundType || 'sine',
            frequency: t.frequency !== undefined ? t.frequency : 220 + i * 55,
            color: p5.color(t.color || `hsl(${(i * 360 / num) % 360}, 80%, 60%)`),
            notePattern: t.notePattern || [],
            patternIndex: 0,
            reverbAmount: t.reverbAmount !== undefined ? t.reverbAmount : 0.5,
            delayTime: t.delayTime !== undefined ? t.delayTime : 0.15,
            delayFeedback: t.delayFeedback !== undefined ? t.delayFeedback : 0.3,
            filterQ: t.filterQ !== undefined ? t.filterQ : 1,
            filterCutoff: t.filterCutoff !== undefined ? t.filterCutoff : 2000,
            attack: t.attack !== undefined ? t.attack : 0.01,
            decay: t.decay !== undefined ? t.decay : 0.1,
            sustain: t.sustain !== undefined ? t.sustain : 0.5,
            release: t.release !== undefined ? t.release : 0.2,
            waveformBlend: t.waveformBlend || 'sine',
            pan: t.pan !== undefined ? t.pan : 0,
            detune: t.detune !== undefined ? t.detune : 0,
            overrideReverb: t.overrideReverb || false,
            overrideDelayTime: t.overrideDelayTime || false,
            overrideDelayFeedback: t.overrideDelayFeedback || false,
            overrideFilterQ: t.overrideFilterQ || false,
            overrideFilterCutoff: t.overrideFilterCutoff || false,
            overrideWaveform: t.overrideWaveform || false,
            cloneCount: t.cloneCount !== undefined ? t.cloneCount : 0,
            cloneSpeedVariance: t.cloneSpeedVariance !== undefined ? t.cloneSpeedVariance : 0.1
        };
        
        // Add track object to tracks array
        tracks.push(trackDefaults);
        
        // Create a card for this track
        const cardDiv = p5.createDiv()
            .addClass('track-card')
            .id(`track-${i}`)
            .parent(trackSpecificControlsDiv);
        
        // Track title with color dot
        const header = p5.createDiv()
            .addClass('track-header')
            .parent(cardDiv);
            
        const headerContent = p5.createDiv()
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('margin-bottom', '8px')
            .parent(header);
            
        p5.createP(`Track ${i + 1}`).style('margin', '0').parent(headerContent);
        
        const colorDot = p5.createDiv()
            .addClass('color-dot')
            .style('background', tracks[i].color.toString('#rrggbb'))
            .parent(headerContent);
        
        // Card body for controls
        const body = p5.createDiv().addClass('track-body').parent(cardDiv);
        
        // Primary control - rhythm
        p5.createP('Beats per Cycle:').parent(body);
        const rhythmInput = p5.createInput(tracks[i].rhythmValue.toString(), 'number').parent(body);
        rhythmInput.attribute('min', '1');
        rhythmInput.attribute('max', '32');
        rhythmInput.value(tracks[i].rhythmValue);
        rhythmInput.input(() => { 
            tracks[i].rhythmValue = parseInt(rhythmInput.value()) || tracks[i].rhythmValue; 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        // Clone controls section
        p5.createP('Clones').style('font-weight', 'bold').style('margin-top', '15px').parent(body);
        
        // Clone count control
        const cloneCountContainer = p5.createDiv().style('margin-bottom', '15px').parent(body);
        p5.createP('Clone Count:').style('margin', '0').parent(cloneCountContainer);
        
        const cloneCountSlider = p5.createSlider(0, 5, tracks[i].cloneCount || 0, 1).parent(cloneCountContainer);
        const cloneCountValue = p5.createSpan(tracks[i].cloneCount || 0).parent(cloneCountContainer);
        
        cloneCountSlider.input(() => { 
            const value = parseInt(cloneCountSlider.value());
            tracks[i].cloneCount = value;
            cloneCountValue.html(value);
            
            // Disable variance slider if count is 0
            cloneSpeedVarianceSlider.attribute('disabled', value === 0);
            
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
            
            console.log(`Set clone count for track ${i} to ${value}`);
        });
        
        // Clone speed variance control
        const cloneSpeedContainer = p5.createDiv().style('margin-bottom', '15px').parent(body);
        p5.createP('Clone Speed Variance:').style('margin', '0').parent(cloneSpeedContainer);
        
        const cloneSpeedVarianceSlider = p5.createSlider(0.05, 0.3, tracks[i].cloneSpeedVariance || 0.1, 0.01).parent(cloneSpeedContainer);
        const cloneSpeedVarianceValue = p5.createSpan(tracks[i].cloneSpeedVariance || 0.1).parent(cloneSpeedContainer);
        
        // Disable if no clones
        if (tracks[i].cloneCount === 0) {
            cloneSpeedVarianceSlider.attribute('disabled', true);
        }
        
        cloneSpeedVarianceSlider.input(() => { 
            const value = parseFloat(cloneSpeedVarianceSlider.value());
            tracks[i].cloneSpeedVariance = value;
            cloneSpeedVarianceValue.html(value.toFixed(2));
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
            
            console.log(`Set clone speed variance for track ${i} to ${value.toFixed(2)}`);
        });
        
        // Continue with other existing controls
        p5.createP('Sound Type:').parent(body);
        const soundTypeSelect = p5.createSelect().parent(body);
        soundTypeSelect.option('sine');
        soundTypeSelect.option('square');
        soundTypeSelect.option('sawtooth');
        soundTypeSelect.option('triangle');
        soundTypeSelect.option('noise');
        soundTypeSelect.selected(tracks[i].soundType);
        soundTypeSelect.changed(() => { 
            tracks[i].soundType = soundTypeSelect.value(); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        p5.createP('Base Frequency (Hz):').parent(body);
        const freqInput = p5.createInput(tracks[i].frequency.toFixed(0), 'number').parent(body);
        freqInput.attribute('min', '20');
        freqInput.attribute('max', '2000');
        freqInput.value(tracks[i].frequency);
        freqInput.input(() => { 
            tracks[i].frequency = parseFloat(freqInput.value()) || 220; 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        p5.createP('Color:').parent(body);
        const colorInput = p5.createInput(tracks[i].color.toString('#rrggbb'), 'color').parent(body);
        colorInput.value(tracks[i].color.toString('#rrggbb'));
        colorInput.input(() => { 
            tracks[i].color = p5.color(colorInput.value()); 
            colorDot.style('background', colorInput.value()); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        p5.createP('Note Pattern (comma-separated, e.g. 220,330,440 or C4,E4,G4):').parent(body);
        const patternInput = p5.createInput((tracks[i].notePattern || [tracks[i].frequency]).join(','), 'text').parent(body);
        patternInput.input(() => { 
            const val = patternInput.value(); 
            tracks[i].notePattern = parseNotePattern(val, tracks[i].frequency); 
            tracks[i].patternIndex = 0; 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        // Effects section with override toggles
        p5.createP('Effects').style('font-weight', 'bold').style('margin-top', '15px').parent(body);
        
        // Reverb with override toggle
        const reverbContainer = p5.createDiv().style('margin-bottom', '15px').parent(body);
        const reverbHeader = p5.createDiv().style('display', 'flex').style('justify-content', 'space-between').style('align-items', 'center').parent(reverbContainer);
        p5.createP('Reverb Amount:').style('margin', '0').parent(reverbHeader);
        const reverbOverrideBtn = p5.createButton('Override').addClass('override-toggle').parent(reverbHeader);
        if (tracks[i].overrideReverb) reverbOverrideBtn.addClass('active');
        
        const reverbSlider = p5.createSlider(0, 1, tracks[i].reverbAmount, 0.01).parent(reverbContainer);
        reverbSlider.attribute('disabled', !tracks[i].overrideReverb);
        reverbSlider.value(tracks[i].reverbAmount);
        reverbSlider.input(() => { 
            tracks[i].reverbAmount = parseFloat(reverbSlider.value()); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        reverbOverrideBtn.mousePressed(() => {
            tracks[i].overrideReverb = !tracks[i].overrideReverb;
            reverbOverrideBtn.toggleClass('active');
            reverbSlider.attribute('disabled', !tracks[i].overrideReverb);
            
            // If turning off override, revert to global value
            if (!tracks[i].overrideReverb) {
                tracks[i].reverbAmount = parseFloat(globalReverbSlider.value());
                reverbSlider.value(tracks[i].reverbAmount);
            }
            
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
        });
        
        // Delay Time with override toggle
        const delayTimeContainer = p5.createDiv().style('margin-bottom', '15px').parent(body);
        const delayTimeHeader = p5.createDiv().style('display', 'flex').style('justify-content', 'space-between').style('align-items', 'center').parent(delayTimeContainer);
        p5.createP('Delay Time (s):').style('margin', '0').parent(delayTimeHeader);
        const delayTimeOverrideBtn = p5.createButton('Override').addClass('override-toggle').parent(delayTimeHeader);
        if (tracks[i].overrideDelayTime) delayTimeOverrideBtn.addClass('active');
        
        const delaySlider = p5.createSlider(0, 0.5, tracks[i].delayTime, 0.01).parent(delayTimeContainer);
        delaySlider.attribute('disabled', !tracks[i].overrideDelayTime);
        delaySlider.value(tracks[i].delayTime);
        delaySlider.input(() => { 
            tracks[i].delayTime = parseFloat(delaySlider.value()); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        delayTimeOverrideBtn.mousePressed(() => {
            tracks[i].overrideDelayTime = !tracks[i].overrideDelayTime;
            delayTimeOverrideBtn.toggleClass('active');
            delaySlider.attribute('disabled', !tracks[i].overrideDelayTime);
            
            if (!tracks[i].overrideDelayTime) {
                tracks[i].delayTime = parseFloat(globalDelayTimeSlider.value());
                delaySlider.value(tracks[i].delayTime);
            }
            
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
        });
        
        // Delay Feedback with override toggle
        const feedbackContainer = p5.createDiv().style('margin-bottom', '15px').parent(body);
        const feedbackHeader = p5.createDiv().style('display', 'flex').style('justify-content', 'space-between').style('align-items', 'center').parent(feedbackContainer);
        p5.createP('Delay Feedback:').style('margin', '0').parent(feedbackHeader);
        const feedbackOverrideBtn = p5.createButton('Override').addClass('override-toggle').parent(feedbackHeader);
        if (tracks[i].overrideDelayFeedback) feedbackOverrideBtn.addClass('active');
        
        const feedbackSlider = p5.createSlider(0, 0.9, tracks[i].delayFeedback, 0.01).parent(feedbackContainer);
        feedbackSlider.attribute('disabled', !tracks[i].overrideDelayFeedback);
        feedbackSlider.value(tracks[i].delayFeedback);
        feedbackSlider.input(() => { 
            tracks[i].delayFeedback = parseFloat(feedbackSlider.value()); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        feedbackOverrideBtn.mousePressed(() => {
            tracks[i].overrideDelayFeedback = !tracks[i].overrideDelayFeedback;
            feedbackOverrideBtn.toggleClass('active');
            feedbackSlider.attribute('disabled', !tracks[i].overrideDelayFeedback);
            
            if (!tracks[i].overrideDelayFeedback) {
                tracks[i].delayFeedback = parseFloat(globalDelayFeedbackSlider.value());
                feedbackSlider.value(tracks[i].delayFeedback);
            }
            
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
        });
        
        // Filter Q with override toggle
        const qContainer = p5.createDiv().style('margin-bottom', '15px').parent(body);
        const qHeader = p5.createDiv().style('display', 'flex').style('justify-content', 'space-between').style('align-items', 'center').parent(qContainer);
        p5.createP('Filter Resonance (Q):').style('margin', '0').parent(qHeader);
        const qOverrideBtn = p5.createButton('Override').addClass('override-toggle').parent(qHeader);
        if (tracks[i].overrideFilterQ) qOverrideBtn.addClass('active');
        
        const qSlider = p5.createSlider(0.1, 20, tracks[i].filterQ, 0.1).parent(qContainer);
        qSlider.attribute('disabled', !tracks[i].overrideFilterQ);
        qSlider.value(tracks[i].filterQ);
        qSlider.input(() => { 
            tracks[i].filterQ = parseFloat(qSlider.value()); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        qOverrideBtn.mousePressed(() => {
            tracks[i].overrideFilterQ = !tracks[i].overrideFilterQ;
            qOverrideBtn.toggleClass('active');
            qSlider.attribute('disabled', !tracks[i].overrideFilterQ);
            
            if (!tracks[i].overrideFilterQ) {
                tracks[i].filterQ = parseFloat(globalFilterQSlider.value());
                qSlider.value(tracks[i].filterQ);
            }
            
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
        });
        
        // Filter Cutoff with override toggle
        const cutoffContainer = p5.createDiv().style('margin-bottom', '15px').parent(body);
        const cutoffHeader = p5.createDiv().style('display', 'flex').style('justify-content', 'space-between').style('align-items', 'center').parent(cutoffContainer);
        p5.createP('Filter Cutoff (Hz):').style('margin', '0').parent(cutoffHeader);
        const cutoffOverrideBtn = p5.createButton('Override').addClass('override-toggle').parent(cutoffHeader);
        if (tracks[i].overrideFilterCutoff) cutoffOverrideBtn.addClass('active');
        
        const cutoffSlider = p5.createSlider(100, 5000, tracks[i].filterCutoff, 1).parent(cutoffContainer);
        cutoffSlider.attribute('disabled', !tracks[i].overrideFilterCutoff);
        cutoffSlider.value(tracks[i].filterCutoff);
        cutoffSlider.input(() => { 
            tracks[i].filterCutoff = parseFloat(cutoffSlider.value()); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        cutoffOverrideBtn.mousePressed(() => {
            tracks[i].overrideFilterCutoff = !tracks[i].overrideFilterCutoff;
            cutoffOverrideBtn.toggleClass('active');
            cutoffSlider.attribute('disabled', !tracks[i].overrideFilterCutoff);
            
            if (!tracks[i].overrideFilterCutoff) {
                tracks[i].filterCutoff = parseFloat(globalFilterCutoffSlider.value());
                cutoffSlider.value(tracks[i].filterCutoff);
            }
            
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
        });
        
        // Waveform with override toggle
        const waveformContainer = p5.createDiv().style('margin-bottom', '15px').parent(body);
        const waveformHeader = p5.createDiv().style('display', 'flex').style('justify-content', 'space-between').style('align-items', 'center').parent(waveformContainer);
        p5.createP('Waveform:').style('margin', '0').parent(waveformHeader);
        const waveformOverrideBtn = p5.createButton('Override').addClass('override-toggle').parent(waveformHeader);
        if (tracks[i].overrideWaveform) waveformOverrideBtn.addClass('active');
        
        const blendSelect = p5.createSelect().parent(waveformContainer);
        blendSelect.option('sine');
        blendSelect.option('square');
        blendSelect.option('triangle');
        blendSelect.option('sawtooth');
        blendSelect.option('mix');
        blendSelect.selected(tracks[i].waveformBlend);
        blendSelect.attribute('disabled', !tracks[i].overrideWaveform);
        blendSelect.changed(() => { 
            tracks[i].waveformBlend = blendSelect.value(); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
        
        waveformOverrideBtn.mousePressed(() => {
            tracks[i].overrideWaveform = !tracks[i].overrideWaveform;
            waveformOverrideBtn.toggleClass('active');
            blendSelect.attribute('disabled', !tracks[i].overrideWaveform);
            
            if (!tracks[i].overrideWaveform) {
                tracks[i].waveformBlend = globalWaveformSelect.value();
                blendSelect.selected(tracks[i].waveformBlend);
            }
            
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
        });
        
        // Other controls
        p5.createP('Other Settings').style('font-weight', 'bold').style('margin-top', '15px').parent(body);
        
        p5.createP('Stereo Pan:').parent(body);
        const panSlider = p5.createSlider(-1, 1, tracks[i].pan, 0.01).parent(body);
        panSlider.value(tracks[i].pan);
        panSlider.input(() => { 
            tracks[i].pan = parseFloat(panSlider.value()); 
            saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying); 
        });
    }
    
    // Make sure to save state after setting up tracks
    saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
    
    return tracks;
}

// Handle window resize
function handleWindowResize(p5, isModalOpen) {
    // Always resize canvas, even when modal is open
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    
    // No need to update preview canvas since we removed it
}

// Create visualization mode select options
function setupVisualizationModeSelect(p5, visualizationModeSelect, visualizationMode, globalTempo, tracks, numTracksInput, isPlaying) {
    // Clear existing options
    visualizationModeSelect.html('');
    
    // Add options
    visualizationModeSelect.option('circular', 'circular');
    visualizationModeSelect.option('pendulum', 'pendulum');
    visualizationModeSelect.option('spiral', 'spiral');
    visualizationModeSelect.option('gravity', 'gravity');
    
    // Set current value
    visualizationModeSelect.selected(visualizationMode);
    
    // Add event handler
    visualizationModeSelect.changed(() => {
        // Get the new visualization mode
        const newMode = visualizationModeSelect.value();
        
        // Update global immediately
        visualizationMode = newMode;
        window.visualizationMode = newMode;
        
        console.log('Visualization mode changed to:', newMode);
        
        // Immediately clear any existing particles to avoid visual artifacts
        if (tracks && tracks.length) {
            tracks.forEach(track => {
                if (track.triggerParticles) track.triggerParticles = [];
                if (track.trail) track.trail = [];
            });
        }
        
        // Force visualization update using our helper function
        if (window.forceVisualizationUpdate) {
            window.forceVisualizationUpdate(newMode);
        }
        
        // Force immediate redraw several times to ensure it takes effect
        setTimeout(() => {
            p5.redraw();
            // Force another redraw after a brief delay to ensure visualization changes
            setTimeout(() => p5.redraw(), 50);
            // And one more for good measure
            setTimeout(() => p5.redraw(), 100);
        }, 0);
        
        // Save state
        saveAppState(globalTempo, visualizationMode, tracks, numTracksInput, isPlaying);
        return visualizationMode;
    });
    
    return visualizationMode;
}

export {
    initUI,
    setupModalControls,
    updateTempo,
    setupTrackControls,
    setupGlobalEffectsControls,
    handleWindowResize,
    mainCanvas,
    setMainCanvas,
    setupVisualizationModeSelect
}; 