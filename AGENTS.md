# AGENTS.md - Tube2Score Codebase Guide

This document provides essential information for AI coding agents operating in this repository.

## Project Overview

Tube2Score is a browser-based piano sheet music generator that analyzes audio files (MP3, WAV, OGG) and produces piano notation using VexFlow. All audio processing runs entirely client-side using Web Audio API.

**Tech Stack:**
- React 19 + TypeScript
- Vite 6 (bundler)
- VexFlow 5 (music notation rendering)
- Web Audio API (pitch detection, BPM analysis)

## Build & Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**No test framework is currently configured.** If tests are added, use Vitest (Vite-native).

## Project Structure

```
tube2pianosheet/
├── index.html          # Entry HTML
├── index.tsx           # React entry point
├── App.tsx             # Main application component
├── types.ts            # TypeScript interfaces and enums
├── components/
│   └── MusicSheet.tsx  # VexFlow sheet music renderer
├── services/
│   └── audioAnalyzer.ts # Audio analysis (YIN pitch detection, BPM)
├── vite.config.ts      # Vite configuration
└── tsconfig.json       # TypeScript configuration
```

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx (automatic runtime)
- Path alias: `@/*` maps to project root

### Import Order

1. React and React-related imports
2. Third-party libraries
3. Local components (from `./components/`)
4. Local services (from `./services/`)
5. Types (from `./types`)

```typescript
import React, { useState, useRef } from 'react';
import { Music, Upload } from 'lucide-react';
import MusicSheet from './components/MusicSheet';
import { transcribeAudio } from './services/audioAnalyzer';
import { AppState, TranscriptionData } from './types';
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `MusicSheet`, `App` |
| Functions | camelCase | `analyzeAudio`, `detectBPM` |
| Constants | UPPER_SNAKE_CASE | `A4_FREQUENCY`, `NOTE_NAMES` |
| Interfaces | PascalCase | `TranscriptionData`, `Note` |
| Enums | PascalCase | `AppState` |
| Files (components) | PascalCase.tsx | `MusicSheet.tsx` |
| Files (services) | camelCase.ts | `audioAnalyzer.ts` |

### Type Definitions

- Define interfaces in `types.ts` for shared types
- Use explicit return types for exported functions
- Prefer `interface` over `type` for object shapes
- Use union types for constrained strings: `'treble' | 'bass'`

```typescript
export interface Note {
  key: string;
  duration: string;
  clef: 'treble' | 'bass';
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  VIEWING = 'VIEWING',
  ERROR = 'ERROR'
}
```

### React Component Patterns

- Use functional components with `React.FC<Props>` typing
- Use hooks: `useState`, `useRef`, `useEffect`, `useCallback`
- Wrap event handlers in `useCallback` when passed to children
- Use refs for DOM element access (file inputs, canvas containers)

```typescript
const Component: React.FC<Props> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    // DOM manipulation
  }, [data]);

  return <div ref={containerRef} />;
};
```

### Error Handling

- Use try/catch for async operations
- Set error state and display user-friendly messages
- Log errors to console for debugging
- Never suppress errors silently

```typescript
try {
  const result = await transcribeAudio(file);
  setData(result);
} catch (err) {
  console.error(err);
  setError('Transcription failed. Please try a different file.');
  setStatus(AppState.ERROR);
}
```

### Styling

- Tailwind CSS classes (inline)
- Dark theme by default (bg-[#121216], text-white)
- Gradient accents (blue-500 to purple-600)
- Responsive: use `md:` prefix for desktop styles
- Print styles: use `.no-print` class for non-printable elements

### Audio Analysis (Domain-Specific)

The `audioAnalyzer.ts` service implements:

1. **YIN Algorithm** - Pitch detection from audio frames
2. **Energy-based BPM detection** - Peak detection in energy envelope
3. **MIDI conversion** - Frequency → MIDI note number → VexFlow notation

Key constants:
- A4_FREQUENCY = 440 Hz
- A4_MIDI = 69
- Frequency range: 65 Hz (C2) to 2093 Hz (C7)

VexFlow duration mapping:
- `w` = whole note (4 beats)
- `h` = half note (2 beats)
- `q` = quarter note (1 beat)
- `8` = eighth note (0.5 beats)
- `wr` = whole rest

### Comments Policy

- Avoid unnecessary comments; code should be self-documenting
- Required comments: complex algorithms (YIN), musical constants (Hz values)
- Use inline comments for unit/range clarification in types: `// 0-127`

## Critical Constraints

1. **No server-side processing** - All audio analysis runs in-browser
2. **No external API calls** - Fully offline capable
3. **No type suppressions** - Never use `as any`, `@ts-ignore`, `@ts-expect-error`
4. **Preserve VexFlow compatibility** - Note format must be `key/octave` (e.g., "c/4")

## Common Tasks

### Adding a new audio analysis feature
1. Add function to `services/audioAnalyzer.ts`
2. Update types in `types.ts` if new data structures needed
3. Integrate with `transcribeAudio()` pipeline

### Modifying sheet music rendering
1. Edit `components/MusicSheet.tsx`
2. VexFlow documentation: https://github.com/0xfe/vexflow

### Adding UI components
1. Create in `components/` directory
2. Import Lucide icons from `lucide-react`
3. Follow existing Tailwind patterns
