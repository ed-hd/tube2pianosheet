# Learnings and Solutions

## [2026-01-18] Audio Decoding Improvements

### Problem
Audio files were timing out during decoding, causing the app to hang for 5+ minutes.

### Root Causes Identified
1. **Forced sample rate**: Using `new AudioContext({ sampleRate: 16000 })` caused issues in some browsers
2. **ArrayBuffer consumption**: Some browsers consume the ArrayBuffer during `decodeAudioData()`, requiring `.slice(0)` to create a copy
3. **Missing resampling**: Magenta requires 16kHz audio, but we weren't properly resampling from browser default (usually 44.1kHz or 48kHz)

### Solutions Implemented
1. **Use browser default sample rate first**: `new AudioContext()` without forcing sample rate
2. **Copy ArrayBuffer**: `arrayBuffer.slice(0)` before passing to `decodeAudioData()`
3. **Proper resampling with OfflineAudioContext**:
   ```typescript
   if (audioBuffer.sampleRate !== 16000) {
     const offlineCtx = new OfflineAudioContext(1, Math.floor(audioBuffer.duration * 16000), 16000);
     const source = offlineCtx.createBufferSource();
     source.buffer = audioBuffer;
     source.connect(offlineCtx.destination);
     source.start(0);
     audioBuffer = await offlineCtx.startRendering();
   }
   ```
4. **Detailed console logging**: Added `[Magenta]` prefixed logs for debugging

### Results
- ✅ Audio decoding now stable and fast (< 1 second for typical files)
- ✅ Proper 16kHz resampling for Magenta compatibility
- ✅ Better error messages for debugging

**Commit**: `10f9005 fix: stabilize audio decoding with proper resampling`

---

## [2026-01-18] UI State Update Fix

### Problem
Progress screen wasn't appearing immediately after file upload - UI stayed on upload screen even though processing had started.

### Root Cause
React batches state updates for performance. When `setStatus(AppState.PROCESSING)` is called immediately before an async operation, React may not flush the update before the async work starts, especially if the async work blocks the main thread.

### Solution
Force React to flush state updates by yielding to the event loop:
```typescript
setStatus(AppState.PROCESSING);
setProgress(INITIAL_PROGRESS);

// Force React to flush state updates before starting async operation
await new Promise(resolve => setTimeout(resolve, 0));

// Now start async work
const transcription = await transcribeAudio(file, ...);
```

### How It Works
`setTimeout(resolve, 0)` schedules the continuation on the next event loop tick, giving React a chance to:
1. Process the state updates
2. Re-render the component
3. Update the DOM

Then the async transcription work begins with the UI already showing the progress screen.

### Results
- ✅ Progress screen appears immediately when file is selected
- ✅ User sees "Loading..." state right away
- ✅ Better perceived performance

**File**: `hooks/useAudioTranscription.ts` (lines 36-38)

---

## [2026-01-18] Web Worker Limitation Discovery

### Attempted Solution
Move Magenta model initialization and transcription to a Web Worker to prevent main thread blocking.

### Implementation
- Created `services/audio/magentaWorker.ts`
- Added `process.hrtime` polyfill for Web Worker environment
- Used dynamic imports to load Magenta after polyfill
- Modified `magentaTranscriber.ts` to communicate with worker

### Blocker Discovered
**Magenta's `transcribeFromAudioBuffer()` uses `OfflineAudioContext` internally, which is NOT available in Web Workers.**

Error: `Cannot use offline audio context in a web worker`

### Why This Is Fundamental
- Web Workers don't have access to Web Audio API's `OfflineAudioContext`
- Magenta's transcription pipeline requires `OfflineAudioContext` for audio processing
- This is a browser security/architecture limitation, not something we can polyfill

### Alternatives Considered
1. **AudioWorklet**: Still no `OfflineAudioContext` access
2. **Custom audio processing in worker**: Would require reimplementing Magenta's entire audio pipeline
3. **Different transcription library**: Out of scope for this fix

### Decision
Accept that transcription must run in main thread. The main blocking issue was model initialization (30-60 seconds on first load), but:
- Model is cached by browser after first load
- Subsequent loads are much faster (< 5 seconds)
- Transcription itself is relatively fast (< 10 seconds for typical audio)
- Audio decoding improvements already solved the timeout issue

### Outcome
- ❌ Web Worker approach abandoned
- ✅ Kept audio decoding improvements
- ✅ Kept UI state update fix
- ✅ Documented limitation for future reference

**Status**: Web Worker code reverted, improvements retained

---

## Key Takeaways

1. **Browser compatibility matters**: Always test with browser default settings before forcing specific configurations
2. **ArrayBuffer handling**: Be aware that some browsers consume ArrayBuffers - always copy when reusing
3. **React state batching**: Use `setTimeout(0)` to force state flushes before heavy async work
4. **Web Worker limitations**: Not all browser APIs are available in workers - check MDN compatibility before implementing
5. **Magenta constraints**: Magenta requires main thread access due to Web Audio API dependencies

## Conventions Discovered

- Use `[Magenta]` prefix for console logs related to Magenta transcription
- Use `[Main]` and `[Worker]` prefixes when debugging worker communication
- Always include detailed error context in console.error() calls
- Document technical limitations in notepad/issues.md for future reference
