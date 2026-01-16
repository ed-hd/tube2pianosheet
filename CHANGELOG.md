# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Refactored - 2024-XX-XX

#### UI Components Extracted from App.tsx
- `components/Header.tsx` - Logo and navigation
- `components/Footer.tsx` - Footer links
- `components/FileUploader.tsx` - Drag & drop file upload area
- `components/ProcessingView.tsx` - Loading spinner and progress display
- `components/ErrorView.tsx` - Error display with retry button
- `components/ResultView.tsx` - Sheet music result and download

**App.tsx reduced from 273 lines to 80 lines**

#### Custom Hooks Created
- `hooks/useFileUpload.ts` - File drag/drop/select logic, validation
- `hooks/useAudioTranscription.ts` - Audio analysis state management

#### Audio Analysis Modularized
Previous: `services/audioAnalyzer.ts` (312 lines, single file)

New structure:
```
services/audio/
├── index.ts           - Main exports, transcribeAudio, analyzeAudio
├── pitchDetection.ts  - YIN algorithm, RMS calculation
├── bpmDetection.ts    - Energy-based tempo detection
└── noteConversion.ts  - MIDI/frequency conversion, measure generation
```

#### Constants Centralized
- `constants/audio.ts` - All magic numbers moved here
  - Frequency constants (A4_FREQUENCY, MIN/MAX_FREQUENCY)
  - MIDI constants (A4_MIDI, MIDDLE_C_MIDI)
  - Analysis parameters (FFT_SIZE, HOP_SIZE, YIN_THRESHOLD)
  - BPM detection parameters
  - Measure generation parameters

#### Configuration Cleaned
- `vite.config.ts` - Removed unused Gemini API environment variable handling

### Changed
- Improved code organization following single responsibility principle
- Better separation of concerns between UI and business logic
- Easier testing of individual audio processing functions

---

## [1.0.0] - 2024-XX-XX

### Added
- Offline audio analysis using Web Audio API
- YIN pitch detection algorithm
- Energy-based BPM detection
- MP3/WAV/OGG file upload with drag & drop
- VexFlow-based sheet music rendering
- PDF download via browser print

### Removed
- Gemini AI dependency
- YouTube URL input (CORS limitations)
- Server-side processing requirement
