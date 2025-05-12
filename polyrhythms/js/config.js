// Configuration for the Polyrhythm Experiment app

// Animation and timing constants
const playheadYRatio = 0.8; // Where the "hit" line is
const emitterYRatio = 0.1; // Where particles originate
const particleBaseSize = 10;
const particleTravelTime = 4000; // ms for particle to travel from emitter to playhead (adjust with tempo)
const trailLength = 40; // Number of positions to keep for trails
const maxParticles = 24; // Increased from 16 for more density
const particleLife = 30; // frames
const pulseMax = 1.5; // How much the circle grows on pulse

// Enhanced visual effects
const particleReverbScaling = 5.0; // Increased for longer-lasting particles with reverb
const particleDelayRepeat = true; // Whether to create echo particles for delay
const particleEffectIntensity = 1.2; // Overall intensity of visual effects (increased)
const glowIntensity = 1.8; // Intensity of glow effects (increased)
const useDelayTrails = true; // Show trailing particles for delay effect

// New ethereal visual effects
const useBloom = true; // Add bloom effect to particles
const bloomIntensity = 0.8; // Bloom effect intensity
const useReverseParticles = true; // Add particles that flow in reverse for more complexity
const reverseParticleRatio = 0.25; // Portion of particles that flow in reverse
const useColorShift = true; // Subtle color shifting for ethereal feel
const colorShiftSpeed = 0.05; // How quickly colors shift
const useParticleGrowth = true; // Allow particles to grow/shrink over time
const useEtherealGlow = true; // Special glow effect for more ethereal feel
const etherealGlowIntensity = 1.2; // Intensity of ethereal glow

// Background and display settings
const defaultBackgroundColor = { h: 20, s: 80, b: 10, a: 100 }; // Default background color (HSB format)

// Circular orbit visualization parameters
const minOrbitRadius = 60; // Base radius, will be scaled
const orbitGap = 40; // Base gap, will be scaled
const anchorRadius = 10;

// Circular orbit scaling factors (percentage of smaller dimension)
const maxVisualizationSize = 0.85; // Use 85% of the smaller dimension
const orbitRadiusScaleFactor = 0.1; // minOrbitRadius = 10% of smaller dimension
const orbitGapScaleFactor = 0.06; // orbitGap = 6% of smaller dimension

// Audio scheduling constants
const lookahead = 25.0; // How frequently to call scheduling function (in ms)
const scheduleAheadTime = 0.1; // How far ahead to schedule audio (in s)

// Local storage key
const STORAGE_KEY = 'polyrhythmAppState';

// Default values
const defaultTempo = 60; // BPM
const minTempo = 1; // Minimum BPM
const maxTempo = 240; // Maximum BPM
const defaultVisualizationMode = 'circular';

export {
    playheadYRatio,
    emitterYRatio,
    particleBaseSize,
    particleTravelTime,
    trailLength,
    maxParticles,
    particleLife,
    pulseMax,
    minOrbitRadius,
    orbitGap,
    anchorRadius,
    maxVisualizationSize,
    orbitRadiusScaleFactor,
    orbitGapScaleFactor,
    lookahead,
    scheduleAheadTime,
    STORAGE_KEY,
    defaultTempo,
    minTempo,
    maxTempo,
    defaultVisualizationMode,
    defaultBackgroundColor,
    particleReverbScaling,
    particleDelayRepeat,
    particleEffectIntensity,
    glowIntensity,
    useDelayTrails,
    useBloom,
    bloomIntensity,
    useReverseParticles,
    reverseParticleRatio,
    useColorShift,
    colorShiftSpeed,
    useParticleGrowth,
    useEtherealGlow,
    etherealGlowIntensity
}; 
