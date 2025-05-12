// Visualizations for the Polyrhythm Experiment

import { 
    minOrbitRadius, orbitGap, anchorRadius, 
    pulseMax, particleBaseSize, 
    particleLife, maxParticles,
    maxVisualizationSize,
    orbitRadiusScaleFactor,
    orbitGapScaleFactor,
    particleReverbScaling,
    particleDelayRepeat,
    particleEffectIntensity,
    glowIntensity,
    useDelayTrails,
    useReverseParticles,
    reverseParticleRatio,
    useColorShift,
    useEtherealGlow,
    useBloom,
    bloomIntensity,
    useParticleGrowth,
    colorShiftSpeed,
    etherealGlowIntensity
} from './config.js';

import { audioContext, playTone, playNoise } from './audio.js';

// Keep track of performance metrics
let lastFrameTimestamp = 0;
let frameTimeHistory = [];
const MAX_FRAME_HISTORY = 30;
let dynamicParticleLimit = maxParticles;
let isLowPerformanceMode = false;

// Calculate sizes based on the actual canvas dimensions
function calculateResponsiveSizes() {
    // Use the smaller dimension for scaling circular visualizations
    const smallerDimension = min(width, height);
    
    // Scale orbit sizes based on the smaller dimension
    const scaledMinOrbitRadius = smallerDimension * orbitRadiusScaleFactor;
    const scaledOrbitGap = smallerDimension * orbitGapScaleFactor;
    
    return {
        centerX: width / 2,
        centerY: height / 2,
        minOrbitRadius: scaledMinOrbitRadius,
        orbitGap: scaledOrbitGap,
        // Scale particle size relative to orbit size
        particleSize: particleBaseSize * (smallerDimension / 600)
    };
}

// Draw the circular orbits visualization
function drawCircularOrbits(tracks) {
    // Performance monitoring - measure frame time
    const currentTime = performance.now();
    if (lastFrameTimestamp > 0) {
        const frameTime = currentTime - lastFrameTimestamp;
        frameTimeHistory.push(frameTime);
        if (frameTimeHistory.length > MAX_FRAME_HISTORY) {
            frameTimeHistory.shift();
        }
        
        // Update dynamic particle limit based on frame rate
        if (frameTimeHistory.length === MAX_FRAME_HISTORY) {
            const avgFrameTime = frameTimeHistory.reduce((sum, time) => sum + time, 0) / frameTimeHistory.length;
            const estimatedFPS = 1000 / avgFrameTime;
            
            // Adjust particle limit if performance is poor
            if (estimatedFPS < 30 && !isLowPerformanceMode) {
                // Reduce particle count by 40% if frame rate drops below target
                dynamicParticleLimit = Math.floor(dynamicParticleLimit * 0.6);
                dynamicParticleLimit = Math.max(dynamicParticleLimit, 12); // Minimum particles
                isLowPerformanceMode = true;
                console.log(`Performance optimization: reducing particle limit to ${dynamicParticleLimit}`);
            } else if (estimatedFPS > 50 && isLowPerformanceMode) {
                // Gradually increase particles when performance improves
                dynamicParticleLimit = Math.min(
                    Math.floor(dynamicParticleLimit * 1.2),
                    maxParticles
                );
                if (dynamicParticleLimit >= maxParticles) {
                    isLowPerformanceMode = false;
                }
                console.log(`Performance improvement: increasing particle limit to ${dynamicParticleLimit}`);
            }
        }
    }
    lastFrameTimestamp = currentTime;

    // Get responsive sizes
    const responsive = calculateResponsiveSizes();
    const { centerX, centerY, minOrbitRadius: scaledMinRadius, orbitGap: scaledGap, particleSize } = responsive;
    
    // Draw central anchor
    noStroke();
    fill(60, 0, 100, 100);
    ellipse(centerX, centerY, anchorRadius, anchorRadius);

    // Use audioContext.currentTime for smooth phase
    let now = audioContext ? audioContext.currentTime : millis() / 1000;
    let tempo = window.globalTempo;
    let mainCycleLengthInBeats = 16 * 4;
    let secondsPerMainBeat = 60.0 / tempo / 4;
    let mainCycleDuration = mainCycleLengthInBeats * secondsPerMainBeat;
    let cycleTime = now % mainCycleDuration;

    tracks.forEach((track, idx) => {
        const orbitRadius = scaledMinRadius + idx * scaledGap;
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
            let soundDuration;
            if (track.soundType === 'noise') {
                soundDuration = playNoise(track, audioContext.currentTime);
            } else {
                soundDuration = playTone(track, audioContext.currentTime, note);
            }
            track.soundDuration = soundDuration; // Store for visualization synchronization
            track.pulse = pulseMax;
            // Marker position
            const markerX = centerX + orbitRadius * cos(-HALF_PI);
            const markerY = centerY + orbitRadius * sin(-HALF_PI);
            spawnTriggerParticles(track, markerX, markerY, particleSize);
            track.patternIndex = (track.patternIndex + 1) % (track.notePattern ? track.notePattern.length : 1);
        }
        track.lastPhase = phase;

        // Position of moving circle
        const x = centerX + orbitRadius * cos(angle);
        const y = centerY + orbitRadius * sin(angle);

        // Store trail
        if (!track.trail) track.trail = [];
        track.trail.push({x, y, t: now});
        if (track.trail.length > window.trailLength) track.trail.shift();

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
        const circleSize = particleSize * (1 + track.pulse);

        // Draw moving circle with glow based on filter settings
        const filterGlow = map(track.filterCutoff, 100, 5000, 5, 25) * (track.filterQ / 5) * glowIntensity;
        drawingContext.shadowBlur = filterGlow;
        drawingContext.shadowColor = color(hue(track.color), saturation(track.color), 100, 80);
        fill(hue(track.color), saturation(track.color), brightness(track.color), 90);
        noStroke();
        ellipse(x, y, circleSize, circleSize);
        drawingContext.shadowBlur = 0;

        // Draw a marker at the top of the orbit (trigger point)
        const markerX = centerX + orbitRadius * cos(-HALF_PI);
        const markerY = centerY + orbitRadius * sin(-HALF_PI);
        fill(hue(track.color), saturation(track.color), 100, 60);
        ellipse(markerX, markerY, particleSize * 0.8, particleSize * 0.8);

        // Draw and update trigger particles - with batching optimization
        if (!track.triggerParticles) track.triggerParticles = [];
        
        // Quick view frustum culling - only process particles that are visible
        const viewportMinX = -particleSize * 2;
        const viewportMinY = -particleSize * 2;
        const viewportMaxX = width + particleSize * 2;
        const viewportMaxY = height + particleSize * 2;
        
        // Batch similar particles for more efficient rendering
        const particleBatches = {};
        
        // Process particles in reverse to allow removal during iteration
        for (let i = track.triggerParticles.length - 1; i >= 0; i--) {
            const p = track.triggerParticles[i];
            
            // Quick visibility test - skip processing completely off-screen particles
            if (p.x < viewportMinX || p.x > viewportMaxX || p.y < viewportMinY || p.y > viewportMaxY) {
                // Only update position minimally for off-screen particles
                if (p.isAmbient) {
                    p.x += p.vx * 0.5;
                    p.y += p.vy * 0.5;
                } else {
                    p.x += p.vx;
                    p.y += p.vy;
                }
                p.life--;
                
                // Still remove if lifetime is over
                if (p.life <= 0) {
                    track.triggerParticles.splice(i, 1);
                }
                continue;
            }
            
            // Calculate particle age as a ratio (0.0 to 1.0)
            const ageRatio = 1 - (p.life / p.maxLife);
            
            // CRITICAL CLEANUP: Force remove particles that are too old relative to reverb time
            // This ensures particles don't linger longer than their sound
            if (ageRatio > 0.999 || p.life <= 0) {
                track.triggerParticles.splice(i, 1);
                continue; // Skip to next particle
            }

            // Additional cleanup for off-screen particles that are past their prime
            // This reduces memory usage and improves performance
            if (ageRatio > 0.85 && 
                (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50)) {
                track.triggerParticles.splice(i, 1);
                continue; // Skip to next particle
            }
            
            // Slow down particles as they age to keep them more visible on screen
            const velocityDamping = Math.pow(0.95, ageRatio * 10);
            p.vx *= velocityDamping;
            p.vy *= velocityDamping;
            
            // Calculate bloom effect intensity if enabled
            let bloomEffect = 0;
            if (useBloom && p.reverbAmount > 0.3) {
                bloomEffect = p.reverbAmount * bloomIntensity * (1 - ageRatio * 0.5);
            }
            
            // Calculate base alpha based on life and reverb
            let baseAlpha;
            if (p.isAmbient) {
                // Ambient particles have custom fade profile
                baseAlpha = map(p.life, 0, p.maxLife, 0, 60) * p.opacity;
                
                // Ambient particles fade in and out
                if (ageRatio < 0.2) {
                    // Fade in
                    baseAlpha *= ageRatio * 5;
                } else if (ageRatio > 0.7) {
                    // Fade out - more aggressive curve
                    baseAlpha *= Math.pow(map(ageRatio, 0.7, 1.0, 1.0, 0.0), 1.5);
                }
            } else {
                // Standard particles - calculate alpha based on exact sound duration
                // Use a custom curve that ensures full transparency exactly at end of sound
                
                // Calculate time remaining ratio - how close is this particle to the sound's end
                const timeRemaining = p.life / p.maxLife;
                
                // Apply a more aggressive curve for the last 30% of life
                let fadeOutCurve;
                if (timeRemaining < 0.3) {
                    // Final fadeout phase - accelerating curve toward transparency
                    // Use a cubic curve to ensure the particle reaches exactly zero opacity at end
                    fadeOutCurve = Math.pow(timeRemaining / 0.3, 2.5);
                } else {
                    // Normal fade - maintain visibility longer
                    fadeOutCurve = Math.pow(timeRemaining, 0.5);
                }
                
                baseAlpha = 80 * fadeOutCurve * (1 + p.reverbAmount * 0.3);
                
                // Echo particles are more transparent
                if (p.isEcho) {
                    baseAlpha *= 0.6;
                }
                
                // Force complete transparency in final frames
                if (p.life <= 3) {
                    baseAlpha *= p.life / 3;
                }
            }
            
            // Apply visual effects based on waveform type
            let particleSizeModifier = 1;
            let particleShape = 0; // 0 = circle, 1 = square, etc.
            
            if (p.waveform === 'square') {
                particleSizeModifier = 1.2;
                particleShape = 1; // Square
                
                // Squarewave particles flash slightly
                if (p.life % 3 === 0) {
                    baseAlpha *= 1.2;
                }
            } else if (p.waveform === 'sawtooth') {
                particleSizeModifier = 0.8 + (p.life % 3) * 0.2;
                particleShape = 2; // Triangle
                
                // Sawtooth particles get smaller over time
                particleSizeModifier *= (1 - ageRatio * 0.3);
            } else if (p.waveform === 'triangle') {
                particleSizeModifier = 0.9 + sin(p.life * 0.2) * 0.3;
                
                // Triangle particles pulse
                baseAlpha *= 0.9 + sin(p.life * 0.3) * 0.2;
            }
            
            // Apply color effects
            let h = hue(p.color) + (p.hueShift || 0);
            let s = saturation(p.color);
            let b = brightness(p.color);
            
            // Color shifting over time if enabled
            if (useColorShift) {
                h += p.life * colorShiftSpeed * (p.isEcho ? 2 : 1);
                
                // More saturation for shimmer effect
                if (p.hasShimmer) {
                    s = min(100, s + 15 + sin(p.life * p.shimmerFrequency) * 10);
                    b = min(100, b + 10 + sin(p.life * p.shimmerFrequency) * 15);
                }
            }
            
            // For noise type, add color variation
            if (track.soundType === 'noise') {
                h = (h + p.life * 2) % 360;
                s = min(100, s + 10);
                // Noise particles are more chaotic but slow down more over time
                p.vx += random(-0.2, 0.2) * velocityDamping;
                p.vy += random(-0.2, 0.2) * velocityDamping;
            }
            
            // Add a slight velocity boost to ensure particles continue moving outward
            // Maintain at least 70% of original velocity even when near the end of life
            if (!p.isAmbient && ageRatio > 0.5) {
                const velocityMaintenance = 0.7 + (1 - ageRatio) * 0.3;
                const originalDirection = atan2(p.vy, p.vx);
                const currentSpeed = sqrt(p.vx * p.vx + p.vy * p.vy);
                const minSpeed = p.initialSpeed * 0.4; // Ensure at least 40% of initial speed
                
                if (currentSpeed < minSpeed) {
                    p.vx = cos(originalDirection) * minSpeed;
                    p.vy = sin(originalDirection) * minSpeed;
                }
            }
            
            // Calculate final particle size with animation
            let finalSize;
            if (useParticleGrowth) {
                // Size oscillation for ethereal feel
                const growthFactor = p.isAmbient ? 
                    0.8 + sin(p.life * p.driftFrequency + p.driftPhase) * 0.3 :
                    1.0 + sin(p.life * p.pulseSpeed + p.pulsePhase) * 0.25;
                
                // Particles get gradually smaller as they fade out - more aggressive shrinking
                const shrinkWithAge = 1 - Math.pow(ageRatio, 1.8) * 0.7; // More shrinkage (was 0.6)
                finalSize = particleSize * 0.4 * particleSizeModifier * p.sizeMultiplier * growthFactor * shrinkWithAge;
            } else {
                finalSize = particleSize * 0.4 * particleSizeModifier * p.sizeMultiplier * (1 - ageRatio * 0.5);
            }
            
            // Skip drawing if alpha is too low - improves performance
            if (baseAlpha < 3) {
                p.life--;
                continue;
            }
            
            // Create batch key based on particle properties for batched rendering
            let batchKey;
            if (p.isAmbient) {
                batchKey = `ambient_${Math.floor(h/20)}_${Math.floor(baseAlpha/10)}`;
            } else if (particleShape === 1) { // Square
                batchKey = `square_${Math.floor(h/20)}_${Math.floor(baseAlpha/10)}`;
            } else if (particleShape === 2) { // Triangle
                batchKey = `triangle_${Math.floor(h/20)}_${Math.floor(baseAlpha/10)}`;
            } else { // Circle
                batchKey = `circle_${Math.floor(h/20)}_${Math.floor(baseAlpha/10)}`;
            }
            
            // Add to the appropriate batch
            if (!particleBatches[batchKey]) {
                particleBatches[batchKey] = {
                    particles: [],
                    hue: h % 360,
                    saturation: s,
                    brightness: b,
                    alpha: baseAlpha,
                    shape: particleShape,
                    isAmbient: p.isAmbient,
                    bloom: bloomEffect,
                    glow: useEtherealGlow && (p.reverbAmount > 0.3 || p.hasShimmer),
                    glowAmount: p.hasShimmer ? 
                        etherealGlowIntensity * p.shimmerIntensity * (0.5 + sin(p.life * p.shimmerFrequency) * 0.5) : 
                        etherealGlowIntensity * p.reverbAmount,
                    glowFade: Math.pow(1 - ageRatio, 2.2)
                };
            }
            
            particleBatches[batchKey].particles.push({
                x: p.x,
                y: p.y,
                size: finalSize,
                rotation: p.rotation,
                ageRatio: ageRatio  // Add the ageRatio for use in bloom effect
            });

            // Update position with effects
            if (p.isAmbient) {
                // Ambient particles drift more organically, slower with age
                p.x += p.vx * (1 - ageRatio * 0.3) + sin(p.life * p.driftFrequency) * 0.3;
                p.y += p.vy * (1 - ageRatio * 0.3) + cos(p.life * p.driftFrequency * 0.7) * 0.3;
            } else if (p.waveform === 'triangle' || p.waveform === 'sine') {
                // Sine-like oscillating movement, slowing down with age but maintaining outward direction
                // Reduce oscillation effect to make outward movement more pronounced
                p.x += p.vx + sin(p.life * 0.2) * 0.3 * (1 - ageRatio * 0.7);
                p.y += p.vy + cos(p.life * 0.3) * 0.3 * (1 - ageRatio * 0.7);
            } else if (p.waveform === 'square') {
                // More angular movement but ensure consistent outward movement
                p.x += p.vx;
                p.y += p.vy;
                if (p.life % 8 < 4) {
                    p.vx *= 0.97;
                    p.vy *= 1.03;
                } else {
                    p.vx *= 1.03;
                    p.vy *= 0.97;
                }
            } else {
                // Ensure consistent outward movement for default case
                p.x += p.vx;
                p.y += p.vy;
            }
            
            // Update animation properties
            p.rotation += p.rotationSpeed * (1 - ageRatio * 0.5); // Slow rotation as particle ages
            p.life--;
            
            // Handle echo creation when particles die
            if (p.life <= 0) {
                // If this particle has delay echoes, spawn them - but limit quantity for performance
                const maxEchoCount = track.delayFeedback > 0.6 ? 2 : 1; // Higher feedback = more echoes
                if (particleDelayRepeat && !p.isAmbient && track.delayFeedback > 0.2 && !p.isEcho && p.echoCount < maxEchoCount) {
                    // Create echo particles with reduced size
                    const delayTime = track.delayTime || 0.15;
                    const feedbackAmount = track.delayFeedback || 0.3;
                    
                    // Only continue if we have meaningful delay and performance headroom
                    if (delayTime > 0.05 && feedbackAmount > 0.15 && track.triggerParticles.length < maxParticlesPerTrack * 0.8) {
                        // Create an echo particle with shorter life
                        const echoParticle = { ...p }; // Clone the particle
                        
                        // Customize echo properties - shorter life for echoes
                        echoParticle.life = Math.floor(p.maxLife * feedbackAmount * 0.7); // Shorter life for echoes
                        echoParticle.maxLife = echoParticle.life;
                        echoParticle.isEcho = true;
                        echoParticle.echoCount = p.echoCount + 1;
                        echoParticle.sizeMultiplier = p.sizeMultiplier * feedbackAmount * 0.8; // Smaller
                        echoParticle.vx *= 0.7; // Slower
                        echoParticle.vy *= 0.7; // Slower
                        
                        // Add some variation to echo
                        echoParticle.hueShift = (p.hueShift || 0) + 5 * p.echoCount;
                        echoParticle.rotation = random(TWO_PI);
                        
                        track.triggerParticles.push(echoParticle);
                    }
                }
                
                // Remove expired particle
                track.triggerParticles.splice(i, 1);
            }
        }
        
        // Draw batched particles (much more efficient than drawing one by one)
        Object.values(particleBatches).forEach(batch => {
            // Set fill style once for the whole batch
            noStroke();
            
            // Apply glow effects
            if (batch.glow) {
                drawingContext.shadowBlur = 10 * batch.glowAmount * batch.glowFade;
                drawingContext.shadowColor = color(batch.hue, 100, 100, batch.alpha * 0.7);
            } else if (useEtherealGlow) {
                drawingContext.shadowBlur = 5;
                drawingContext.shadowColor = color(batch.hue, batch.saturation, 100, batch.alpha * 0.3);
            }
            
            fill(batch.hue, batch.saturation, batch.brightness, batch.alpha);
            
            // Draw all particles in the batch with the same style
            batch.particles.forEach(p => {
                if (batch.shape === 1) { // Square
                    rectMode(CENTER);
                    push();
                    translate(p.x, p.y);
                    rotate(p.rotation);
                    rect(0, 0, p.size, p.size);
                    pop();
                } else if (batch.shape === 2) { // Triangle
                    push();
                    translate(p.x, p.y);
                    rotate(p.rotation);
                    triangle(
                        0, -p.size/2,
                        -p.size/2, p.size/2,
                        p.size/2, p.size/2
                    );
                    pop();
                } else { // Circle
                    ellipse(p.x, p.y, p.size, p.size);
                    
                    // Add bloom effect for reverb
                    if (batch.bloom > 0 && !batch.isAmbient) {
                        const bloomFade = Math.pow(1 - p.ageRatio, 1.5);
                        drawingContext.globalAlpha = 0.15 * bloomFade;
                        ellipse(p.x, p.y, p.size * (1.8 + batch.bloom), p.size * (1.8 + batch.bloom));
                        drawingContext.globalAlpha = 1.0;
                    }
                }
            });
            
            // Reset shadow
            drawingContext.shadowBlur = 0;
        });
    });
}

// Draw the pendulum wave visualization
function drawPendulumWave(tracks) {
    // Get responsive sizes
    const responsive = calculateResponsiveSizes();
    const { centerX, centerY, particleSize } = responsive;
    
    // Pendulum anchor point
    const anchorX = width / 2;
    const anchorY = height * 0.05; // Position slightly below top
    const pendulumLengthBase = height * 0.4; // Use 40% of height
    const pendulumLengthStep = height * 0.06; // Scale step size with height
    const triggerX = width / 2;

    // Draw vertical trigger line
    stroke(100, 0, 80, 50);
    strokeWeight(2);
    line(triggerX, anchorY, triggerX, height * 0.9); // Don't go all the way to bottom

    let now = audioContext ? audioContext.currentTime : millis() / 1000;
    let tempo = window.globalTempo;
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
        const maxAngle = PI * 0.4; // Slightly wider angle for visibility
        const angle = sin(phase * TWO_PI) * maxAngle;

        // Pendulum bob position
        const x = anchorX + pendulumLength * sin(angle);
        const y = anchorY + pendulumLength * cos(angle);

        // Store trail
        if (!track.trail) track.trail = [];
        track.trail.push({x, y, t: now});
        if (track.trail.length > window.trailLength) track.trail.shift();

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
        const circleSize = particleSize * (1 + track.pulse);

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
        ellipse(anchorX, anchorY, particleSize * 0.8, particleSize * 0.8);

        // Draw and update trigger particles
        if (!track.triggerParticles) track.triggerParticles = [];
        for (let i = track.triggerParticles.length - 1; i >= 0; i--) {
            const p = track.triggerParticles[i];
            fill(hue(p.color), saturation(p.color), brightness(p.color), map(p.life, 0, particleLife, 0, 80));
            noStroke();
            ellipse(p.x, p.y, particleSize * 0.4, particleSize * 0.4);
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
            spawnTriggerParticles(track, triggerX, y, particleSize);
            track.patternIndex = (track.patternIndex + 1) % (track.notePattern ? track.notePattern.length : 1);
        }
        track.lastX = x;
    });
}

// Easing function for particle movement
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Spawn a particle for the pulse effect
function spawnParticle(track, speedMultiplier = 1.0, isClone = false) {
    console.log(`Spawning particle for track ${track.id}, speedMultiplier=${speedMultiplier.toFixed(2)}, isClone=${isClone}`);
    
    // For non-clones, just trigger a pulse effect for the orbiting circle
    if (!isClone) {
        track.pulse = pulseMax;
    }
    
    // Get the current visualization mode
    const currentMode = window.visualizationMode;
    let markerX, markerY, particleSize;
    
    // Calculate appropriate coordinates based on visualization mode
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Get responsive sizes for consistent particle sizing
    const sizes = calculateResponsiveSizes();
    particleSize = sizes.particleSize;
    
    if (currentMode === 'circular') {
        // For circular visualization
        const scaledMinRadius = sizes.minOrbitRadius;
        const scaledGap = sizes.orbitGap;
        const orbitRadius = scaledMinRadius + track.id * scaledGap;
        
        // Calculate the current beat time from audio context
        const now = audioContext ? audioContext.currentTime : millis() / 1000;
        let tempo = window.globalTempo * speedMultiplier; // Apply speed multiplier to tempo
        let mainCycleLengthInBeats = 16 * 4;
        let secondsPerMainBeat = 60.0 / tempo / 4;
        let mainCycleDuration = mainCycleLengthInBeats * secondsPerMainBeat;
        let cycleTime = now % mainCycleDuration;
        
        // Calculate position along the orbit based on rhythmValue and adjusted tempo
        const beatsInCycle = track.rhythmValue;
        // Calculate phase considering the speed multiplier
        const phase = ((cycleTime / mainCycleDuration) * beatsInCycle) % 1;
        const angle = -HALF_PI + phase * TWO_PI;
        
        // Position along the orbit
        markerX = centerX + orbitRadius * cos(angle);
        markerY = centerY + orbitRadius * sin(angle);
        
        console.log(`  Circular mode: phase=${phase.toFixed(2)}, angle=${angle.toFixed(2)}, position=(${markerX.toFixed(1)}, ${markerY.toFixed(1)})`);
    } 
    else if (currentMode === 'pendulum') {
        // For pendulum visualization
        const anchorX = width / 2;
        const anchorY = height * 0.05; // Near top
        const pendulumLengthBase = height * 0.4;
        const pendulumLengthStep = height * 0.06;
        const pendulumLength = pendulumLengthBase + track.id * pendulumLengthStep;
        
        // Calculate pendulum position with speed multiplier
        const now = audioContext ? audioContext.currentTime : millis() / 1000;
        let tempo = window.globalTempo * speedMultiplier;
        let mainCycleLengthInBeats = 16 * 4;
        let secondsPerMainBeat = 60.0 / tempo / 4;
        let mainCycleDuration = mainCycleLengthInBeats * secondsPerMainBeat;
        let cycleTime = now % mainCycleDuration;
        
        const beatsInCycle = track.rhythmValue;
        const period = mainCycleDuration / beatsInCycle;
        const phase = ((cycleTime / period) % 1);
        const maxAngle = PI * 0.4;
        const angle = sin(phase * TWO_PI) * maxAngle;
        
        // Pendulum position
        markerX = anchorX + pendulumLength * sin(angle);
        markerY = anchorY + pendulumLength * cos(angle);
        
        console.log(`  Pendulum mode: phase=${phase.toFixed(2)}, angle=${angle.toFixed(2)}, position=(${markerX.toFixed(1)}, ${markerY.toFixed(1)})`);
    }
    else if (currentMode === 'spiral') {
        // For spiral visualization
        const maxRadius = min(width, height) * 0.4;
        const spiralTurns = 3;
        
        // Calculate position on spiral with speed multiplier
        const now = audioContext ? audioContext.currentTime : millis() / 1000;
        let tempo = window.globalTempo * speedMultiplier;
        let secondsPerBeat = 60.0 / tempo;
        
        // Each track gets a different spiral with offset
        const trackOffset = TWO_PI * track.id / window.tracks.length;
        
        const rhythmValue = track.rhythmValue;
        const beatDuration = secondsPerBeat * 4 / rhythmValue; // Duration of one beat for this track
        const cycleDuration = beatDuration * spiralTurns * 2; // Time to complete spiral
        const cyclePosition = (now % cycleDuration) / cycleDuration;
        
        // Map cycle position to spiral position (angle and radius)
        const spiralAngle = cyclePosition * TWO_PI * spiralTurns + trackOffset;
        const spiralRadius = map(cyclePosition, 0, 1, 5, maxRadius);
        
        // Calculate position
        markerX = centerX + cos(spiralAngle) * spiralRadius;
        markerY = centerY + sin(spiralAngle) * spiralRadius;
        
        console.log(`  Spiral mode: angle=${spiralAngle.toFixed(2)}, radius=${spiralRadius.toFixed(1)}, position=(${markerX.toFixed(1)}, ${markerY.toFixed(1)})`);
    }
    else if (currentMode === 'gravity') {
        // For gravity visualization
        // Find the appropriate well for this track
        if (window.gravityWells && window.gravityWells.length > 0) {
            // Find wells associated with this track
            const trackWells = window.gravityWells.filter(well => well.trackIndex === track.id);
            
            if (trackWells.length > 0) {
                // Pick a random well from those associated with this track
                const well = trackWells[Math.floor(Math.random() * trackWells.length)];
                markerX = well.x;
                markerY = well.y;
                console.log(`  Gravity mode: using well for track ${track.id}, position=(${markerX.toFixed(1)}, ${markerY.toFixed(1)})`);
            } else {
                // Fallback to center if no wells found
                markerX = centerX;
                markerY = centerY;
                console.log(`  Gravity mode: no wells found for track ${track.id}, using center position`);
            }
        } else {
            // Fallback if no wells defined
            markerX = centerX;
            markerY = centerY;
            console.log(`  Gravity mode: no gravity wells defined, using center position`);
        }
    }
    
    // If we have valid coordinates, spawn trigger particles
    if (markerX !== undefined && markerY !== undefined) {
        // For clones, use modified colors and parameters
        let cloneColor = track.color;
        let cloneSize = particleSize;
        
        if (isClone) {
            // Make clone particles visually distinct by using a more dramatic color shift
            const originalColor = color(track.color);
            // Use a stronger hue shift for better visual distinction
            const hueShift = 30 * (1 - speedMultiplier) * 2; // More shift for slower clones
            
            // Create a more distinct color for clones
            cloneColor = color(
                (hue(originalColor) + hueShift) % 360,
                // Reduce saturation more for slower clones
                saturation(originalColor) * (0.7 + speedMultiplier * 0.2),
                // Make faster clones brighter
                brightness(originalColor) * (0.7 + speedMultiplier * 0.2)
            );
            
            // Adjust size - make slower clones smaller
            cloneSize = particleSize * (0.6 + speedMultiplier * 0.3);
            
            console.log(`  Created clone with hueShift=${hueShift.toFixed(1)}, size=${cloneSize.toFixed(1)}`);
        }
        
        // Pass isClone and speedMultiplier to spawnTriggerParticles
        spawnTriggerParticles(
            track, 
            markerX, 
            markerY, 
            cloneSize, 
            speedMultiplier, 
            isClone,
            cloneColor // Pass modified color for clones
        );
    } else {
        console.error(`  Error: Could not determine valid position for track ${track.id} in mode ${currentMode}`);
    }
}

// Spawn a burst of particles at a trigger point
function spawnTriggerParticles(track, markerX, markerY, particleSize, speedMultiplier = 1.0, isClone = false, cloneColor = null) {
    console.log(`Spawning trigger particles: track=${track.id}, position=(${markerX.toFixed(1)}, ${markerY.toFixed(1)}), speedMultiplier=${speedMultiplier.toFixed(2)}, isClone=${isClone}`);
    
    if (!track.triggerParticles) track.triggerParticles = [];
    
    // Get dynamic performance settings from app.js if available
    let perfInfo = { targetParticleCount: dynamicParticleLimit };
    if (window.getPerformanceInfo) {
        perfInfo = window.getPerformanceInfo();
    }
    
    // Use the most restrictive limit between dynamicParticleLimit and global target
    const effectiveParticleLimit = Math.min(dynamicParticleLimit, perfInfo.targetParticleCount || dynamicParticleLimit);
    
    // MEMORY MANAGEMENT: Limit maximum particles per track to prevent memory issues
    const maxParticlesPerTrack = Math.min(100, perfInfo.isLowPerformanceDevice ? 40 : 100);
    if (track.triggerParticles.length > maxParticlesPerTrack) {
        // Remove oldest particles if we exceed the limit
        track.triggerParticles.splice(0, track.triggerParticles.length - maxParticlesPerTrack + 10);
    }
    
    // Get the audio analyzer data if available
    const audioData = window.getAnalyzerData ? window.getAnalyzerData() : null;
    
    // Calculate number of particles based on sound parameters
    const reverbAmount = track.reverbAmount || 0.5;
    const filterQ = track.filterQ || 1;
    const filterCutoff = track.filterCutoff || 2000;
    
    // For clones, adjust particles based on clone speed
    // Use more particles for faster clones, fewer for slower ones
    const cloneParticleReduction = isClone ? 
        speedMultiplier * 0.7 : // Dynamic reduction based on speed
        1.0; // No reduction for main particles
    
    // More particles for higher reverb and resonance, but scale down for performance
    // Use the effective particle limit that considers both local and global performance metrics
    const particleCount = Math.min(
        effectiveParticleLimit, 
        Math.floor(effectiveParticleLimit * (0.7 + filterQ / 30 + reverbAmount * 0.5) * 0.8 * cloneParticleReduction)
    );
    
    // Extra performance scaling on low-performance devices
    const performanceScaling = perfInfo.isLowPerformanceDevice ? 0.6 : 
                              (perfInfo.fps && perfInfo.fps < 45) ? 0.7 : 1.0;
    
    // Randomize particle count for better performance and visual variety
    const randomizedParticleCount = Math.floor(particleCount * random(0.7, 1.0) * performanceScaling);
    
    console.log(`  Creating ${randomizedParticleCount} particles (clone reduction: ${cloneParticleReduction.toFixed(2)})`);
    
    // Calculate extended particle life based on reverb amount
    // Get exact reverb time from audio.js soundDuration data for precise timing
    const soundDuration = track.soundDuration || {};
    
    // Extract exact reverb time values from the sound parameters
    // Use exact times from audio system when available, otherwise estimate
    const exactReverbTime = soundDuration.reverbTime || (2.5 * reverbAmount);
    const exactAttackTime = soundDuration.attackTime || track.attack || 0.01;
    const exactDecayTime = soundDuration.decayTime || 0.1;
    
    // Most crucial: precise time when sound becomes inaudible (-60dB)
    const exactInaudibleTime = soundDuration.inaudibleTime || (exactAttackTime + exactDecayTime + exactReverbTime);
    
    // Convert the exact inaudible time to frames (assuming 60fps)
    // We want particles to fade to zero opacity exactly when the sound becomes inaudible
    const exactInaudibleFrames = Math.ceil(exactInaudibleTime * 60);
    
    // Base particle life now tied directly to when sound becomes inaudible
    let baseParticleLife = Math.min(
        Math.max(particleLife, exactInaudibleFrames),
        120 // Hard cap at 2 seconds (60fps * 2) to prevent memory issues
    );
    
    // Clone particle life adjustments
    if (isClone) {
        // Slower clones get longer life to create visual trails
        const lifeMultiplier = 1.0 + (1.0 - speedMultiplier) * 0.5;
        baseParticleLife = Math.min(baseParticleLife * lifeMultiplier, 150); // Still cap at 2.5 seconds max
        console.log(`  Clone particle life extended by factor: ${lifeMultiplier.toFixed(2)}`);
    }
    
    // Account for attack/sustain in visual duration, but keep it reasonable
    const attackSustainMod = Math.min(
        1 + ((track.attack || 0.01) + (track.sustain || 0.5)) * 3, // Less scaling (was *5)
        2.0 // Hard cap at 2x multiplier
    );
    
    // Get track color properties for manipulation
    const baseColor = cloneColor || track.color;
    const baseHue = hue(baseColor);
    const baseSat = saturation(baseColor);
    const baseBright = brightness(baseColor);
    
    // Special emission pattern for clones
    const emitAngleRange = isClone ? 
        PI * 0.7 : // Narrower angle for clones - more directional
        TWO_PI;    // Full 360 for main particles
    
    // Create main particle burst
    for (let i = 0; i < randomizedParticleCount; i++) {
        // Calculate particle direction - use more organic distribution
        let angle;
        
        if (isClone) {
            // Clone particles move more in a specific direction
            // Faster clones are more focused, slower clones spread more
            const focusAngle = -HALF_PI; // Default direction upward
            const spreadFactor = 1.0 - speedMultiplier * 0.5; // Slower = more spread
            
            // Random angle within the focused arc
            angle = focusAngle + random(-emitAngleRange/2, emitAngleRange/2) * spreadFactor;
        } else if (useReverseParticles && random() < reverseParticleRatio) {
            // Some particles flow in the reverse direction for complexity (only for main particles)
            angle = random(PI * 0.75, PI * 1.25); // Roughly back toward the center
        } else {
            // Normal outward particles, with more variation
            angle = random(TWO_PI);
        }
        
        // Vary speed based on filter cutoff and position in burst
        const positionInBurst = i / randomizedParticleCount;
        const filterMod = map(filterCutoff, 100, 5000, 0.6, 1.4);
        
        // Slower base speed for longer reverb times to keep particles on screen
        const speedFactor = map(reverbAmount, 0, 1, 1, 0.6);
        
        // Clone-specific speed adjustments
        let cloneSpeedMultiplier = 1.0;
        if (isClone) {
            // Make slower clones have more variance in their particle speeds
            const variance = (1.0 - speedMultiplier) * 0.5 + 0.5;
            cloneSpeedMultiplier = random(variance, 1.2);
        }
        
        // Speeds scaled down further to keep particles visible but not too slow
        const speedVariance = random(0.7, 1.3) * cloneSpeedMultiplier;
        // Increase base speed range and apply proper scaling to make particles move more prominently
        const speed = random(2.0, 3.5) * filterMod * speedVariance * speedFactor * (particleSize / 10);
        
        // Ensure minimum velocity is maintained - critical for visible outward movement
        const minSpeed = 0.5 * (particleSize / 10);
        
        // Apply the speed multiplier from clones to adjust particle speeds
        const finalSpeed = Math.max(speed, minSpeed) * speedMultiplier;
        
        // Color variations for ethereal feel
        let colorVariation = 0;
        if (useColorShift) {
            // More dramatic color variation for clones
            colorVariation = isClone ? 
                random(-40, 40) : // Wider range for clones
                random(-20, 20);  // Normal range for main particles
        }
        
        // Size variations for organic feel - more variation for clones
        const sizeVariation = isClone ? 
            random(0.5, 1.5) : // More varied sizes for clones
            random(0.7, 1.3);  // Less variance for main particles
        
        // Lifespan slightly varies between particles for natural look
        // More variance for clones
        const lifeVariance = isClone ? 
            random(0.8, 1.2) : // More variance for clones
            random(0.9, 1.1);  // Less variance for main particles
        
        // Create a more complex particle with animation properties
        const particle = {
            x: markerX,
            y: markerY,
            vx: cos(angle) * finalSpeed,
            vy: sin(angle) * finalSpeed,
            life: baseParticleLife * attackSustainMod * lifeVariance, // Varied life
            maxLife: baseParticleLife * attackSustainMod * lifeVariance,
            color: baseColor,
            hueShift: colorVariation,
            sizeMultiplier: sizeVariation,
            isEcho: false,
            echoCount: 0,
            isClone: isClone, // Flag if this is a clone particle
            speedMultiplier: speedMultiplier, // Store the speed multiplier for reference
            // Add animation properties
            rotation: random(TWO_PI), // Initial rotation
            rotationSpeed: isClone ? random(-0.08, 0.08) : random(-0.05, 0.05), // Faster rotation for clones
            pulsePhase: random(TWO_PI), // Phase of size pulsation
            pulseSpeed: isClone ? random(0.03, 0.12) : random(0.02, 0.1), // Faster pulsing for clones
            // Track the filter and reverb properties for visual effects
            filterQ: filterQ,
            filterCutoff: filterCutoff,
            reverbAmount: reverbAmount,
            // Waveform specific visual traits
            waveform: track.waveformBlend || 'sine',
            // Shimmer effect for high reverb amounts
            hasShimmer: reverbAmount > 0.7 && random() < (isClone ? 0.5 : 0.3), // More shimmer for clones
            shimmerIntensity: random(0.5, 1.0) * reverbAmount,
            shimmerFrequency: random(0.1, 0.3),
            // Initial and maximum speed for velocity control
            initialSpeed: finalSpeed,
            initialAngle: angle,
            // Store creation time for absolute age tracking
            creationTime: millis(),
            radialDirection: random(-1, 1),
            tangentialForce: random(-0.02, 0.02)
        };
        
        track.triggerParticles.push(particle);
    }
    
    // For high reverb, add additional ambient particles (only for main notes, not clones)
    // For clones with very slow speed, add some ambient particles to create a trail effect
    if ((reverbAmount > 0.6 && useEtherealGlow && !isClone) || 
        (isClone && speedMultiplier < 0.5)) {
        
        // Number of ambient particles scales with reverb, use randomization for performance
        // For slow clones, use fewer ambient particles
        const ambientMultiplier = isClone ? speedMultiplier * 0.3 : 0.3;
        const ambientCount = Math.floor(particleCount * reverbAmount * ambientMultiplier * random(0.7, 1.0));
        
        console.log(`  Adding ${ambientCount} ambient particles`);
        
        for (let i = 0; i < ambientCount; i++) {
            // Slower, more drifting ambient particles
            const angle = random(TWO_PI);
            
            // Ambient particles stay closer to the source for high reverb
            const distanceFactor = map(reverbAmount, 0.6, 1, 1, 0.6);
            const distance = random(10, 25) * distanceFactor * (particleSize / 10); // Reduced range from 10-30
            
            // Apply minimum speed to ambient particles too
            const ambientSpeed = random(0.3, 0.6) * (1 - reverbAmount * 0.5);
            const minAmbientSpeed = 0.2 * (particleSize / 10); 
            const finalAmbientSpeed = Math.max(ambientSpeed, minAmbientSpeed) * speedMultiplier;
            
            // Create ambient particle that starts at a distance from the trigger point
            const particle = {
                x: markerX + cos(angle) * distance * 0.4,
                y: markerY + sin(angle) * distance * 0.4,
                // Ensure ambient particles have enough velocity to be visible
                vx: cos(angle) * finalAmbientSpeed,
                vy: sin(angle) * finalAmbientSpeed,
                life: baseParticleLife * 1.2 * random(0.9, 1.1), // Reduced multiplier from 1.5 to 1.2
                maxLife: baseParticleLife * 1.2 * random(0.9, 1.1),
                color: baseColor,
                hueShift: random(-30, 30), // More color variation for ambient particles
                sizeMultiplier: random(0.4, 0.8), // Smaller ambient particles
                isEcho: false,
                echoCount: 0,
                isAmbient: true, // Flag as ambient particle for special rendering
                isClone: isClone, // Flag if this is a clone particle
                speedMultiplier: speedMultiplier, // Store the speed multiplier
                opacity: random(0.4, 0.7), // Lower opacity for ambient glow
                // Ambient-specific animation
                driftPhase: random(TWO_PI),
                driftFrequency: random(0.02, 0.05),
                // Track audio properties
                filterQ: filterQ,
                filterCutoff: filterCutoff,
                reverbAmount: reverbAmount,
                waveform: track.waveformBlend || 'sine',
                // Start already partially faded in
                fadeInState: random(0.2, 0.5),
                // Store creation time for absolute age tracking
                creationTime: millis(),
                initialSpeed: finalAmbientSpeed,
                initialAngle: angle,
                radialDirection: random(-1, 1),
                tangentialForce: random(-0.02, 0.02)
            };
            
            track.triggerParticles.push(particle);
        }
    }
}

// Draw a spiral pattern where each track follows a spiral path
function drawSpiralPatterns(tracks) {
    // Get responsive sizes
    const responsive = calculateResponsiveSizes();
    const { centerX, centerY, particleSize } = responsive;
    
    // Constants for spiral
    const spiralSpacing = height * 0.02;
    const maxRadius = min(width, height) * 0.4;
    const spiralTurns = 3; // Number of complete turns in spiral
    
    // Draw the background spiral guides (subtle)
    noFill();
    strokeWeight(1);
    
    let now = audioContext ? audioContext.currentTime : millis() / 1000;
    let tempo = window.globalTempo;
    let secondsPerBeat = 60.0 / tempo;
    
    tracks.forEach((track, idx) => {
        // Each track gets a different spiral with offset
        const trackOffset = TWO_PI * idx / tracks.length;
        // Use more subdued color that matches the original aesthetic
        const spiralColor = color(hue(track.color), saturation(track.color) * 0.5, brightness(track.color) * 0.6, 20);
        
        // Draw subtle spiral path
        stroke(spiralColor);
        beginShape();
        for (let i = 0; i <= 360 * spiralTurns; i += 5) {
            const angle = radians(i) + trackOffset;
            const spiralRadius = map(i, 0, 360 * spiralTurns, 5, maxRadius);
            const x = centerX + cos(angle) * spiralRadius;
            const y = centerY + sin(angle) * spiralRadius;
            vertex(x, y);
        }
        endShape();
        
        // Calculate current position on spiral based on time
        const rhythmValue = track.rhythmValue;
        const beatDuration = secondsPerBeat * 4 / rhythmValue; // Duration of one beat for this track
        const cycleDuration = beatDuration * spiralTurns * 2; // Time to complete spiral
        const cyclePosition = (now % cycleDuration) / cycleDuration;
        
        // Map cycle position to spiral position (angle and radius)
        const spiralAngle = cyclePosition * TWO_PI * spiralTurns + trackOffset;
        const spiralRadius = map(cyclePosition, 0, 1, 5, maxRadius);
        
        // Calculate position
        const x = centerX + cos(spiralAngle) * spiralRadius;
        const y = centerY + sin(spiralAngle) * spiralRadius;
        
        // Store trail
        if (!track.trail) track.trail = [];
        track.trail.push({x, y, t: now});
        const maxTrailLength = int(window.trailLength * (1 + track.reverbAmount * 0.5)); // Shorter trail extension
        if (track.trail.length > maxTrailLength) track.trail.shift();
        
        // Draw trail - with original aesthetic
        noFill();
        beginShape();
        for (let i = 0; i < track.trail.length; i++) {
            const p = track.trail[i];
            const alpha = map(i, 0, track.trail.length - 1, 0, 60);
            stroke(hue(track.color), saturation(track.color), brightness(track.color), alpha);
            vertex(p.x, p.y);
        }
        endShape();
        
        // Draw current position (playhead) - match original style
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = color(hue(track.color), saturation(track.color), 100, 80);
        fill(hue(track.color), saturation(track.color), brightness(track.color), 90);
        noStroke();
        
        // Check if a sound should trigger (for full revolutions or beat subdivisions)
        const prevAngle = track.lastAngle || 0;
        const fullRevolutions = floor(spiralAngle / TWO_PI);
        const prevRevolutions = floor(prevAngle / TWO_PI);
        
        // Pulse effects
        if (!track.pulse) track.pulse = 0;
        if (track.pulse > 0) {
            track.pulse -= 0.03;
            track.pulse = max(0, track.pulse);
        }
        
        // Calculate trigger points (when crossing specific angles)
        const anglePerBeat = TWO_PI / track.rhythmValue;
        const currentBeat = floor(spiralAngle / anglePerBeat);
        const prevBeat = floor(prevAngle / anglePerBeat);
        
        // Trigger sound when crossing beat boundaries
        if (currentBeat !== prevBeat) {
            let note = track.notePattern && track.notePattern.length > 0 ? 
                      track.notePattern[track.patternIndex % track.notePattern.length] : 
                      track.frequency;
            
            if (track.soundType === 'noise') {
                playNoise(track, audioContext.currentTime);
            } else {
                playTone(track, audioContext.currentTime, note);
            }
            
            track.pulse = pulseMax;
            spawnTriggerParticles(track, x, y, particleSize);
            track.patternIndex = (track.patternIndex + 1) % (track.notePattern ? track.notePattern.length : 1);
        }
        
        // Draw current position with pulse effect - match original aesthetic
        const circleSize = particleSize * (1 + track.pulse * 2);
        ellipse(x, y, circleSize, circleSize);
        drawingContext.shadowBlur = 0;
        
        // Draw and update trigger particles
        if (track.triggerParticles) {
            // Use the same particle rendering as the circular orbits for visual consistency
            // Process particles in reverse for removal
            for (let i = track.triggerParticles.length - 1; i >= 0; i--) {
                const p = track.triggerParticles[i];
                
                // Update particle positions and life
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                
                // Remove dead particles
                if (p.life <= 0) {
                    track.triggerParticles.splice(i, 1);
                    continue;
                }
                
                // Simplified spiral force effect
                if (p.radialDirection !== undefined) {
                    const particleAngle = atan2(p.y - centerY, p.x - centerX);
                    const radialForce = p.radialDirection * 0.1 * (1 - p.life / p.maxLife);
                    p.vx += cos(particleAngle) * radialForce;
                    p.vy += sin(particleAngle) * radialForce;
                    
                    if (p.tangentialForce !== undefined) {
                        p.vx += cos(particleAngle + HALF_PI) * p.tangentialForce;
                        p.vy += sin(particleAngle + HALF_PI) * p.tangentialForce;
                    }
                }
            }
        }
        
        // Store current angle for next frame
        track.lastAngle = spiralAngle;
    });
}

// Draw a gravity well visualization where particles orbit central points
function drawGravityWells(tracks) {
    // Get responsive sizes
    const responsive = calculateResponsiveSizes();
    const { centerX, centerY, particleSize } = responsive;
    
    // Constants for gravity wells
    const maxWells = min(tracks.length, 5); // Limit number of wells
    const wellRadius = min(width, height) * 0.02;
    
    // Use the original background color to maintain consistent aesthetic
    // background(20, 80, 10, 100); // Don't override the background
    
    let now = audioContext ? audioContext.currentTime : millis() / 1000;
    let tempo = window.globalTempo;
    let secondsPerBeat = 60.0 / tempo;
    
    // Create array of gravity wells if not yet created
    if (!window.gravityWells || window.gravityWells.length !== maxWells) {
        window.gravityWells = [];
        
        // Create wells in interesting positions
        for (let i = 0; i < maxWells; i++) {
            const angle = TWO_PI * i / maxWells;
            const distance = min(width, height) * 0.25; // Smaller wells layout
            
            window.gravityWells.push({
                x: centerX + cos(angle) * distance,
                y: centerY + sin(angle) * distance,
                strength: random(0.05, 0.15), // Gentler gravity
                radius: wellRadius * random(0.8, 1.2),
                orbitDistance: distance * 0.7,
                orbitalPeriod: random(4, 8) * secondsPerBeat,
                trackIndex: i % tracks.length,
                lastTrigger: 0
            });
        }
    }
    
    // First draw connections between wells (like constellation)
    strokeWeight(1);
    noFill();
    for (let i = 0; i < window.gravityWells.length; i++) {
        const well1 = window.gravityWells[i];
        const track = tracks[well1.trackIndex];
        for (let j = i + 1; j < window.gravityWells.length; j++) {
            const well2 = window.gravityWells[j];
            stroke(hue(track.color), saturation(track.color) * 0.3, brightness(track.color) * 0.4, 15);
            line(well1.x, well1.y, well2.x, well2.y);
        }
    }
    
    // Draw gravity field indicators
    window.gravityWells.forEach((well, idx) => {
        const track = tracks[well.trackIndex];
        noFill();
        for (let r = well.radius * 2; r < well.radius * 8; r += well.radius) {
            const alpha = map(r, well.radius * 2, well.radius * 8, 15, 2);
            stroke(hue(track.color), saturation(track.color) * 0.5, brightness(track.color) * 0.7, alpha);
            ellipse(well.x, well.y, r * 2, r * 2);
        }
    });
    
    // Update well positions slightly to create dynamic movement
    window.gravityWells.forEach((well, idx) => {
        const track = tracks[well.trackIndex];
        
        // Wells move in slow orbits around the center
        const wellTime = now / well.orbitalPeriod;
        well.x = centerX + cos(wellTime * TWO_PI) * well.orbitDistance;
        well.y = centerY + sin(wellTime * TWO_PI) * well.orbitDistance;
        
        // Check if this well should trigger a sound
        const beatDuration = secondsPerBeat * 4 / track.rhythmValue;
        if (now - well.lastTrigger > beatDuration) {
            // Trigger sound and particles
            let note = track.notePattern && track.notePattern.length > 0 ? 
                      track.notePattern[track.patternIndex % track.notePattern.length] : 
                      track.frequency;
            
            if (track.soundType === 'noise') {
                playNoise(track, audioContext.currentTime);
            } else {
                playTone(track, audioContext.currentTime, note);
            }
            
            // Add pulse effect to well
            well.pulse = pulseMax;
            
            // Spawn particles around well - fewer particles for better performance and aesthetics
            for (let i = 0; i < 5; i++) { // Fewer particles per beat
                spawnGravityParticle(track, well.x, well.y, particleSize, well);
            }
            
            // Update pattern index
            track.patternIndex = (track.patternIndex + 1) % (track.notePattern ? track.notePattern.length : 1);
            well.lastTrigger = now;
        }
        
        // Well pulse effect
        if (!well.pulse) well.pulse = 0;
        if (well.pulse > 0) {
            well.pulse -= 0.03;
            well.pulse = max(0, well.pulse);
        }
        
        // Draw well with original aesthetic
        const wellColor = color(
            hue(track.color), 
            saturation(track.color) * 0.8, 
            brightness(track.color) * 0.9, 
            70 + well.pulse * 20
        );
        
        // Draw glow
        drawingContext.shadowBlur = 15 + well.pulse * 5;
        drawingContext.shadowColor = color(hue(track.color), saturation(track.color), 90, 70);
        
        // Draw well body
        noStroke();
        fill(wellColor);
        ellipse(well.x, well.y, well.radius * (1 + well.pulse), well.radius * (1 + well.pulse));
        
        // Draw well center
        fill(hue(track.color), saturation(track.color), brightness(track.color), 90);
        ellipse(well.x, well.y, well.radius * 0.4, well.radius * 0.4);
        
        // Reset shadow
        drawingContext.shadowBlur = 0;
    });
    
    // Process particles with gravitational physics
    tracks.forEach(track => {
        if (!track.triggerParticles) return;
        
        // Process particles in reverse to allow safe removal
        for (let i = track.triggerParticles.length - 1; i >= 0; i--) {
            const p = track.triggerParticles[i];
            
            // Basic updates
            p.life--;
            if (p.life <= 0) {
                track.triggerParticles.splice(i, 1);
                continue;
            }
            
            // Age ratio for visual effects
            const ageRatio = 1 - (p.life / p.maxLife);
            
            // Apply gravity from all wells
            window.gravityWells.forEach(well => {
                const dx = well.x - p.x;
                const dy = well.y - p.y;
                const distSq = dx*dx + dy*dy;
                const dist = sqrt(distSq);
                
                if (dist < well.radius) {
                    // Inside well - possible absorption or reflection
                    if (random() < 0.05) {
                        // Small chance to be absorbed
                        track.triggerParticles.splice(i, 1);
                        return;
                    } else {
                        // Reflection/bounce with energy loss
                        const bounceAngle = atan2(dy, dx) + PI;
                        const speed = sqrt(p.vx*p.vx + p.vy*p.vy) * 0.7; // More energy loss
                        p.vx = cos(bounceAngle) * speed;
                        p.vy = sin(bounceAngle) * speed;
                    }
                } else {
                    // Apply gravitational force: F = G * m1 * m2 / r^2
                    // We simplify with G * m1 * m2 = well.strength
                    const force = well.strength / distSq;
                    const angle = atan2(dy, dx);
                    
                    // Add gravitational acceleration
                    p.vx += cos(angle) * force;
                    p.vy += sin(angle) * force;
                }
            });
            
            // Apply slight velocity damping for stability
            p.vx *= 0.98;
            p.vy *= 0.98;
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Boundary checks - particles disappear at edges instead of wrapping
            if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
                p.life = min(p.life, 10); // Fade out quickly if off screen
            }
            
            // Draw particle
            const particleAlpha = map(p.life, 0, p.maxLife, 0, 60);
            const speed = sqrt(p.vx*p.vx + p.vy*p.vy);
            
            // Visual style that matches the original aesthetic 
            noStroke();
            fill(hue(p.color), saturation(p.color), brightness(p.color), particleAlpha);
            
            // Simple ellipse for consistency with other visualizations
            const finalSize = particleSize * 0.3 * (1 - ageRatio * 0.3);
            ellipse(p.x, p.y, finalSize, finalSize);
            
            // Optional subtle trail for faster particles
            if (speed > 1.5) {
                const trailLength = min(speed * 2, 8);
                const trailAngle = atan2(p.vy, p.vx);
                
                // Draw a short trail behind faster particles
                fill(hue(p.color), saturation(p.color), brightness(p.color), particleAlpha * 0.5);
                const trailX = p.x - cos(trailAngle) * trailLength;
                const trailY = p.y - sin(trailAngle) * trailLength;
                ellipse(trailX, trailY, finalSize * 0.6, finalSize * 0.6);
            }
        }
    });
}

// Helper function to spawn individual gravity particles
function spawnGravityParticle(track, wellX, wellY, particleSize, well) {
    if (!track.triggerParticles) track.triggerParticles = [];
    
    // Sound parameter calculations
    const reverbAmount = track.reverbAmount || 0.5;
    const exactInaudibleTime = track.soundDuration?.inaudibleTime || (2 * reverbAmount);
    const particleLifeFrames = Math.ceil(exactInaudibleTime * 60);
    
    // Angle for initial position and velocity
    const angle = random(TWO_PI);
    const orbitRadius = well.radius * 1.2 + random(2, 10);
    const orbitDirection = random() > 0.5 ? 1 : -1;
    
    // Initial position around the well
    const x = wellX + cos(angle) * orbitRadius;
    const y = wellY + sin(angle) * orbitRadius;
    
    // Initial velocity perpendicular to radius (for orbit)
    const orbitalSpeed = sqrt(well.strength / orbitRadius) * 0.8 * orbitDirection;
    const vx = cos(angle + HALF_PI) * orbitalSpeed;
    const vy = sin(angle + HALF_PI) * orbitalSpeed;
    
    // Add some random variation
    const variation = random(0.8, 1.2);
    
    track.triggerParticles.push({
        x: x,
        y: y,
        vx: vx * variation,
        vy: vy * variation,
        color: track.color,
        life: particleLifeFrames,
        maxLife: particleLifeFrames,
        speed: orbitalSpeed,
        reverbAmount: reverbAmount,
        wellIndex: well.trackIndex,
        waveform: track.waveform || 'sine'
    });
}

export {
    drawCircularOrbits,
    drawPendulumWave,
    spawnTriggerParticles,
    easeInOutCubic,
    spawnParticle,
    calculateResponsiveSizes,
    drawSpiralPatterns,
    drawGravityWells,
    spawnGravityParticle
}; 