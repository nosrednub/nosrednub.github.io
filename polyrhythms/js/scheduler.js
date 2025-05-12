// Audio scheduler for the Polyrhythm Experiment

import { lookahead, scheduleAheadTime } from './config.js';
import { playTone, playNoise, audioContext } from './audio.js';
import { spawnParticle } from './visualizations.js';

let currentBeat = 0; // A continuous counter for scheduling
let nextNoteTime = 0.0; // When the next note is due
let timerID;
let schedulerTracks = []; // Reference to the tracks for the scheduler
let isSchedulerRunning = false;

// Schedule audio events with lookahead
function scheduler(globalTempo) {
    if (!isSchedulerRunning) return;
    
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        advanceNote(globalTempo);
    }
    timerID = setTimeout(() => scheduler(globalTempo), lookahead);
}

// Advance to the next beat
function advanceNote(globalTempo) {
    // Calculate the duration of one "main beat" based on tempo
    // This is our finest resolution for scheduling.
    const secondsPerMainBeat = 60.0 / globalTempo / 4; // Assuming 4 subdivisions per beat (16th notes)
    
    // Schedule sound events for this beat
    scheduleBeat(currentBeat, nextNoteTime, schedulerTracks, spawnParticle);
    
    // Move to next beat
    nextNoteTime += secondsPerMainBeat;
    currentBeat++;
}

// Schedule a specific beat for all tracks
function scheduleBeat(beatNumber, time, tracks, spawnParticleCallback) {
    if (!tracks || tracks.length === 0) return;
    
    const mainCycleLengthInBeats = 16 * 4; // e.g., 4 bars of 4/4, where each beat is a 16th note

    tracks.forEach(track => {
        // How many "main beats" are there for each of this track's rhythmic beats?
        track.timePerBeatInCycle = mainCycleLengthInBeats / track.rhythmValue;

        if (beatNumber % Math.round(track.timePerBeatInCycle) === 0) {
            // Trigger sound for the main note
            if (track.soundType === 'noise') {
                playNoise(track, time);
            } else {
                playTone(track, time);
            }
            
            // Spawn the main particle
            if (spawnParticleCallback) {
                console.log(`Spawning main particle for track ${track.id}`);
                spawnParticleCallback(track, 1.0, false); // 1.0 = original speed, false = not a clone
            }
            
            // Handle clones if any
            const cloneCount = parseInt(track.cloneCount) || 0;
            
            if (cloneCount > 0) {
                console.log(`Creating ${cloneCount} clones for track ${track.id} with variance ${track.cloneSpeedVariance}`);
                const variance = parseFloat(track.cloneSpeedVariance) || 0.1;
                
                // For each clone, create a particle with a slightly different speed
                for (let i = 1; i <= cloneCount; i++) {
                    // Calculate speed multiplier for this clone
                    // Each clone gets progressively slower by the variance percentage
                    const speedMultiplier = Math.max(0.2, 1.0 - (i * variance));
                    
                    console.log(`  Clone ${i}: speed=${speedMultiplier.toFixed(2)}`);
                    
                    // Also play sound for clones, but slightly later
                    const cloneDelayTime = i * 0.05; // Small delay for each clone (50ms each)
                    if (track.soundType === 'noise') {
                        playNoise(track, time + cloneDelayTime, 0.7); // Lower volume for clones
                    } else {
                        playTone(track, time + cloneDelayTime, track.frequency, 0.7); // Lower volume for clones
                    }
                    
                    // Pass the speed multiplier to the callback so particles can be slowed down
                    if (spawnParticleCallback) {
                        // Pass true as the third argument to indicate this is a clone
                        spawnParticleCallback(track, speedMultiplier, true);
                    }
                }
            }
        }
    });
}

// Start the scheduler
function startScheduler(globalTempo, tracks = window.tracks) {
    console.log("Starting scheduler with tempo:", globalTempo, "and tracks:", tracks.length);
    
    // Stop any existing scheduler
    stopScheduler();
    
    // Store reference to tracks
    schedulerTracks = tracks;
    
    // Reset counters
    currentBeat = 0;
    nextNoteTime = audioContext.currentTime + 0.1; // Start scheduling shortly
    
    // Set the running flag
    isSchedulerRunning = true;
    
    // Start scheduling
    scheduler(globalTempo);
}

// Stop the scheduler
function stopScheduler() {
    console.log("Stopping scheduler");
    
    // Clear the flag first to prevent new schedules
    isSchedulerRunning = false;
    
    // Clear any pending timeout
    if (timerID) {
        clearTimeout(timerID);
        timerID = null;
    }
}

export {
    scheduler,
    advanceNote,
    scheduleBeat,
    startScheduler,
    stopScheduler,
    isSchedulerRunning
}; 