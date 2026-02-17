# Workout Timer — Implementation Plan

## Overview
Add a built-in workout timer to the athlete page with AMRAP, EMOM, Tabata, and For Time presets. Client-side only, no DB changes.

## Architecture

### New Files (3)
1. **`hooks/useWorkoutTimer.ts`** — Timer state machine + logic
2. **`components/athlete/WorkoutTimer.tsx`** — Timer UI component
3. **`components/athlete/AthletePageTimerTab.tsx`** — Tab wrapper (consistent with other athlete tabs)

### Modified Files (1)
4. **`app/athlete/page.tsx`** — Add "Timer" tab to TabName type + tab navigation + import

## Timer Modes

| Mode | Behavior | Config |
|------|----------|--------|
| **For Time** | Count-up stopwatch | None (just start/stop) |
| **AMRAP** | Countdown from X minutes | Duration (minutes) |
| **EMOM** | Beep every 60s for X rounds | Rounds, interval (default 60s) |
| **Tabata** | Work/rest intervals | Work time (20s), rest time (10s), rounds (8) |

## Hook: `useWorkoutTimer.ts`

```typescript
interface TimerState {
  mode: 'forTime' | 'amrap' | 'emom' | 'tabata';
  status: 'idle' | 'running' | 'paused' | 'finished';
  elapsed: number;        // seconds elapsed
  remaining: number;      // seconds remaining (countdown modes)
  currentRound: number;   // current round (EMOM/Tabata)
  totalRounds: number;
  isWorkPhase: boolean;   // Tabata: work vs rest
  phaseRemaining: number; // seconds left in current phase (Tabata/EMOM)
}

// Returns: state + controls (start, pause, resume, reset, setMode, setConfig)
```

- Uses `useRef` for interval ID (not state, avoids stale closures)
- `requestAnimationFrame` or `setInterval(1000)` — 1s granularity is fine for CrossFit
- Cleanup on unmount

## Audio

- Web Audio API (`AudioContext`) for beeps — no external audio files needed
- Beep triggers: EMOM minute change, Tabata work/rest transition, countdown 3-2-1, timer end
- **iOS Safari fix:** Create `AudioContext` on first user tap (start button), not on mount
- Short beep = phase change, long beep = timer complete

## UI Layout

```
┌─────────────────────────────┐
│  [For Time] [AMRAP] [EMOM] [Tabata]  ← mode selector chips
├─────────────────────────────┤
│                             │
│         12:34               │  ← large mono display
│      Round 3 / 10           │  ← round indicator (EMOM/Tabata)
│        ● WORK               │  ← phase indicator (Tabata only)
│                             │
├─────────────────────────────┤
│  Config inputs (per mode)   │  ← duration/rounds/intervals
├─────────────────────────────┤
│  [▶ Start]  [⏸ Pause]  [↺ Reset]  ← controls (large touch targets)
└─────────────────────────────┘
```

- Dark background for visibility (gym screens)
- Large font for timer display (text-6xl+)
- Color coding: green = work/running, red = rest, yellow = 3-2-1 countdown
- Touch targets 48px+ for gym use with sweaty hands

## Tab Integration

- Add `'timer'` to `TabName` union type
- Add Timer icon (lucide `Timer` icon)
- Position after "Community" tab (fun/utility section)
- No auth required beyond being logged in (already on athlete page)

## Edge Cases
- Browser tab backgrounded: `setInterval` throttled. Use `Date.now()` delta on resume for accuracy
- Screen lock: same approach — calculate elapsed from start timestamp, not accumulated ticks
- Multiple timers: not needed — single timer instance

## Estimated Scope
- ~150 lines hook
- ~250 lines component
- ~20 lines tab wrapper
- ~10 lines page.tsx changes
- Total: ~430 lines across 4 files
