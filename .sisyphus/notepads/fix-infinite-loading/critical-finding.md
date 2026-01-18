# Critical Finding - Model URL 404 Error

## Discovery
**Date**: 2026-01-18 03:06 UTC
**Issue**: Magenta model URL returns 404 Not Found

## Evidence
```bash
curl -I https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni/model.json

HTTP/1.1 404 Not Found
Content-Type: application/xml; charset=UTF-8
Date: Sun, 18 Jan 2026 03:06:24 GMT
```

## Root Cause
The Magenta Onsets and Frames model URL is no longer available at the expected location. This causes:
1. `model.initialize()` to hang indefinitely waiting for model download
2. Browser to freeze during the wait
3. Timeout (60s) to eventually trigger, but only after significant delay

## Impact
- **Severity**: CRITICAL - Application completely non-functional
- **User Experience**: Infinite loading on every file upload attempt
- **Workaround**: None currently available

## Solution Options

### Option 1: Use Alternative Magenta Model (RECOMMENDED)
- Check if other Magenta models are available
- Update MAGENTA_CHECKPOINT_URL to working endpoint
- Test with alternative model

### Option 2: Host Model Locally
- Download model files manually
- Host in `/public/models/` directory
- Update URL to local path
- Pros: Full control, no external dependency
- Cons: Large bundle size increase

### Option 3: Switch to Different Transcription Library
- Consider alternatives like Basic Pitch (already in legacy/)
- Evaluate other browser-compatible transcription libraries
- May require significant refactoring

## Next Steps
1. Search for working Magenta model URLs
2. Test alternative models
3. If no working URL found, revert to Basic Pitch or implement local hosting
