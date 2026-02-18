# Session 136 — Timer Audio Refactor

**Date:** 2026-02-18
**Model:** Opus 4.6
**Focus:** Fix intermittent audio distortion on mobile workout timer

## Problem

Session 135's workout timer had intermittent "digital crackle" distortion on mobile (not desktop). The distortion was not volume-dependent — occurred at half volume too.

## Approaches Tried (in order)

1. **Gain reduction (1.0 → 0.7) + DynamicsCompressorNode** — No change. Distortion not caused by clipping.
2. **Attack ramp (5ms fade-in)** — No change. Not an oscillator zero-crossing click.
3. **Pre-generated AudioBuffers** — Replaced on-the-fly oscillator creation with baked waveform buffers. No change.
4. **Removed compressor** — Suspected compressor gain pumping between consecutive sounds. No change.
5. **Silent keep-alive loop** — Looping silent buffer to keep audio hardware awake. Made it WORSE (every beep distorted).
6. **Single persistent oscillator** — Final architecture. One OscillatorNode + GainNode created on first tap, gain modulated to play/mute. Still intermittent distortion on mobile.

## Final Architecture

- Single `OscillatorNode` created once, never destroyed
- Single `GainNode` gates sound on/off via scheduled `linearRampToValueAtTime`
- `cancelScheduledValues` before each new sound
- Gain baked at 0.5 (reduced from original 1.0)
- No compressor, no buffer creation, no node churn

## Outcome

Distortion persists on mobile (Chris's device). Deferred to post-deploy — will monitor user reports. Desktop audio is clean.

## Files Modified (1)

- `hooks/useWorkoutTimer.ts` — Complete audio section rewrite (oscillator approach → persistent oscillator + gain gate)

## Lesson Learned

- Mobile Web Audio distortion can be device-specific and not reproducible programmatically
- Multiple `AudioBufferSourceNode` instances connected simultaneously can cause hardware contention on mobile
- Silent keep-alive buffers can interfere with actual audio playback on mobile
- When debugging intermittent mobile audio issues, get reproduction data from multiple devices before iterating
