let audioContext;
let masterGain;
let tracks = [];
let isPlaying = false;
let globalTempo = 60; // BPM
let currentBeat = 0; // A continuous counter for scheduling
let lookahead = 25.0; // How frequently to call scheduling function (in ms)
let scheduleAheadTime = 0.1; // How far ahead to schedule audio (in s)
let nextNoteTime = 0.0; // When the next note is due
let timerID;

// Add a simple reverb using a ConvolverNode (optional, fallback to masterGain if not supported)
let reverbNode;

const p5CanvasWidth = 400;
const p5CanvasHeight = 600;
const playheadYRatio = 0.8; // Where the "hit" line is
const emitterYRatio = 0.1; // Where particles originate
const particleBaseSize = 10;
const particleTravelTime = 4000; // ms for particle to travel from emitter to playhead (adjust with tempo)

// UI Elements
let tempoSlider, tempoValueSpan;
let numTracksInput, updateTracksButton;
let trackSpecificControlsDiv;
let startStopButton;

// --- Visualization Parameters for Circular Orbits ---
const centerX = p5CanvasWidth / 2;
const centerY = p5CanvasHeight / 2;
const minOrbitRadius = 60;
const orbitGap = 40;
const anchorRadius = 10;
const pulseMax = 1.5; // How much the circle grows on pulse

// For smooth animation and trails
const trailLength = 40; // Number of positions to keep for trails

// Particle burst at trigger point
const maxParticles = 12;
const particleLife = 30; // frames

let visualizationMode = 'circular';
let visualizationModeSelect;

let isModalOpen = false;
let mainCanvas;

function setup() {
    console.log('Setting up canvas...');
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
        console.error('Canvas container not found!');
    } else {
        console.log('Canvas container found.');
    }
    mainCanvas = createCanvas(windowWidth, windowHeight);
    mainCanvas.parent('canvas-container');
    colorMode(HSB, 360, 100, 100, 100);
    ellipseMode(RADIUS);

    // Initialize Web Audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.7, audioContext.currentTime); // Master volume
    masterGain.connect(audioContext.destination);

    // Setup reverb
    try {
        reverbNode = audioContext.createConvolver();
        // Simple impulse response for a subtle reverb
        const irBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 0.2, audioContext.sampleRate);
        for (let c = 0; c < 2; c++) {
            const channel = irBuffer.getChannelData(c);
            for (let i = 0; i < irBuffer.length; i++) {
                channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irBuffer.length, 2);
            }
        }
        reverbNode.buffer = irBuffer;
        reverbNode.connect(masterGain);
    } catch (e) {
        reverbNode = null;
    }

    // Setup UI
    tempoSlider = select('#tempo');
    tempoValueSpan = select('#tempo-value');
    numTracksInput = select('#num-tracks');
    updateTracksButton = select('#update-tracks-button');
    trackSpecificControlsDiv = select('#track-specific-controls');
    startStopButton = select('#start-stop-button');
    visualizationModeSelect = select('#visualization-mode');

    // Store the initial value before setting up event handlers
    const initialVisualizationMode = visualizationModeSelect.value();
    visualizationMode = initialVisualizationMode;
    
    // Set up event handlers
    tempoSlider.input(updateTempo);
    numTracksInput.input(() => saveAppState());
    updateTracksButton.mousePressed(setupTrackControls);
    startStopButton.mousePressed(togglePlayback);
    visualizationModeSelect.changed(() => {
        visualizationMode = visualizationModeSelect.value();
        console.log('Visualization mode changed to:', visualizationMode);
        saveAppState();
    });
    
    // Load saved state first, before any other initializations
    loadAppState();
    
    // Only initialize with defaults if no state was loaded
    if (tracks.length === 0) {
        console.log('No tracks found in saved state, initializing defaults');
        // Initial setup only needed when no state is loaded
        updateTempo();
        setupTrackControls(); // Create controls for initial number of tracks
    }

    // Modal logic
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const controlsModal = document.getElementById('controls-modal');
    const previewCanvas = document.getElementById('preview-canvas');
    const tabGlobal = document.getElementById('tab-global');
    const tabTracks = document.getElementById('tab-tracks');
    const tabGlobalContent = document.getElementById('tab-global-content');
    const tabTracksContent = document.getElementById('tab-tracks-content');

    openModalBtn.onclick = () => {
        controlsModal.style.display = 'block';
        isModalOpen = true;
        resizeCanvas(160, 96);
        mainCanvas.canvas.style.display = 'none';
        previewCanvas.style.display = 'block';
    };
    closeModalBtn.onclick = () => {
        controlsModal.style.display = 'none';
        isModalOpen = false;
        resizeCanvas(windowWidth, windowHeight);
        mainCanvas.canvas.style.display = 'block';
        previewCanvas.style.display = 'none';
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
    previewCanvas.style.display = 'none';
}

function updateTempo() {
    globalTempo = float(tempoSlider.value());
    tempoValueSpan.html(globalTempo);
    saveAppState();
}

function setupTrackControls(stateTracks) {
    const num = parseInt(numTracksInput.value());
    tracks = [];
    const trackSpecificControlsDiv = select('#track-specific-controls');
    trackSpecificControlsDiv.html('');
    for (let i = 0; i < num; i++) {
        // Use stateTracks if provided, else defaults
        const t = stateTracks && stateTracks[i] ? stateTracks[i] : {};
        const trackDefaults = {
            id: i,
            rhythmValue: t.rhythmValue !== undefined ? t.rhythmValue : i + 2,
            soundType: t.soundType || 'sine',
            frequency: t.frequency !== undefined ? t.frequency : 220 * Math.pow(2, (i * 4) / 12),
            color: t.color ? color(t.color) : color((i * 60 + 30) % 360, 80, 90),
            particles: [],
            lastSpawnTime: 0,
            timePerBeatInCycle: 0,
            beatsSinceLastCycle: 0,
            trail: [],
            attack: t.attack !== undefined ? t.attack : 0.01,
            decay: t.decay !== undefined ? t.decay : 0.1,
            sustain: t.sustain !== undefined ? t.sustain : 0.5,
            release: t.release !== undefined ? t.release : 0.2,
            detune: t.detune !== undefined ? t.detune : 0,
            filterCutoff: t.filterCutoff !== undefined ? t.filterCutoff : 2000,
            lastPhase: 0,
            reverbAmount: t.reverbAmount !== undefined ? t.reverbAmount : 0.5,
            delayTime: t.delayTime !== undefined ? t.delayTime : 0.15,
            delayFeedback: t.delayFeedback !== undefined ? t.delayFeedback : 0.3,
            filterQ: t.filterQ !== undefined ? t.filterQ : 1,
            waveformBlend: t.waveformBlend || 'sine',
            pan: t.pan !== undefined ? t.pan : 0
        };
        tracks.push(trackDefaults);
        tracks[i].notePattern = t.notePattern || [tracks[i].frequency];
        tracks[i].patternIndex = 0;

        // Track card
        const card = createDiv().addClass('track-card').parent(trackSpecificControlsDiv);
        // Card header
        const header = createDiv().addClass('track-card-header').parent(card);
        const colorDot = createDiv().addClass('track-color-dot').parent(header);
        colorDot.style('background', tracks[i].color.toString('#rrggbb'));
        createSpan('Track ' + (i + 1)).addClass('track-title').parent(header);
        // Card body
        const body = createDiv().addClass('track-card-body').parent(card);
        createP('Rhythm (beats per main cycle):').parent(body);
        const rhythmInput = createInput(tracks[i].rhythmValue.toString(), 'number').parent(body);
        rhythmInput.attribute('min', '1');
        rhythmInput.value(tracks[i].rhythmValue);
        rhythmInput.input(() => { tracks[i].rhythmValue = parseInt(rhythmInput.value()) || 1; saveAppState(); });
        createP('Sound Type:').parent(body);
        const soundTypeSelect = createSelect().parent(body);
        soundTypeSelect.option('sine');
        soundTypeSelect.option('square');
        soundTypeSelect.option('sawtooth');
        soundTypeSelect.option('triangle');
        soundTypeSelect.option('noise');
        soundTypeSelect.selected(tracks[i].soundType);
        soundTypeSelect.changed(() => { tracks[i].soundType = soundTypeSelect.value(); saveAppState(); });
        createP('Base Frequency (Hz):').parent(body);
        const freqInput = createInput(tracks[i].frequency.toFixed(0), 'number').parent(body);
        freqInput.attribute('min', '20');
        freqInput.attribute('max', '2000');
        freqInput.value(tracks[i].frequency);
        freqInput.input(() => { tracks[i].frequency = parseFloat(freqInput.value()) || 220; saveAppState(); });
        createP('Color:').parent(body);
        const colorInput = createInput(tracks[i].color.toString('#rrggbb'), 'color').parent(body);
        colorInput.value(tracks[i].color.toString('#rrggbb'));
        colorInput.input(() => { tracks[i].color = color(colorInput.value()); colorDot.style('background', colorInput.value()); saveAppState(); });
        createP('Note Pattern (comma-separated, e.g. 220,330,440 or C4,E4,G4):').parent(body);
        const patternInput = createInput((tracks[i].notePattern || [tracks[i].frequency]).join(','), 'text').parent(body);
        patternInput.input(() => { const val = patternInput.value(); tracks[i].notePattern = parseNotePattern(val, tracks[i].frequency); tracks[i].patternIndex = 0; saveAppState(); });
        createP('Reverb Amount:').parent(body);
        const reverbSlider = createSlider(0, 1, tracks[i].reverbAmount, 0.01).parent(body);
        reverbSlider.value(tracks[i].reverbAmount);
        reverbSlider.input(() => { tracks[i].reverbAmount = parseFloat(reverbSlider.value()); saveAppState(); });
        createP('Delay Time (s):').parent(body);
        const delaySlider = createSlider(0, 0.5, tracks[i].delayTime, 0.01).parent(body);
        delaySlider.value(tracks[i].delayTime);
        delaySlider.input(() => { tracks[i].delayTime = parseFloat(delaySlider.value()); saveAppState(); });
        createP('Delay Feedback:').parent(body);
        const feedbackSlider = createSlider(0, 0.9, tracks[i].delayFeedback, 0.01).parent(body);
        feedbackSlider.value(tracks[i].delayFeedback);
        feedbackSlider.input(() => { tracks[i].delayFeedback = parseFloat(feedbackSlider.value()); saveAppState(); });
        createP('Filter Resonance (Q):').parent(body);
        const qSlider = createSlider(0.1, 20, tracks[i].filterQ, 0.1).parent(body);
        qSlider.value(tracks[i].filterQ);
        qSlider.input(() => { tracks[i].filterQ = parseFloat(qSlider.value()); saveAppState(); });
        createP('Waveform:').parent(body);
        const blendSelect = createSelect().parent(body);
        blendSelect.option('sine');
        blendSelect.option('square');
        blendSelect.option('triangle');
        blendSelect.option('sawtooth');
        blendSelect.option('mix');
        blendSelect.selected(tracks[i].waveformBlend);
        blendSelect.changed(() => { tracks[i].waveformBlend = blendSelect.value(); saveAppState(); });
        createP('Stereo Pan:').parent(body);
        const panSlider = createSlider(-1, 1, tracks[i].pan, 0.01).parent(body);
        panSlider.value(tracks[i].pan);
        panSlider.input(() => { tracks[i].pan = parseFloat(panSlider.value()); saveAppState(); });
    }
    
    // Make sure to save state after setting up tracks
    saveAppState();
}

function togglePlayback() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        currentBeat = 0;
        nextNoteTime = audioContext.currentTime + 0.1; // Start scheduling shortly
        scheduler(); // Start the scheduler
        startStopButton.html('Stop');
        startStopButton.addClass('playing');
    } else {
        clearTimeout(timerID);
        startStopButton.html('Start');
        startStopButton.removeClass('playing');
        // Clear particles when stopping
        tracks.forEach(track => track.particles = []);
    }
    saveAppState(); // Save state when play state changes
}

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        advanceNote();
    }
    timerID = setTimeout(scheduler, lookahead);
}

function advanceNote() {
    // Calculate the duration of one "main beat" based on tempo
    // This is our finest resolution for scheduling.
    const secondsPerMainBeat = 60.0 / globalTempo / 4; // Assuming 4 subdivisions per beat (16th notes)
    nextNoteTime += secondsPerMainBeat;
    currentBeat++;
}

function scheduleBeat(beatNumber, time) {
    const mainCycleLengthInBeats = 16 * 4; // e.g., 4 bars of 4/4, where each beat is a 16th note

    tracks.forEach(track => {
        // How many "main beats" are there for each of this track's rhythmic beats?
        track.timePerBeatInCycle = mainCycleLengthInBeats / track.rhythmValue;

        if (beatNumber % Math.round(track.timePerBeatInCycle) === 0) {
            // Trigger sound
            if (track.soundType === 'noise') {
                playNoise(track, time);
            } else {
                playTone(track, time);
            }
            // Spawn visual particle
            spawnParticle(track);
        }
    });
}

function playTone(track, time, freqOverride) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const env = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const panNode = audioContext.createStereoPanner();
    const delayNode = audioContext.createDelay();
    const feedbackGain = audioContext.createGain();
    const dryGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(track.filterCutoff || 2000, time);
    filter.Q.setValueAtTime(track.filterQ || 1, time);
    panNode.pan.setValueAtTime(track.pan || 0, time);
    delayNode.delayTime.setValueAtTime(track.delayTime || 0.15, time);
    feedbackGain.gain.setValueAtTime(track.delayFeedback || 0.3, time);
    dryGain.gain.setValueAtTime(1 - (track.reverbAmount || 0.5), time);
    wetGain.gain.setValueAtTime(track.reverbAmount || 0.5, time);

    // Waveform blend
    let blend = track.waveformBlend || 'sine';
    if (blend === 'mix') {
        osc1.type = 'sine';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(freqOverride || track.frequency, time);
        osc2.frequency.setValueAtTime(freqOverride || track.frequency, time);
        osc1.detune.setValueAtTime(track.detune || 0, time);
        osc2.detune.setValueAtTime(track.detune || 0, time);
    } else {
        osc1.type = blend;
        osc1.frequency.setValueAtTime(freqOverride || track.frequency, time);
        osc1.detune.setValueAtTime(track.detune || 0, time);
    }

    // Envelope
    const a = track.attack || 0.01;
    const d = track.decay || 0.1;
    const s = track.sustain || 0.5;
    const r = track.release || 0.2;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.7, time + a);
    env.gain.linearRampToValueAtTime(s, time + a + d);
    env.gain.linearRampToValueAtTime(0, time + a + d + r);

    // Routing: osc -> filter -> env -> pan -> (dry+wet)
    if (blend === 'mix') {
        const merger = audioContext.createGain();
        osc1.connect(merger);
        osc2.connect(merger);
        merger.gain.value = 0.5;
        merger.connect(filter);
    } else {
        osc1.connect(filter);
    }
    filter.connect(env);
    env.connect(panNode);
    // Delay
    panNode.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(dryGain);
    panNode.connect(dryGain);
    // Reverb
    if (reverbNode) {
        panNode.connect(wetGain);
        wetGain.connect(reverbNode);
        reverbNode.connect(masterGain);
    }
    dryGain.connect(masterGain);

    osc1.start(time);
    if (blend === 'mix') osc2.start(time);
    osc1.stop(time + a + d + r + 0.05);
    if (blend === 'mix') osc2.stop(time + a + d + r + 0.05);
}

function playNoise(track, time) {
    const bufferSize = audioContext.sampleRate * 0.15;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = buffer;
    const env = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const panNode = audioContext.createStereoPanner();
    const delayNode = audioContext.createDelay();
    const feedbackGain = audioContext.createGain();
    const dryGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(track.filterCutoff || 2000, time);
    filter.Q.setValueAtTime(track.filterQ || 1, time);
    panNode.pan.setValueAtTime(track.pan || 0, time);
    delayNode.delayTime.setValueAtTime(track.delayTime || 0.15, time);
    feedbackGain.gain.setValueAtTime(track.delayFeedback || 0.3, time);
    dryGain.gain.setValueAtTime(1 - (track.reverbAmount || 0.5), time);
    wetGain.gain.setValueAtTime(track.reverbAmount || 0.5, time);

    // Envelope
    const a = track.attack || 0.01;
    const d = track.decay || 0.1;
    const s = track.sustain || 0.5;
    const r = track.release || 0.2;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.5, time + a);
    env.gain.linearRampToValueAtTime(s, time + a + d);
    env.gain.linearRampToValueAtTime(0, time + a + d + r);

    noiseSource.connect(filter);
    filter.connect(env);
    env.connect(panNode);
    // Delay
    panNode.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(dryGain);
    panNode.connect(dryGain);
    // Reverb
    if (reverbNode) {
        panNode.connect(wetGain);
        wetGain.connect(reverbNode);
        reverbNode.connect(masterGain);
    }
    dryGain.connect(masterGain);

    noiseSource.start(time);
    noiseSource.stop(time + a + d + r + 0.05);
}

function spawnParticle(track) {
    // Instead of particles, trigger a pulse effect for the orbiting circle
    track.pulse = pulseMax;
}

function spawnTriggerParticles(track, markerX, markerY) {
    if (!track.triggerParticles) track.triggerParticles = [];
    for (let i = 0; i < maxParticles; i++) {
        const angle = random(TWO_PI);
        const speed = random(1, 3);
        track.triggerParticles.push({
            x: markerX,
            y: markerY,
            vx: cos(angle) * speed,
            vy: sin(angle) * speed,
            life: particleLife,
            color: track.color
        });
    }
}

function draw() {
    background(20, 80, 10, 100); // Slightly softer background

    // Always update drawing based on current visualization mode from the visualizationMode variable
    const currentMode = visualizationMode;
    
    if (currentMode === 'circular') {
        drawCircularOrbits();
    } else if (currentMode === 'pendulum') {
        drawPendulumWave();
    }
}

function drawCircularOrbits() {
    // Draw central anchor
    noStroke();
    fill(60, 0, 100, 100);
    ellipse(centerX, centerY, anchorRadius, anchorRadius);

    // Use audioContext.currentTime for smooth phase
    let now = audioContext ? audioContext.currentTime : millis() / 1000;
    let tempo = globalTempo;
    let mainCycleLengthInBeats = 16 * 4;
    let secondsPerMainBeat = 60.0 / tempo / 4;
    let mainCycleDuration = mainCycleLengthInBeats * secondsPerMainBeat;
    let cycleTime = now % mainCycleDuration;

    tracks.forEach((track, idx) => {
        const orbitRadius = minOrbitRadius + idx * orbitGap;
        // Draw orbit line
        noFill();
        stroke(hue(track.color), saturation(track.color), brightness(track.color), 30);
        strokeWeight(2);
        ellipse(centerX, centerY, orbitRadius * 2, orbitRadius * 2);

        // Calculate smooth phase for this track
        const beatsInCycle = track.rhythmValue;
        const phase = ((cycleTime / mainCycleDuration) * beatsInCycle) % 1;
        const angle = -HALF_PI + phase * TWO_PI;

        // Trigger sound, pulse, and particles when crossing the top
        if (typeof track.lastPhase === 'undefined') track.lastPhase = phase;
        if (track.lastPhase > 0.95 && phase < 0.05) {
            let note = track.notePattern && track.notePattern.length > 0 ? track.notePattern[track.patternIndex % track.notePattern.length] : track.frequency;
            if (track.soundType === 'noise') {
                playNoise(track, audioContext.currentTime);
            } else {
                playTone(track, audioContext.currentTime, note);
            }
            track.pulse = pulseMax;
            // Marker position
            const markerX = centerX + orbitRadius * cos(-HALF_PI);
            const markerY = centerY + orbitRadius * sin(-HALF_PI);
            spawnTriggerParticles(track, markerX, markerY);
            track.patternIndex = (track.patternIndex + 1) % (track.notePattern ? track.notePattern.length : 1);
        }
        track.lastPhase = phase;

        // Position of moving circle
        const x = centerX + orbitRadius * cos(angle);
        const y = centerY + orbitRadius * sin(angle);

        // Store trail
        if (!track.trail) track.trail = [];
        track.trail.push({x, y, t: now});
        if (track.trail.length > trailLength) track.trail.shift();

        // Draw trail
        noFill();
        beginShape();
        for (let i = 0; i < track.trail.length; i++) {
            const p = track.trail[i];
            const alpha = map(i, 0, track.trail.length - 1, 0, 60);
            stroke(hue(track.color), saturation(track.color), brightness(track.color), alpha);
            vertex(p.x, p.y);
        }
        endShape();

        // Pulse effect
        if (!track.pulse) track.pulse = 0;
        if (track.pulse > 0) {
            track.pulse -= 0.03;
            track.pulse = max(0, track.pulse);
        }
        const circleSize = particleBaseSize * (1 + track.pulse);

        // Draw moving circle with glow
        drawingContext.shadowBlur = 18;
        drawingContext.shadowColor = color(hue(track.color), saturation(track.color), 100, 80);
        fill(hue(track.color), saturation(track.color), brightness(track.color), 90);
        noStroke();
        ellipse(x, y, circleSize, circleSize);
        drawingContext.shadowBlur = 0;

        // Draw a marker at the top of the orbit (trigger point)
        const markerX = centerX + orbitRadius * cos(-HALF_PI);
        const markerY = centerY + orbitRadius * sin(-HALF_PI);
        fill(hue(track.color), saturation(track.color), 100, 60);
        ellipse(markerX, markerY, 8, 8);

        // Draw and update trigger particles
        if (!track.triggerParticles) track.triggerParticles = [];
        for (let i = track.triggerParticles.length - 1; i >= 0; i--) {
            const p = track.triggerParticles[i];
            fill(hue(p.color), saturation(p.color), brightness(p.color), map(p.life, 0, particleLife, 0, 80));
            noStroke();
            ellipse(p.x, p.y, 4, 4);
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) track.triggerParticles.splice(i, 1);
        }
    });
}

function drawPendulumWave() {
    // Pendulum anchor point
    const anchorX = p5CanvasWidth / 2;
    const anchorY = 0;
    const pendulumLengthBase = p5CanvasHeight * 0.35;
    const pendulumLengthStep = 30;
    const triggerX = p5CanvasWidth / 2;

    // Draw vertical trigger line
    stroke(100, 0, 80, 50);
    strokeWeight(2);
    line(triggerX, 0, triggerX, p5CanvasHeight);

    let now = audioContext ? audioContext.currentTime : millis() / 1000;
    let tempo = globalTempo;
    let mainCycleLengthInBeats = 16 * 4;
    let secondsPerMainBeat = 60.0 / tempo / 4;
    let mainCycleDuration = mainCycleLengthInBeats * secondsPerMainBeat;
    let cycleTime = now % mainCycleDuration;

    tracks.forEach((track, idx) => {
        // Each pendulum has a different length (period)
        const pendulumLength = pendulumLengthBase + idx * pendulumLengthStep;
        // Period is proportional to rhythm value
        const beatsInCycle = track.rhythmValue;
        const period = mainCycleDuration / beatsInCycle;
        // Phase: 0 at leftmost, 0.5 at rightmost, 1 at leftmost again
        const phase = ((cycleTime / period) % 1);
        // Angle swings from -maxAngle to +maxAngle
        const maxAngle = PI / 3;
        const angle = sin(phase * TWO_PI) * maxAngle;

        // Pendulum bob position
        const x = anchorX + pendulumLength * sin(angle);
        const y = anchorY + pendulumLength * cos(angle);

        // Store trail
        if (!track.trail) track.trail = [];
        track.trail.push({x, y, t: now});
        if (track.trail.length > trailLength) track.trail.shift();

        // Draw trail
        noFill();
        beginShape();
        for (let i = 0; i < track.trail.length; i++) {
            const p = track.trail[i];
            const alpha = map(i, 0, track.trail.length - 1, 0, 60);
            stroke(hue(track.color), saturation(track.color), brightness(track.color), alpha);
            vertex(p.x, p.y);
        }
        endShape();

        // Draw pendulum string
        stroke(hue(track.color), saturation(track.color), brightness(track.color), 40);
        strokeWeight(2);
        line(anchorX, anchorY, x, y);

        // Pulse effect
        if (!track.pulse) track.pulse = 0;
        if (track.pulse > 0) {
            track.pulse -= 0.03;
            track.pulse = max(0, track.pulse);
        }
        const circleSize = particleBaseSize * (1 + track.pulse);

        // Draw pendulum bob with glow
        drawingContext.shadowBlur = 18;
        drawingContext.shadowColor = color(hue(track.color), saturation(track.color), 100, 80);
        fill(hue(track.color), saturation(track.color), brightness(track.color), 90);
        noStroke();
        ellipse(x, y, circleSize, circleSize);
        drawingContext.shadowBlur = 0;

        // Draw anchor point
        fill(hue(track.color), saturation(track.color), 100, 60);
        noStroke();
        ellipse(anchorX, anchorY, 8, 8);

        // Draw and update trigger particles
        if (!track.triggerParticles) track.triggerParticles = [];
        for (let i = track.triggerParticles.length - 1; i >= 0; i--) {
            const p = track.triggerParticles[i];
            fill(hue(p.color), saturation(p.color), brightness(p.color), map(p.life, 0, particleLife, 0, 80));
            noStroke();
            ellipse(p.x, p.y, 4, 4);
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) track.triggerParticles.splice(i, 1);
        }

        // Trigger sound, pulse, and particles when crossing the center vertical line (from left to right or right to left)
        if (typeof track.lastX === 'undefined') track.lastX = x;
        if ((track.lastX < triggerX && x >= triggerX) || (track.lastX > triggerX && x <= triggerX)) {
            let note = track.notePattern && track.notePattern.length > 0 ? track.notePattern[track.patternIndex % track.notePattern.length] : track.frequency;
            if (track.soundType === 'noise') {
                playNoise(track, audioContext.currentTime);
            } else {
                playTone(track, audioContext.currentTime, note);
            }
            track.pulse = pulseMax;
            spawnTriggerParticles(track, triggerX, y);
            track.patternIndex = (track.patternIndex + 1) % (track.notePattern ? track.notePattern.length : 1);
        }
        track.lastX = x;
    });
}

// Easing function for particle movement
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Make sure to handle audioContext suspension on user interaction
function mousePressed() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Helper to parse note pattern input
function parseNotePattern(str, fallbackFreq) {
    return str.split(',').map(s => {
        s = s.trim();
        if (/^[A-Ga-g][#b]?\d$/.test(s)) {
            // Note name, e.g. C4
            return noteNameToFreq(s);
        } else if (!isNaN(parseFloat(s))) {
            return parseFloat(s);
        } else {
            return fallbackFreq;
        }
    });
}

// Convert note name (e.g. C4) to frequency
function noteNameToFreq(name) {
    const notes = {C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11};
    const match = name.match(/^([A-Ga-g][#b]?)(\d)$/);
    if (!match) return 440;
    const n = notes[match[1].toUpperCase()] ?? 0;
    const octave = parseInt(match[2]);
    return 440 * Math.pow(2, (n + (octave-4)*12 - 9)/12);
}

function windowResized() {
    if (!isModalOpen) {
        resizeCanvas(windowWidth, windowHeight);
    }
}

function getAppState() {
    return {
        global: {
            tempo: globalTempo,
            numTracks: parseInt(numTracksInput.value()),
            visualizationMode: visualizationModeSelect.value(),
            isPlaying: isPlaying,
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
            patternIndex: track.patternIndex || 0
        }))
    };
}

function setAppState(state) {
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
}

function saveAppState() {
    const state = getAppState();
    console.log('Saving state with visualization mode:', state.global.visualizationMode);
    localStorage.setItem('polyrhythmAppState', JSON.stringify(state));
    console.log('State saved:', new Date().toLocaleTimeString());
}

function loadAppState() {
    try {
        console.log('Loading state...');
        const state = localStorage.getItem('polyrhythmAppState');
        if (state) {
            console.log('State found in localStorage');
            const parsedState = JSON.parse(state);
            setAppState(parsedState);
            
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
}

// Utility function for debugging state issues
function debugState() {
    const current = getAppState();
    const saved = localStorage.getItem('polyrhythmAppState');
    
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

// Add to window for console access
window.debugPolyrhythmState = debugState;