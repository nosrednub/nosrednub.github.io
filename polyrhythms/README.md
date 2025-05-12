# Polyrhythm Experiment

An interactive web application for experimenting with polyrhythms using WebAudio API and p5.js.

## Overview

This application allows you to create and explore polyrhythms visually and aurally. It provides multiple visualization modes and detailed control over each track's sound parameters.

## Features

- Multiple visualization modes (Circular Orbits, Pendulum Wave)
- Adjustable tempo and number of tracks
- Individual track parameters:
  - Custom rhythm/cycle rate
  - Sound type (sine, square, sawtooth, triangle, noise)
  - Frequency and note patterns
  - Visual color and appearance
  - Audio effects (reverb, delay, filter, panning)
- State persistence (settings are saved across page refreshes)

## Project Structure

The codebase follows a modular organization:

```
.
├── index.html             # Main HTML document
├── style.css              # CSS styles
├── js/                    # JavaScript modules
│   ├── app.js             # Main application entry point
│   ├── audio.js           # Audio processing and synthesis
│   ├── config.js          # Configuration constants
│   ├── scheduler.js       # Audio scheduling
│   ├── state.js           # State management and persistence
│   ├── ui.js              # UI controls and event handling
│   └── visualizations.js  # Visual rendering
└── [favicon and images]   # Static assets
```

## Module Descriptions

- **app.js**: The main application that ties all modules together and handles p5.js setup/draw cycles
- **audio.js**: WebAudio API implementation for synthesizing and playing sounds
- **config.js**: Configuration constants used throughout the application
- **scheduler.js**: Audio scheduling logic for timing the polyrhythmic patterns
- **state.js**: State management for persisting application state to localStorage
- **ui.js**: UI controls and event handling for the interface
- **visualizations.js**: Visualization rendering for different modes

## Running the Project

Requires a web server.  Python flexible-server works well:
python3 flexible-server.py

## Development

To modify the project:

1. Edit the modules in the `js/` directory for specific functionality
2. Update `index.html` for structural changes
3. Modify `style.css` for visual adjustments

## Dependencies

- [p5.js](https://p5js.org/) for drawing and animation
- WebAudio API (native browser API) for sound synthesis

## Browser Compatibility

This application requires a modern browser that supports:

- ES6 Modules
- WebAudio API
- Canvas
- LocalStorage

## License

MIT 