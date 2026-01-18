# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands

### Prerequisites
- Node.js (see `README.md` for any updates)

### Install dependencies
```bash path=null start=null
npm install
```

### Run the app locally (Vite dev server)
Vite is configured to listen on port `3000` on all interfaces.
```bash path=null start=null
npm run dev
```

### Build for production
```bash path=null start=null
npm run build
```

### Preview the production build
```bash path=null start=null
npm run preview
```

### Tests and linting
There are currently no test or lint scripts defined in `package.json`. If you add a test runner (e.g. Vitest/Jest) or a linter/formatter, update this section with the relevant commands (including how to run a single test file).

### Environment variables
The `README.md` references a `GEMINI_API_KEY` in `.env.local`. As of this snapshot, that variable is not used in the TypeScript source; if you introduce calls to Gemini/AI Studio, prefer reading configuration from environment variables and update this section with any required keys.

## Project architecture

### High-level overview
This is a single-page React + TypeScript app, bundled with Vite, that runs entirely in the browser. Users upload an audio file, which is analyzed client-side using the Web Audio API and a basic signal-processing pipeline (YIN pitch detection plus energy-based beat tracking). The result is converted into piano notation and rendered as SVG sheet music using VexFlow.

Styling is handled primarily via Tailwind CSS classes loaded from the CDN in `index.html`, along with a small amount of inline CSS.

### Application entrypoints
- `index.html`
  - Loads Tailwind via CDN and configures an import map for the main libraries (`react`, `react-dom`, `lucide-react`, `vexflow`, `@google/genai`).
  - Mounts the React app into the `#root` element and loads `index.tsx` as the module entry.
- `index.tsx`
  - Bootstraps React, creates a root with `ReactDOM.createRoot`, and renders `<App />` inside `React.StrictMode`.

### UI composition and state flow
- `App.tsx`
  - Central orchestrator of UI state.
  - Uses `useFileUpload` and `useAudioTranscription` hooks to manage file validation, analysis progress, and view state.
  - Conditionally renders the main views based on `AppState` from `types.ts`:
    - `FileUploader` when idle.
    - `ProcessingView` while audio is being analyzed.
    - `ErrorView` on failure.
    - `ResultView` once transcription is ready.
  - Also renders higher-level layout elements: `Header` and `Footer`, and injects a small `@media print` stylesheet so that the music sheet can be printed/“Download PDF” via `window.print()`.

- `components/Header.tsx` / `components/Footer.tsx`
  - Static framing components (branding, navigation placeholders, footer links).

- `components/FileUploader.tsx`
  - Presents the drag-and-drop plus click-to-browse file picker.
  - Delegates validation to `useFileUpload` via the `onFileSelect` callback and displays any validation error message.

- `components/ProcessingView.tsx`
  - Displays the current file name and analysis progress, driven by an `AnalysisProgress` object (stage, percentage, message).
  - Progress is updated from the audio analysis pipeline via a callback.

- `components/ErrorView.tsx`
  - Simple error card with retry button that ultimately calls the reset logic in `useAudioTranscription`/`useFileUpload`.

- `components/ResultView.tsx`
  - Shows basic metadata (`title`, `artist`) from `TranscriptionData`.
  - Hosts the `MusicSheet` component.
  - Provides a `Download PDF` button that calls `window.print()`, relying on `@media print` rules in `App.tsx` to hide non-sheet UI.

- `components/MusicSheet.tsx`
  - Responsible for rendering the actual piano sheet using VexFlow.
  - On each render:
    - Clears the container, initializes a `Vex.Flow.Renderer` (SVG backend), and calculates total canvas width based on the number of measures.
    - For each measure, creates paired treble and bass staves, connects them with braces/connectors, and draws `StaveNote`s built from `Measure.trebleNotes` and `Measure.bassNotes`.
    - Uses simple voices and a `Vex.Flow.Formatter` to lay out notes within each measure.

### Hooks and state management
- `hooks/useFileUpload.ts`
  - Local UI state only: drag-active flag, error message, and last selected file name.
  - `validateAndSetFile` ensures the dropped/selected file is an audio MIME type; it sets the error message and file name accordingly and returns either the valid `File` or `null`.
  - `reset` clears all upload-related state.

- `hooks/useAudioTranscription.ts`
  - Wraps the entire audio analysis pipeline behind a simple interface.
  - Exposes:
    - `status: AppState` (IDLE, PROCESSING, VIEWING, ERROR).
    - `data: TranscriptionData | null` (final transcription result).
    - `progress: AnalysisProgress` (stage, percentage, and textual message for the UI).
    - `transcribe(file)` to kick off analysis via `transcribeAudio` from `services/audioAnalyzer`.
    - `reset()` to return to the idle state.
  - Internally, it maps numeric progress values (0–100) from the analysis pipeline into coarse stages (`loading`, `decoding`, `analyzing`, `transcribing`) for display in `ProcessingView`.

### Domain types and constants
- `types.ts`
  - Defines the core domain model:
    - `Note`, `Measure`, and `TranscriptionData` used throughout the UI and audio services.
    - `DetectedNote` used internally by the analysis pipeline (pitch/frequency/time/velocity).
    - `AppState` and `AnalysisProgress` for app-wide UI state.

- `constants/audio.ts`
  - Collects all audio-analysis-related constants in one place:
    - Pitch reference constants (A4 frequency and MIDI number, middle C MIDI, note names).
    - Analysis parameters (FFT size, hop size, YIN threshold, minimum note duration/velocity, BPM bounds, maximum measure count, etc.).
  - These values are consumed by the pitch detection, BPM estimation, and note-conversion modules.

### Audio analysis and transcription pipeline
- `services/audioAnalyzer.ts`
  - Facade module that re-exports functions from `services/audio/index.ts` so consumers can import everything from a single place (e.g. `transcribeAudio`, `decodeAudioFile`, `analyzeAudio`, helpers for pitch/BPM/note conversion).

- `services/audio/index.ts`
  - Implements the high-level pipeline:
    - `decodeAudioFile(file)`
      - Uses the Web Audio API (`AudioContext`) to decode the uploaded audio into an `AudioBuffer`.
    - `analyzeAudio(audioBuffer, onProgress?)`
      - Walks through the first channel of the audio buffer in overlapping frames (`FFT_SIZE`/`HOP_SIZE`).
      - For each frame, runs `detectPitchYIN` to find a dominant frequency, filters by min/max frequency, calculates RMS energy and maps it to a MIDI velocity.
      - Groups consecutive frames with similar pitch into `DetectedNote` objects, enforcing a minimum duration and velocity, and calls `onProgress` periodically.
    - `transcribeAudio(file, onProgress?)`
      - Calls `decodeAudioFile`.
      - Estimates tempo with `detectBPM(audioBuffer)`.
      - Runs `analyzeAudio` to get a sequence of `DetectedNote`s.
      - Converts notes to `Measure[]` with `notesToMeasures`, using the derived BPM and a fixed beats-per-measure.
      - Constructs a `TranscriptionData` object (title derived from file name, fixed artist label, BPM, time signature, and measures) and returns it.

- `services/audio/pitchDetection.ts`
  - Contains a basic implementation of the YIN pitch-detection algorithm, parameterized by `YIN_THRESHOLD`.
  - Also provides `calculateRMS`, shared by both pitch and BPM logic.

- `services/audio/bpmDetection.ts`
  - Implements simple BPM estimation:
    - Splits the audio into short windows.
    - Computes RMS energy per window.
    - Detects local peaks above a global energy threshold.
    - Derives average beat spacing from peak intervals, converts to BPM, and clamps between `MIN_BPM` and `MAX_BPM`.

- `services/audio/noteConversion.ts`
  - Handles all conversions from raw analysis output to musical notation:
    - Frequency ↔ MIDI note mapping.
    - MIDI → clef selection (treble vs bass) and VexFlow key strings.
    - Mapping note durations (in seconds) and BPM to VexFlow duration codes (`w`, `h`, `q`, `8`, `16`).
    - `notesToMeasures` groups notes into fixed-length measures, splits them into treble/bass parts, inserts full-measure rests for empty voices, and respects `MAX_MEASURES` to avoid excessively long scores.

### Tooling configuration
- `vite.config.ts`
  - Configures the dev server to run on port `3000` and bind to `0.0.0.0`.
  - Registers the React plugin and sets up a path alias `@` → project root.

- `tsconfig.json`
  - Uses `moduleResolution: "bundler"` and enables JSX via `"jsx": "react-jsx"`.
  - Defines the `@/*` TypeScript path alias to match the Vite alias.

If you add new modules that significantly change the audio pipeline or the way notation is rendered, update the relevant sections above so future agents understand the new data flow quickly.