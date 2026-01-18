## [2026-01-18] Reverted to Basic Pitch Analyzer

### Decision
After discovering that all Magenta.js Onsets and Frames models return 404 (see `model-url-search.md`), we reverted to the Basic Pitch analyzer that was already implemented in the legacy folder.

### Changes Made

#### 1. Updated Main Export (`services/audioAnalyzer.ts`)
**Before:**
```typescript
// Use Magenta Onsets and Frames for high-quality polyphonic transcription
export { transcribeAudioWithMagenta as transcribeAudio } from './audio/magentaTranscriber';
```

**After:**
```typescript
// Use Basic Pitch for polyphonic transcription (Magenta models no longer available - 404)
export { transcribeAudioWithBasicPitch as transcribeAudio } from './audio/legacy/basicPitchAnalyzer';
```

#### 2. Fixed Import Paths (`services/audio/legacy/basicPitchAnalyzer.ts`)
**Before:**
```typescript
import { TranscriptionData, Measure, Note, Chord, DynamicMarking } from '../../types';
import { ... } from '../../constants/audio';
```

**After:**
```typescript
import { TranscriptionData, Measure, Note, Chord, DynamicMarking } from '../../../types';
import { ... } from '../../../constants/audio';
```

**Reason:** The `constants` directory is at project root, not inside `services/`.

### Build Verification
```bash
npm run build
# ✓ built in 15.50s
# Bundle size: 3.57 MB (gzipped: 1.18 MB)
```

### Why Basic Pitch?
1. **Already implemented** - Full implementation exists in `services/audio/legacy/basicPitchAnalyzer.ts`
2. **No external dependencies** - Uses Spotify's Basic Pitch model from unpkg CDN
3. **Fully client-side** - No server required
4. **Proven working** - Was used before Magenta integration
5. **No 404 risk** - Model hosted on unpkg.com (stable CDN)

### Trade-offs
- **Quality**: Basic Pitch is lower quality than Magenta Onsets and Frames
- **Accuracy**: May miss some notes or have timing inaccuracies
- **Polyphony**: Still supports polyphonic transcription, just less accurate

### Model URL
```typescript
const MODEL_URL = 'https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json';
```

This URL is stable and verified working (HTTP 200).

### Next Steps
- Test with browser upload to verify no infinite loading
- Verify progress updates work correctly
- Test with both `test-sample.mp3` and real audio files
