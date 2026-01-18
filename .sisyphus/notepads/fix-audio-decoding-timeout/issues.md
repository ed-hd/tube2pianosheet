# Issues and Blockers

## [2026-01-18] Web Worker Limitation with Magenta

**Problem**: Magenta's `transcribeFromAudioBuffer()` method uses `OfflineAudioContext` internally, which is not available in Web Workers.

**Error**: `Cannot use offline audio context in a web worker`

**Root Cause**: Web Workers don't have access to the Web Audio API's `OfflineAudioContext`. Magenta uses this for audio processing during transcription.

**Attempted Solutions**:
1. ✅ Move model initialization to Web Worker - SUCCESS (model loads without blocking)
2. ❌ Move transcription to Web Worker - FAILED (OfflineAudioContext not available)
3. ✅ Added process.hrtime polyfill for Web Worker - SUCCESS

**Current Status**: 
- Model initialization successfully runs in Web Worker (non-blocking)
- Transcription MUST run in main thread (Magenta limitation)
- UI state update fix working (progress screen appears immediately)

**Decision**: Accept that transcription runs in main thread. The main blocking issue was model initialization (30-60 seconds), which is now solved. Transcription itself is relatively fast (< 10 seconds for typical audio).

**Alternative Approaches Considered**:
- Use AudioWorklet instead of Web Worker - Still no OfflineAudioContext access
- Implement custom audio resampling in Worker - Too complex, reinventing Magenta's wheel
- Use different transcription library - Out of scope for this fix

**Recommendation**: 
- Keep current hybrid approach:
  - Model init in Web Worker ✅
  - Transcription in main thread (unavoidable)
  - Add progress updates during transcription to show activity
