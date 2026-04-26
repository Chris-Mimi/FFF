import { useState, useRef, useCallback, useEffect } from 'react';

export type TimerMode = 'forTime' | 'amrap' | 'emom' | 'tabata' | 'intervals' | 'hold';
export type TimerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'finished';

export interface IntervalSpec {
  work: number;
  rest: number;
}

// Speech synthesis — unlock on first user gesture (iOS Safari)
let speechUnlocked = false;

function unlockSpeech() {
  if (speechUnlocked || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  window.speechSynthesis.speak(u);
  speechUnlocked = true;
}

export interface TimerConfig {
  duration: number;       // seconds (AMRAP)
  rounds: number;         // EMOM/Tabata
  interval: number;       // EMOM interval seconds
  workTime: number;       // Tabata work seconds
  restTime: number;       // Tabata rest seconds
  holdTarget: number;     // Hold target seconds
  holdBeepInterval: number; // Hold beep every N seconds
  intervals: IntervalSpec[]; // Intervals mode (variable work/rest per round)
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
  intervals: Array.from({ length: 12 }, () => ({ work: 50, rest: 10 })),
};

// Audio via pre-recorded WAV files — bypasses Web Audio API entirely
let audioUnlocked = false;
const audioElements: Record<string, HTMLAudioElement> = {};

function preloadAudio() {
  if (typeof window === 'undefined') return;
  const sounds: Record<string, string> = {
    countdown: '/sounds/countdown-beep.wav',
    go: '/sounds/go-beep.wav',
    complete: '/sounds/complete-beep.wav',
  };
  for (const [key, src] of Object.entries(sounds)) {
    if (!audioElements[key]) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioElements[key] = audio;
    }
  }
}

// Must be called on first user gesture (iOS Safari requirement)
function unlockAudio() {
  if (audioUnlocked) return;
  preloadAudio();
  for (const audio of Object.values(audioElements)) {
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
    }).catch(() => {
      // Will work on next gesture
    });
  }
  audioUnlocked = true;
}

function playAudio(key: string) {
  try {
    const audio = audioElements[key];
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 1;
    audio.play().catch(() => {});
  } catch {
    // Audio not available
  }
}

// Interval / phase change — 880Hz sustained tone
export function playShortBeep() {
  playAudio('go');
}

// Timer complete — 660Hz sustained tone
export function playLongBeep() {
  playAudio('complete');
}

// Countdown 3-2-1 tick — 1100Hz staccato
function playCountdownBeep() {
  playAudio('countdown');
}

// GO tone — 880Hz sustained
function playGoBeep() {
  playAudio('go');
}

export function useWorkoutTimer() {
  const [mode, setMode] = useState<TimerMode>('forTime');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  const [elapsed, setElapsed] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const speechEnabledRef = useRef(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const firedBeepsRef = useRef<Set<string>>(new Set());

  const toggleSpeech = useCallback(() => {
    setSpeechEnabled(prev => {
      speechEnabledRef.current = !prev;
      return !prev;
    });
  }, []);

  const speakText = useCallback((text: string) => {
    if (!speechEnabledRef.current) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.1;
      window.speechSynthesis.speak(u);
    } catch {
      // TTS not available
    }
  }, []);

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
      case 'intervals': return config.intervals.reduce((sum, iv) => sum + iv.work + iv.rest, 0);
      case 'hold': return config.holdTarget;
      default: return 0; // forTime has no limit
    }
  }, [mode, config]);

  const tick = useCallback(() => {
    const now = Date.now();
    const newElapsed = Math.floor((now - startTimeRef.current) / 1000);
    setElapsed(newElapsed);

    const total = getTotalDuration();
    let spokeThisTick = false;

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

    // Mode-specific beeps + round speech (higher priority than time announcements)
    if (mode === 'emom' && newElapsed > 0) {
      const roundNum = Math.floor(newElapsed / config.interval);
      if (newElapsed % config.interval === 0 && roundNum < config.rounds) {
        const key = `emom-${roundNum}`;
        if (!firedBeepsRef.current.has(key)) {
          firedBeepsRef.current.add(key);
          playShortBeep();
          const newRound = roundNum + 1;
          if (newRound === config.rounds) {
            speakText('Last round!');
          } else {
            speakText(`Round ${newRound}`);
          }
          spokeThisTick = true;
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
          const newRound = roundNum + 1;
          if (newRound === config.rounds) {
            speakText('Last round!');
          } else {
            speakText(`Round ${newRound}`);
          }
          spokeThisTick = true;
        }
      }
    }

    if (mode === 'intervals') {
      let t = 0;
      for (let i = 0; i < config.intervals.length; i++) {
        const { work, rest } = config.intervals[i];
        // work → rest transition
        if (rest > 0 && newElapsed === t + work) {
          const key = `intervals-rest-${i}`;
          if (!firedBeepsRef.current.has(key)) {
            firedBeepsRef.current.add(key);
            playShortBeep();
          }
        }
        // rest → next round work transition
        if (newElapsed === t + work + rest && i + 1 < config.intervals.length) {
          const key = `intervals-work-${i + 1}`;
          if (!firedBeepsRef.current.has(key)) {
            firedBeepsRef.current.add(key);
            playShortBeep();
            const newRound = i + 2;
            if (newRound === config.intervals.length) {
              speakText('Last round!');
            } else {
              speakText(`Round ${newRound}`);
            }
            spokeThisTick = true;
          }
        }
        t += work + rest;
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

    // Time remaining announcements (lower priority — skip if we just spoke a round)
    if (!spokeThisTick && total > 0 && newElapsed >= 3) {
      const remaining = total - newElapsed;
      if (remaining === 60 && !firedBeepsRef.current.has('speech-1min')) {
        firedBeepsRef.current.add('speech-1min');
        speakText('One minute remaining');
        spokeThisTick = true;
      }
      if (!spokeThisTick && remaining === 30 && !firedBeepsRef.current.has('speech-30s')) {
        firedBeepsRef.current.add('speech-30s');
        speakText('Thirty seconds');
      }
    }

    // Timer finished
    if (total > 0 && newElapsed >= total) {
      setElapsed(total);
      setStatus('finished');
      clearTimer();
      playLongBeep();
      speakText('Time!');
    }
  }, [mode, config, getTotalDuration, clearTimer, speakText]);

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
    // Unlock audio + speech on user gesture (iOS Safari requirement)
    unlockAudio();
    unlockSpeech();

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
        // Beep + speak on 3, 2, 1
        if (remaining > 0 && remaining <= 3) {
          playCountdownBeep();
          speakText(String(remaining));
        }
      }

      if (newRemaining <= 0) {
        clearCountdown();
        playGoBeep();
        speakText('Go!');
        startRunning();
      }
    }, 100);
  }, [startRunning, clearCountdown, speakText]);

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

  if (mode === 'intervals') {
    totalRounds = config.intervals.length;
    let t = 0;
    let found = false;
    for (let i = 0; i < config.intervals.length; i++) {
      const { work, rest } = config.intervals[i];
      if (elapsed < t + work) {
        currentRound = i + 1;
        isWorkPhase = true;
        phaseRemaining = (t + work) - elapsed;
        found = true;
        break;
      }
      if (elapsed < t + work + rest) {
        currentRound = i + 1;
        isWorkPhase = false;
        phaseRemaining = (t + work + rest) - elapsed;
        found = true;
        break;
      }
      t += work + rest;
    }
    if (!found || status === 'finished') {
      currentRound = totalRounds;
      isWorkPhase = false;
      phaseRemaining = 0;
    }
    if (status === 'idle' && totalRounds > 0) {
      // Show first round's work time on idle display
      currentRound = 1;
      isWorkPhase = true;
      phaseRemaining = config.intervals[0]?.work ?? 0;
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
    speechEnabled,
    toggleSpeech,
  };
}
