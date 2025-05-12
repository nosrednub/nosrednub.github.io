// Audio system for the Polyrhythm Experiment

// Audio context and nodes
let audioContext;
let masterGain;
let reverbNode;
let analyserNode; // For visualizing audio

// Initialize the audio system
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.7, audioContext.currentTime); // Master volume
    
    // Create analyzer for visualizations
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.85;
    
    masterGain.connect(analyserNode);
    analyserNode.connect(audioContext.destination);

    // Setup enhanced reverb with longer decay
    createEnhancedReverb();
}

// Create a more ethereal, space-filling reverb
function createEnhancedReverb() {
    try {
        reverbNode = audioContext.createConvolver();
        
        // Create a longer, more ethereal impulse response
        // Duration increased for more spacious reverb (2.5 seconds)
        const duration = 2.5;
        const decay = 2.0; // Slower decay rate for ethereal tail
        const sampleRate = audioContext.sampleRate;
        const length = sampleRate * duration;
        const irBuffer = audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = irBuffer.getChannelData(channel);
            
            // Early reflections (first 1/8 of the buffer)
            const earlyReflectionsLength = Math.floor(length / 8);
            for (let i = 0; i < earlyReflectionsLength; i++) {
                // More pronounced early reflections for sense of space
                channelData[i] = (Math.random() * 2 - 1) * 
                                 Math.pow(1 - i / earlyReflectionsLength, 1.2);
            }
            
            // Late reverb tail (remaining 7/8)
            for (let i = earlyReflectionsLength; i < length; i++) {
                // Exponential decay with slight modulation for ethereal quality
                const position = (i - earlyReflectionsLength) / (length - earlyReflectionsLength);
                const envelope = Math.pow(1 - position, decay);
                
                // Add modulation for ethereal shimmer effect
                const modulation = 1 + 0.03 * Math.sin(position * 8 * Math.PI);
                
                // Different modulation patterns per channel for spaciousness
                const spacialVariation = channel === 0 ? 
                    Math.sin(position * 4.3 * Math.PI) : 
                    Math.sin(position * 3.9 * Math.PI);
                
                channelData[i] = (Math.random() * 2 - 1) * 
                                envelope * modulation * (1 + 0.05 * spacialVariation);
            }
            
            // Apply slight filtering to soften harsh frequencies
            applySimpleLowpass(channelData, 0.2);
        }
        
        reverbNode.buffer = irBuffer;
        reverbNode.connect(masterGain);
        
        console.log("Enhanced reverb created successfully");
    } catch (e) {
        console.error("Error creating reverb:", e);
        reverbNode = null;
    }
}

// Simple lowpass filter simulation for impulse response
function applySimpleLowpass(buffer, amount) {
    let lastValue = 0;
    for (let i = 0; i < buffer.length; i++) {
        buffer[i] = lastValue + (buffer[i] - lastValue) * amount;
        lastValue = buffer[i];
    }
}

// Play a tone according to track settings
function playTone(track, time, freqOverride, volume = 1.0) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const env = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const panNode = audioContext.createStereoPanner();
    const delayNode = audioContext.createDelay();
    const feedbackGain = audioContext.createGain();
    const dryGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    
    // Shimmer effect components
    const shimmerGain = audioContext.createGain();
    const shimmerFilter = audioContext.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(track.filterCutoff || 2000, time);
    filter.Q.setValueAtTime(track.filterQ || 1, time);
    panNode.pan.setValueAtTime(track.pan || 0, time);
    delayNode.delayTime.setValueAtTime(track.delayTime || 0.15, time);
    feedbackGain.gain.setValueAtTime(track.delayFeedback || 0.3, time);
    
    // Enhanced reverb control
    const reverbAmount = track.reverbAmount || 0.5;
    dryGain.gain.setValueAtTime((1 - (reverbAmount * 0.7)) * volume, time); // Apply volume parameter
    wetGain.gain.setValueAtTime((reverbAmount * 1.3) * volume, time); // Apply volume parameter
    
    // Shimmer effect setup
    shimmerFilter.type = 'highpass';
    shimmerFilter.frequency.setValueAtTime(2000, time);
    shimmerFilter.Q.setValueAtTime(1.5, time);
    shimmerGain.gain.setValueAtTime(reverbAmount * 0.2 * volume, time); // Apply volume parameter

    // Waveform blend
    let blend = track.waveformBlend || 'sine';
    if (blend === 'mix') {
        osc1.type = 'sine';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(freqOverride || track.frequency, time);
        osc2.frequency.setValueAtTime(freqOverride || track.frequency, time);
        osc1.detune.setValueAtTime(track.detune || 0, time);
        osc2.detune.setValueAtTime((track.detune || 0) + 5, time); // Slight detuning for richness
    } else {
        osc1.type = blend;
        osc1.frequency.setValueAtTime(freqOverride || track.frequency, time);
        osc1.detune.setValueAtTime(track.detune || 0, time);
    }

    // Enhanced envelope with longer tail for ethereal sounds
    const a = track.attack || 0.01;
    const d = track.decay || 0.1;
    const s = track.sustain || 0.5;
    const r = Math.max(0.5, track.release || 0.2) * (1 + reverbAmount); // Longer release based on reverb amount
    
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.7 * volume, time + a); // Apply volume parameter
    env.gain.linearRampToValueAtTime(s * volume, time + a + d); // Apply volume parameter
    // More gradual fade-out curve for ethereal feel
    env.gain.setTargetAtTime(0, time + a + d, r * 0.5);

    // Routing: osc -> filter -> env -> pan -> (dry+wet+shimmer)
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
    
    // Delay with feedback
    panNode.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(dryGain);
    
    // Direct signal
    panNode.connect(dryGain);
    
    // Reverb
    if (reverbNode) {
        // Main reverb path
        panNode.connect(wetGain);
        wetGain.connect(reverbNode);
        
        // Shimmer effect (higher frequencies to reverb)
        panNode.connect(shimmerFilter);
        shimmerFilter.connect(shimmerGain);
        shimmerGain.connect(reverbNode);
        
        reverbNode.connect(masterGain);
    }
    dryGain.connect(masterGain);

    osc1.start(time);
    if (blend === 'mix') osc2.start(time);
    
    // Schedule oscillator stop with added time for reverb tail to finish
    const stopTime = time + a + d + r * 3;
    osc1.stop(stopTime);
    if (blend === 'mix') osc2.stop(stopTime);
    
    // Return the total expected sound duration (for visualization sync)
    return {
        attackTime: a,
        decayTime: d,
        releaseTime: r,
        reverbTime: 2.5 * reverbAmount, // Estimated reverb tail time
        totalDuration: a + d + r * 3 + (2.5 * reverbAmount),
        delayTime: track.delayTime || 0.15,
        delayFeedback: track.delayFeedback || 0.3,
        // Calculate when sound will be inaudible (-60dB) using the time constant
        inaudibleTime: calculateTimeToInaudible(a, d, r, reverbAmount, track.delayTime, track.delayFeedback)
    };
}

// Play a noise sound according to track settings
function playNoise(track, time, volume = 1.0) {
    const bufferSize = audioContext.sampleRate * 0.3; // Longer noise buffer
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    // Generate filtered noise for a more interesting texture
    let lastSample = 0;
    for (let i = 0; i < bufferSize; i++) {
        // Pink-ish noise (more bass) for a warmer sound
        const white = Math.random() * 2 - 1;
        // Simple lowpass filter
        lastSample = 0.25 * white + 0.75 * lastSample;
        output[i] = lastSample * 1.5; // Boost to compensate for filtering
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
    
    // Enhanced reverb control for noise
    const reverbAmount = track.reverbAmount || 0.5;
    dryGain.gain.setValueAtTime((1 - (reverbAmount * 0.7)) * volume, time); // Apply volume parameter
    wetGain.gain.setValueAtTime((reverbAmount * 1.5) * volume, time); // Apply volume parameter

    // Envelope with longer release for noise
    const a = track.attack || 0.01;
    const d = track.decay || 0.1;
    const s = track.sustain || 0.5;
    const r = Math.max(0.6, track.release || 0.2) * (1 + reverbAmount * 0.5);
    
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.6 * volume, time + a); // Apply volume parameter
    env.gain.linearRampToValueAtTime(s * volume, time + a + d); // Apply volume parameter
    // Gradual fade out using exponential approach for more natural decay
    env.gain.setTargetAtTime(0, time + a + d, r * 0.7);

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
    noiseSource.stop(time + a + d + r * 3); // Longer play time to account for reverb tail
    
    // Return the total expected sound duration (for visualization sync)
    return {
        attackTime: a,
        decayTime: d,
        releaseTime: r,
        reverbTime: 2.5 * reverbAmount,
        totalDuration: a + d + r * 3 + (2.5 * reverbAmount),
        delayTime: track.delayTime || 0.15,
        delayFeedback: track.delayFeedback || 0.3,
        // Calculate when sound will be inaudible (-60dB)
        inaudibleTime: calculateTimeToInaudible(a, d, r, reverbAmount, track.delayTime, track.delayFeedback)
    };
}

// Get analyzer data for visualizations
function getAnalyzerData() {
    if (!analyserNode) return null;
    
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
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

// Make sure to handle audioContext suspension on user interaction
function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Calculate the time it takes for a sound to become completely inaudible
function calculateTimeToInaudible(attack, decay, release, reverbAmount, delayTime, delayFeedback) {
    // Time to -60dB using exponential decay formula: time = timeConstant * ln(startValue/endValue)
    // For our setTargetAtTime(0, startTime, timeConstant) we use:
    const targetTimeConstant = release * 0.5; // From the env.gain.setTargetAtTime call
    
    // An exponential curve reaches -60dB after approximately 6.91 time constants
    // This is calculated as: ln(1/0.001) ≈ 6.91 (where 0.001 is -60dB)
    const timeToSilence = targetTimeConstant * 6.91;
    
    // Add time for reverb (more precise than just adding the entire reverb time)
    const reverbDecayTime = 2.5 * reverbAmount * 0.95; // 95% of reverb time to reach silence
    
    // Calculate delay echo time if significant
    let delayEchoTime = 0;
    if (delayTime > 0.05 && delayFeedback > 0.1) {
        // Calculate how many audible delay echoes (-60dB threshold)
        const numEchoes = Math.min(
            Math.ceil(Math.log(0.001) / Math.log(delayFeedback)),
            10 // Cap at 10 echoes maximum
        );
        delayEchoTime = numEchoes * delayTime;
    }
    
    // Return the maximum of these times (whichever makes the sound inaudible last)
    return Math.max(
        attack + decay + timeToSilence,
        reverbDecayTime,
        delayEchoTime
    );
}

export {
    audioContext,
    masterGain,
    reverbNode,
    initAudio,
    playTone,
    playNoise,
    noteNameToFreq,
    parseNotePattern,
    resumeAudioContext,
    getAnalyzerData,
    createEnhancedReverb
}; 