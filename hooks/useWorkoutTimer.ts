import { useState, useRef, useCallback, useEffect } from 'react';

export type TimerMode = 'forTime' | 'amrap' | 'emom' | 'tabata' | 'hold';
export type TimerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'finished';

export interface TimerConfig {
  duration: number;       // seconds (AMRAP)
  rounds: number;         // EMOM/Tabata
  interval: number;       // EMOM interval seconds
  workTime: number;       // Tabata work seconds
  restTime: number;       // Tabata rest seconds
  holdTarget: number;     // Hold target seconds
  holdBeepInterval: number; // Hold beep every N seconds
}

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  elapsed: number;
  remaining: number;
  currentRound: number;
  totalRounds: number;
  isWorkPhase: boolean;
  phaseRemaining: number;
  countdownRemaining: number; // 3-2-1 count-in for Hold
}

const DEFAULT_CONFIG: TimerConfig = {
  duration: 600,       // 10 min AMRAP
  rounds: 10,          // 10 rounds EMOM
  interval: 60,        // 60s EMOM interval
  workTime: 20,        // 20s Tabata work
  restTime: 10,        // 10s Tabata rest
  holdTarget: 30,      // 30s hold
  holdBeepInterval: 10, // beep every 10s
};

// Audio beep via Web Audio API
let audioCtx: AudioContext | null = null;

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Short staccato beep (fades immediately) — for countdown ticks
function playBeep(frequency: number, durationMs: number) {
  try {
    const ctx = ensureAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.value = 1.0;
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Audio not available — silent fail
  }
}

// Sustained tone — holds full volume, quick fade only at the very end to avoid click
function playTone(frequency: number, durationMs: number) {
  try {
    const ctx = ensureAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    const durSec = durationMs / 1000;
    const fadeTime = 0.05; // 50ms fade at end to avoid click
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.setValueAtTime(1.0, ctx.currentTime + durSec - fadeTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durSec);
    osc.start();
    osc.stop(ctx.currentTime + durSec);
  } catch {
    // Audio not available — silent fail
  }
}

// Interval / phase change — sustained 1s tone
export function playShortBeep() {
  playTone(880, 1000);
}

// Timer complete — sustained 1s tone
export function playLongBeep() {
  playTone(660, 1000);
}

// Countdown 3-2-1 tick — short staccato
function playCountdownBeep() {
  playBeep(1100, 500);
}

// GO tone — sustained 1s
function playGoBeep() {
  playTone(880, 1000);
}

export function useWorkoutTimer() {
  const [mode, setMode] = useState<TimerMode>('forTime');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  const [elapsed, setElapsed] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const firedBeepsRef = useRef<Set<string>>(new Set());

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      clearCountdown();
    };
  }, [clearTimer, clearCountdown]);

  const getTotalDuration = useCallback((): number => {
    switch (mode) {
      case 'amrap': return config.duration;
      case 'emom': return config.rounds * config.interval;
      case 'tabata': return config.rounds * (config.workTime + config.restTime);
      case 'hold': return config.holdTarget;
      default: return 0; // forTime has no limit
    }
  }, [mode, config]);

  const tick = useCallback(() => {
    const now = Date.now();
    const newElapsed = Math.floor((now - startTimeRef.current) / 1000);
    setElapsed(newElapsed);

    const total = getTotalDuration();

    // Countdown 3-2-1 beeps (for timed modes ending)
    if (total > 0) {
      const remaining = total - newElapsed;
      if (remaining >= 1 && remaining <= 3) {
        const key = `countdown-${remaining}`;
        if (!firedBeepsRef.current.has(key)) {
          firedBeepsRef.current.add(key);
          playCountdownBeep();
        }
      }
    }

    // Mode-specific beeps
    if (mode === 'emom' && newElapsed > 0) {
      const roundNum = Math.floor(newElapsed / config.interval);
      if (newElapsed % config.interval === 0 && roundNum < config.rounds) {
        const key = `emom-${roundNum}`;
        if (!firedBeepsRef.current.has(key)) {
          firedBeepsRef.current.add(key);
          playShortBeep();
        }
      }
    }

    if (mode === 'tabata') {
      const cycleLength = config.workTime + config.restTime;
      const posInCycle = newElapsed % cycleLength;
      const roundNum = Math.floor(newElapsed / cycleLength);
      if (posInCycle === config.workTime && roundNum < config.rounds) {
        const key = `tabata-rest-${roundNum}`;
        if (!firedBeepsRef.current.has(key)) {
          firedBeepsRef.current.add(key);
          playShortBeep();
        }
      }
      if (posInCycle === 0 && newElapsed > 0) {
        const key = `tabata-work-${roundNum}`;
        if (!firedBeepsRef.current.has(key)) {
          firedBeepsRef.current.add(key);
          playShortBeep();
        }
      }
    }

    if (mode === 'hold' && config.holdBeepInterval > 0 && newElapsed > 0) {
      if (newElapsed % config.holdBeepInterval === 0 && newElapsed < config.holdTarget) {
        const key = `hold-${newElapsed}`;
        if (!firedBeepsRef.current.has(key)) {
          firedBeepsRef.current.add(key);
          playShortBeep();
        }
      }
    }

    // Timer finished
    if (total > 0 && newElapsed >= total) {
      setElapsed(total);
      setStatus('finished');
      clearTimer();
      playLongBeep();
    }
  }, [mode, config, getTotalDuration, clearTimer]);

  // Start the actual running timer (called directly or after countdown)
  const startRunning = useCallback(() => {
    firedBeepsRef.current.clear();
    startTimeRef.current = Date.now();
    pausedElapsedRef.current = 0;
    setElapsed(0);
    setCountdownRemaining(0);
    setStatus('running');
    clearTimer();
    intervalRef.current = setInterval(tick, 200);
  }, [tick, clearTimer]);

  const start = useCallback(() => {
    // Initialize AudioContext on user gesture (iOS Safari requirement)
    ensureAudioContext();

    // All modes get a 5s countdown (beep on last 3)
    const countdownTotal = 5;
    setCountdownRemaining(countdownTotal);
    setStatus('countdown');

    let remaining = countdownTotal;
    clearCountdown();
    const countdownStartTime = Date.now();

    // Beep immediately if within last 3
    if (remaining <= 3) playCountdownBeep();

    countdownRef.current = setInterval(() => {
      const secondsElapsed = Math.floor((Date.now() - countdownStartTime) / 1000);
      const newRemaining = countdownTotal - secondsElapsed;

      if (newRemaining !== remaining && newRemaining >= 0) {
        remaining = newRemaining;
        setCountdownRemaining(remaining);
        // Beep on 3, 2, 1
        if (remaining > 0 && remaining <= 3) {
          playCountdownBeep();
        }
      }

      if (newRemaining <= 0) {
        clearCountdown();
        playGoBeep();
        startRunning();
      }
    }, 100);
  }, [mode, startRunning, clearCountdown]);

  const pause = useCallback(() => {
    pausedElapsedRef.current = elapsed;
    setStatus('paused');
    clearTimer();
  }, [elapsed, clearTimer]);

  const resume = useCallback(() => {
    startTimeRef.current = Date.now() - pausedElapsedRef.current * 1000;
    setStatus('running');
    clearTimer();
    intervalRef.current = setInterval(tick, 200);
  }, [tick, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    clearCountdown();
    setElapsed(0);
    setCountdownRemaining(0);
    setStatus('idle');
    pausedElapsedRef.current = 0;
    firedBeepsRef.current.clear();
  }, [clearTimer, clearCountdown]);

  const changeMode = useCallback((newMode: TimerMode) => {
    reset();
    setMode(newMode);
  }, [reset]);

  const updateConfig = useCallback((updates: Partial<TimerConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Derived state
  const total = getTotalDuration();
  const remaining = total > 0 ? Math.max(0, total - elapsed) : 0;

  let currentRound = 1;
  let totalRounds = 1;
  let isWorkPhase = true;
  let phaseRemaining = 0;

  if (mode === 'emom') {
    totalRounds = config.rounds;
    currentRound = Math.min(Math.floor(elapsed / config.interval) + 1, totalRounds);
    phaseRemaining = config.interval - (elapsed % config.interval);
    if (status === 'finished') {
      currentRound = totalRounds;
      phaseRemaining = 0;
    }
  }

  if (mode === 'tabata') {
    totalRounds = config.rounds;
    const cycleLength = config.workTime + config.restTime;
    const posInCycle = elapsed % cycleLength;
    currentRound = Math.min(Math.floor(elapsed / cycleLength) + 1, totalRounds);
    isWorkPhase = posInCycle < config.workTime;
    phaseRemaining = isWorkPhase
      ? config.workTime - posInCycle
      : cycleLength - posInCycle;
    if (status === 'finished') {
      currentRound = totalRounds;
      isWorkPhase = false;
      phaseRemaining = 0;
    }
  }

  const state: TimerState = {
    mode,
    status,
    elapsed,
    remaining,
    currentRound,
    totalRounds,
    isWorkPhase,
    phaseRemaining,
    countdownRemaining,
  };

  return {
    state,
    config,
    start,
    pause,
    resume,
    reset,
    changeMode,
    updateConfig,
  };
}
