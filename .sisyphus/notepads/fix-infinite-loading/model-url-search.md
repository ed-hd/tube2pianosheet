## [2026-01-18] Magenta.js Onsets and Frames Model URL Search

### Executive Summary
**RESULT**: NO WORKING URL FOUND. Magenta.js Onsets and Frames transcription models are no longer hosted/available.

### URLs Tested

| URL | HTTP Status | Notes |
|------|--------------|-------|
| `https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni/model.json` | 404 Not Found | Official URL from checkpoints.json |
| `https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni_q2/model.json` | 404 Not Found | Quantized version (30 MB) |
| `https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/checkpoints/transcription/onsets_frames_uni/model.json` | 404 Not Found | jsDelivr CDN mirror |
| `https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/checkpoints/transcription/onsets_frames_uni_q2/model.json` | 404 Not Found | jsDelivr CDN mirror (quantized) |

### Documentation Found

1. **Official Checkpoints Configuration**
   - File: `https://github.com/magenta/magenta-js/blob/master/music/checkpoints/checkpoints.json`
   - Lists two OnsetsAndFrames models:
     - `onsets_frames_uni` (60 MB) - unidirectional model
     - `onsets_frames_uni_q2` (30 MB) - quantized to 2-byte weights
   - All URLs in this file return 404

2. **Official Demo Code**
   - File: `https://github.com/magenta/magenta-js/blob/master/music/demos/transcription.ts`
   - Uses: `const CKPT_URL = '${CHECKPOINTS_DIR}/transcription/onsets_frames_uni';`
   - This confirms the same broken URL is in official code

3. **Deprecation Notice**
   - Source: https://github.com/magenta/magenta/blob/master/magenta/models/onsets_frames_transcription/README.md
   - Quote: "This repository is currently inactive and serves only as a supplement to papers mentioned below. **For our current transcription work, see [MT3 blog post] and [MT3 GitHub repository]**"
   - MT3 (Music Transformer 3) is the new transcription model
   - MT3 is Python-based, not JavaScript/TF.js

4. **Magenta Project Direction**
   - Last commit to onsets_frames_transcription: May 1, 2023 (commit 78661d8)
   - Magenta moved to MT3 (Multi-Task Multitrack Music Transcription) in 2021
   - MT3 Repo: https://github.com/magenta/mt3
   - MT3 is NOT available as a JavaScript/TF.js model

5. **Alternative Models Searched**
   - `onsets_frames_hvqvae` - No evidence this exists for JS
   - No working JavaScript transcription models found in current Magenta ecosystem

### Why This Causes Infinite Loading

The `model.initialize()` call in `services/audio/magentaTranscriber.ts` attempts to:
1. Fetch `model.json` from the checkpoint URL
2. This returns 404
3. TensorFlow.js waits indefinitely for the resource
4. Browser freezes waiting for model download
5. Timeout (60s) eventually triggers, but by then app is unusable

### Evidence of Model Removal

1. Both official GCS URLs return 404 with error: "The specified key does not exist"
2. No jsDelivr mirror exists for these models
3. No recent issues on GitHub discussing broken links
4. Official README explicitly marks Onsets and Frames as "currently inactive"
5. Magenta team has shifted focus to MT3 (Python-based)

### Recommended Solution

**USE FALLBACK: Revert to Basic Pitch analyzer**

The project already has a working fallback implementation:
- File: `services/audio/legacy/basicPitchAnalyzer.ts`
- Algorithm: Basic Pitch (YIN algorithm implementation)
- Advantages:
  - Fully client-side (no external dependencies)
  - Already implemented and tested
  - Works for piano transcription (lower quality but functional)
  - No network requests needed
  - No risk of future deprecation

### Alternatives Considered and Rejected

| Alternative | Status | Reason for Rejection |
|-------------|--------|---------------------|
| MT3 (Magenta) | ❌ Not available | Python-only, no JS/TF.js implementation |
| Hugging Face MT3 | ❌ Not suitable | Requires server-side inference, not browser-based |
| Custom hosting | ❌ Not feasible | Would require downloading model from archive (not available) |
| magenta-realtime (HF) | ❌ Not suitable | Different model architecture, requires conversion |

### Conclusion

**No working URL exists for Magenta.js Onsets and Frames transcription model.**

The models have been removed from Google Cloud Storage and the project has been deprecated in favor of MT3 (Python-based). Since MT3 is not available as a JavaScript model, there is no path forward to continue using Magenta for browser-based piano transcription.

**RECOMMENDATION**: Disable Magenta transcriber and use the Basic Pitch analyzer fallback.
