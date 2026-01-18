<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Tube2Score - AI Piano Sheet Music Generator

Browser-based piano transcription system that converts audio files (MP3, WAV, OGG) into professional piano sheet music. Powered by Google Magenta's Onsets and Frames AI model.

## Features

- **AI-Powered Transcription**: Uses Magenta Onsets and Frames model trained on MAESTRO piano dataset
- **Accurate Key Detection**: Krumhansl-Schmuckler algorithm supporting all 24 major/minor keys
- **Optimal Rhythm Quantization**: Viterbi algorithm for musically coherent note durations
- **Automatic Measure Validation**: Ensures all measures have exactly 4 beats (4/4 time)
- **Harmonic Voice Separation**: Intelligent treble/bass clef assignment based on harmonic analysis
- **100% Browser-Based**: No server required, all processing runs client-side
- **Offline Capable**: Model caching via IndexedDB for fast subsequent loads

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open browser at `http://localhost:3000`

4. Upload an audio file and generate sheet music!

## Build for Production

```bash
npm run build
npm run preview
```

## Testing

```bash
npm run test        # Run all tests
npm run test:ui     # Run tests with UI
npm run coverage    # Generate coverage report
```

## Technical Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **AI Model**: Magenta Onsets and Frames (TensorFlow.js)
- **Music Notation**: VexFlow 5
- **Audio Processing**: Web Audio API
- **Testing**: Vitest

## How It Works

1. **Audio Decoding**: Converts uploaded file to AudioBuffer (16kHz)
2. **AI Transcription**: Magenta model detects note onsets, pitches, and durations
3. **Key Detection**: FFT-based chromagram → Krumhansl-Schmuckler algorithm
4. **BPM Estimation**: Histogram-based onset interval analysis
5. **Rhythm Quantization**: Viterbi algorithm for optimal note duration assignment
6. **Voice Separation**: Harmonic analysis to assign notes to treble/bass clefs
7. **Measure Validation**: Ensures all measures have exactly 4 beats
8. **Sheet Music Rendering**: VexFlow generates professional notation

## Supported Features

- **Audio Formats**: MP3, WAV, OGG
- **Key Signatures**: All 24 major and minor keys
- **Time Signature**: 4/4 (common time)
- **Note Durations**: Whole, half, quarter, eighth, sixteenth (including dotted notes)
- **Clefs**: Treble and bass (grand staff)
- **Dynamics**: Velocity-based (pp, p, mp, mf, f, ff)
- **Articulations**: Ties, slurs

## Limitations

- 4/4 time signature only (no 3/4, 6/8, etc.)
- No triplet support
- Single key per piece (no modulation detection)
- Piano-optimized (not suitable for other instruments)

## Performance

- **First Load**: 2-5 seconds (model download ~20-50MB)
- **Subsequent Loads**: < 1 second (IndexedDB cache)
- **Processing Time**: ~0.5x audio duration (e.g., 30s audio → 15s processing)
- **Bundle Size**: 3.9MB (production build)

## Project Structure

```
tube2pianosheet/
├── services/
│   ├── audio/
│   │   ├── magentaTranscriber.ts    # Main transcription pipeline
│   │   ├── chromagram.ts            # FFT-based pitch class extraction
│   │   ├── keyDetection.ts          # Krumhansl-Schmuckler algorithm
│   │   ├── rhythmQuantizer.ts       # Viterbi quantization + validation
│   │   ├── voiceSeparation.ts       # Harmonic voice separation
│   │   └── legacy/                  # Preserved Basic Pitch code
│   └── audioAnalyzer.ts             # Main export
├── components/
│   └── MusicSheet.tsx               # VexFlow renderer
├── src/__tests__/                   # Vitest test suite
└── types.ts                         # TypeScript interfaces
```

## Development

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Functional React components
- TDD with Vitest

### Adding New Features

1. Write failing test first (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor while keeping tests green (REFACTOR)

### Running Tests

```bash
npm run test                    # Run all tests
npm run test -- chromagram      # Run specific test file
npm run test -- --coverage      # Generate coverage report
```

## License

MIT

## Acknowledgments

- **Magenta Team**: Onsets and Frames model
- **Spotify**: Basic Pitch (legacy)
- **VexFlow**: Music notation rendering
- **Krumhansl & Schmuckler**: Key detection algorithm
