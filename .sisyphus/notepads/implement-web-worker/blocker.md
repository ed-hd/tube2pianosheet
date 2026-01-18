# Blocker: Web Worker Plan Obsolete

## Date
2026-01-18 04:02:00

## Issue
The `implement-web-worker` plan is based on Magenta model, but we've already switched to Basic Pitch in the previous task (fix-infinite-loading).

## Details

### What Happened
1. In `fix-infinite-loading` task, we discovered:
   - Magenta model URLs return 404 Not Found
   - Google removed the models from Cloud Storage
   - Project deprecated in favor of MT3 (Python-only)

2. Solution implemented:
   - Reverted to Basic Pitch analyzer
   - Changed `services/audioAnalyzer.ts` to export Basic Pitch
   - Build succeeds, browser test passes

### Why This Plan is Blocked
The current plan (`implement-web-worker.md`) contains:
- Task 1: Create `magentaWorker.ts` for Magenta model
- Task 2: Modify `magentaTranscriber.ts` to use worker
- All tasks reference Magenta-specific code

**Problem**: We no longer use Magenta. We use Basic Pitch.

## Options

### Option A: Skip This Plan (RECOMMENDED)
- Mark plan as obsolete
- Move to next plan: `improve-transcription-quality`
- Reason: Quality improvement is more urgent than worker optimization

### Option B: Rewrite Plan for Basic Pitch
- Create new plan: `implement-basic-pitch-worker.md`
- Adapt tasks for Basic Pitch model
- Time required: ~30 minutes planning + implementation

### Option C: Implement Worker for Basic Pitch Now
- Modify current plan on-the-fly
- Replace Magenta references with Basic Pitch
- Risk: May miss important differences

## Decision

**SKIP THIS PLAN** and proceed to `improve-transcription-quality`.

### Reasoning
1. **Urgency**: Transcription quality is poor (tempo 176 vs 68 BPM)
2. **Current State**: Basic Pitch works without worker (~45s processing)
3. **User Impact**: Quality > Performance at this stage
4. **Worker Benefit**: Marginal (Basic Pitch already completes in <1 min)

## Next Steps
1. Mark this plan as BLOCKED/OBSOLETE
2. Update boulder.json to skip to next plan
3. Start `improve-transcription-quality` work

## Notes
If Web Worker is needed later:
- Create new plan specifically for Basic Pitch
- Consider if 45s processing time justifies worker complexity
- Basic Pitch model is smaller than Magenta, less blocking
