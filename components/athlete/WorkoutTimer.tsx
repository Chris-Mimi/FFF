'use client';

import { useWorkoutTimer, TimerMode } from '@/hooks/useWorkoutTimer';
import { Play, Pause, RotateCcw, Maximize2, X, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const MODE_LABELS: { id: TimerMode; label: string }[] = [
  { id: 'forTime', label: 'For Time' },
  { id: 'amrap', label: 'AMRAP' },
  { id: 'emom', label: 'EMOM' },
  { id: 'tabata', label: 'Tabata' },
  { id: 'hold', label: 'Hold' },
];

export default function WorkoutTimer({ onClose }: { onClose?: () => void } = {}) {
  const { state, config, start, pause, resume, reset, changeMode, updateConfig, speechEnabled, toggleSpeech } = useWorkoutTimer();
  const [fullscreen, setFullscreen] = useState(false);
  const isIdle = state.status === 'idle';
  const isCountdown = state.status === 'countdown';
  const isRunning = state.status === 'running';
  const isPaused = state.status === 'paused';
  const isFinished = state.status === 'finished';
  const isActive = isRunning || isPaused || isCountdown;

  // Auto-fullscreen on mobile, or always when embedded (onClose provided)
  useEffect(() => {
    if (onClose || window.innerWidth < 768) {
      setFullscreen(true);
    }
  }, [onClose]);

  // Main display time
  const displayTime = (() => {
    switch (state.mode) {
      case 'forTime':
        return formatTime(state.elapsed);
      case 'amrap':
        return formatTime(state.remaining);
      case 'emom':
        return formatTime(state.phaseRemaining);
      case 'tabata':
        return formatTime(state.phaseRemaining);
      case 'hold':
        return `${formatTime(state.elapsed)} / ${formatTime(config.holdTarget)}`;
    }
  })();

  // Color for timer display
  const displayColor = (() => {
    if (isFinished) return 'text-red-400';
    if (state.mode === 'tabata' && isRunning) {
      return state.isWorkPhase ? 'text-green-400' : 'text-red-400';
    }
    if ((state.mode === 'amrap' || state.mode === 'emom') && state.remaining <= 3 && state.remaining > 0 && isRunning) {
      return 'text-yellow-400';
    }
    if (isRunning) return 'text-green-400';
    if (isPaused) return 'text-yellow-400';
    return 'text-white';
  })();

  // Hold mode progress percentage
  const holdProgress = state.mode === 'hold' && config.holdTarget > 0
    ? Math.min((state.elapsed / config.holdTarget) * 100, 100)
    : 0;

  // Hide chrome (mode chips, config) when active in fullscreen for max screen space
  const hideChrome = fullscreen && isActive;

  const containerClass = fullscreen
    ? 'fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6 overflow-auto'
    : 'relative bg-gray-900 rounded-2xl p-8 md:p-12 max-w-2xl mx-auto';

  return (
    <div className={containerClass}>
      {/* Fullscreen close / expand button */}
      {fullscreen ? (
        <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
          <button
            onClick={toggleSpeech}
            className={`p-2 rounded-lg transition ${speechEnabled ? 'bg-gray-800 hover:bg-gray-700 text-[#178da6]' : 'bg-gray-800 hover:bg-gray-700 text-gray-500'}`}
            aria-label={speechEnabled ? 'Disable voice' : 'Enable voice'}
            title={speechEnabled ? 'Voice on' : 'Voice off'}
          >
            {speechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={() => {
              setFullscreen(false);
              if (onClose) onClose();
            }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
            aria-label="Close timer"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            onClick={toggleSpeech}
            className={`p-2 rounded-lg transition ${speechEnabled ? 'bg-gray-800 hover:bg-gray-700 text-[#178da6]' : 'bg-gray-800 hover:bg-gray-700 text-gray-500'}`}
            aria-label={speechEnabled ? 'Disable voice' : 'Enable voice'}
            title={speechEnabled ? 'Voice on' : 'Voice off'}
          >
            {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setFullscreen(true)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
            aria-label="Fullscreen timer"
          >
            <Maximize2 size={18} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
              aria-label="Close timer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      <div className={fullscreen ? 'w-full max-w-xl lg:max-w-5xl' : 'relative'}>

        {/* Count-in overlay */}
        {isCountdown && (
          <div className="text-center">
            <div className="text-gray-500 text-sm uppercase tracking-widest mb-4">
              {MODE_LABELS.find(m => m.id === state.mode)?.label}
            </div>
            <div className={`text-[12rem] sm:text-[14rem] lg:text-[18rem] font-mono font-bold leading-none ${state.countdownRemaining <= 3 ? 'text-yellow-400' : 'text-white'}`}>
              {state.countdownRemaining}
            </div>
            <div className="text-gray-400 text-xl mt-4">Get ready...</div>
          </div>
        )}

        {/* Normal timer UI (hidden during countdown) */}
        {!isCountdown && (
          <>
            {/* Mode selector — hidden when active in fullscreen */}
            {!hideChrome && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {MODE_LABELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => changeMode(m.id)}
                    disabled={!isIdle && !isFinished}
                    className={`px-4 py-2 rounded-full text-sm md:text-base font-medium transition min-h-[40px] ${
                      state.mode === m.id
                        ? 'bg-[#178da6] text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Active mode label when chrome is hidden */}
            {hideChrome && (
              <div className="text-center mb-4">
                <span className="text-gray-500 text-sm uppercase tracking-widest">
                  {MODE_LABELS.find(m => m.id === state.mode)?.label}
                </span>
              </div>
            )}

            {/* Timer display */}
            <div className="text-center mb-6">
              <div className={`font-mono font-bold tracking-wider ${displayColor} ${
                state.mode === 'hold'
                  ? (hideChrome ? 'text-6xl sm:text-7xl md:text-8xl lg:text-[11rem]' : (fullscreen ? 'text-6xl sm:text-7xl md:text-8xl lg:text-[10rem]' : 'text-5xl md:text-7xl'))
                  : (hideChrome ? 'text-8xl sm:text-9xl md:text-[10rem] lg:text-[16rem]' : (fullscreen ? 'text-8xl sm:text-9xl md:text-[10rem] lg:text-[14rem]' : 'text-7xl md:text-9xl'))
              }`}>
                {displayTime}
              </div>

              {/* Round indicator (EMOM/Tabata) */}
              {(state.mode === 'emom' || state.mode === 'tabata') && (
                <div className={`text-gray-400 mt-3 ${hideChrome ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl lg:text-3xl'}`}>
                  Round {state.currentRound} / {state.totalRounds}
                </div>
              )}

              {/* Phase indicator (Tabata) */}
              {state.mode === 'tabata' && (isRunning || isPaused) && (
                <div className={`font-bold mt-2 ${hideChrome ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-2xl md:text-3xl lg:text-4xl'} ${state.isWorkPhase ? 'text-green-400' : 'text-red-400'}`}>
                  {state.isWorkPhase ? 'WORK' : 'REST'}
                </div>
              )}

              {/* Hold progress bar */}
              {state.mode === 'hold' && !isIdle && (
                <div className={`mt-4 mx-auto ${hideChrome ? 'max-w-md' : 'max-w-sm'}`}>
                  <div className={`bg-gray-700 rounded-full overflow-hidden ${hideChrome ? 'h-5' : 'h-4'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isFinished ? 'bg-green-500' : 'bg-[#178da6]'}`}
                      style={{ width: `${holdProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Total elapsed (for EMOM/Tabata secondary display) */}
              {(state.mode === 'emom' || state.mode === 'tabata') && !isIdle && (
                <div className="text-gray-500 text-base md:text-lg mt-2">
                  Total: {formatTime(state.elapsed)}
                </div>
              )}

              {/* Finished indicator */}
              {isFinished && (
                <div className="text-green-400 font-bold text-2xl md:text-3xl mt-3">
                  {state.mode === 'forTime' ? '' : 'TIME!'}
                </div>
              )}
            </div>

            {/* Config inputs (only when idle) */}
            {isIdle && (
              <div className="mb-8 space-y-4">
                {state.mode === 'amrap' && (
                  <ConfigInput
                    label="Duration"
                    value={config.duration / 60}
                    onChange={v => updateConfig({ duration: Math.max(1, v) * 60 })}
                    suffix="min"
                    min={1}
                    max={60}
                  />
                )}

                {state.mode === 'emom' && (
                  <>
                    <ConfigInput
                      label="Rounds"
                      value={config.rounds}
                      onChange={v => updateConfig({ rounds: Math.max(1, v) })}
                      min={1}
                      max={99}
                    />
                    <ConfigInput
                      label="Interval"
                      value={config.interval}
                      onChange={v => updateConfig({ interval: Math.max(10, v) })}
                      suffix="sec"
                      min={10}
                      max={300}
                      step={5}
                    />
                  </>
                )}

                {state.mode === 'tabata' && (
                  <>
                    <ConfigInput
                      label="Work"
                      value={config.workTime}
                      onChange={v => updateConfig({ workTime: Math.max(5, v) })}
                      suffix="sec"
                      min={5}
                      max={120}
                      step={5}
                    />
                    <ConfigInput
                      label="Rest"
                      value={config.restTime}
                      onChange={v => updateConfig({ restTime: Math.max(5, v) })}
                      suffix="sec"
                      min={5}
                      max={120}
                      step={5}
                    />
                    <ConfigInput
                      label="Rounds"
                      value={config.rounds}
                      onChange={v => updateConfig({ rounds: Math.max(1, v) })}
                      min={1}
                      max={99}
                    />
                  </>
                )}

                {state.mode === 'hold' && (
                  <>
                    <ConfigInput
                      label="Target"
                      value={config.holdTarget}
                      onChange={v => updateConfig({ holdTarget: Math.max(5, v) })}
                      suffix="sec"
                      min={5}
                      max={600}
                      step={5}
                    />
                    <ConfigInput
                      label="Beep every"
                      value={config.holdBeepInterval}
                      onChange={v => updateConfig({ holdBeepInterval: Math.max(0, v) })}
                      suffix="sec"
                      min={0}
                      max={120}
                      step={5}
                    />
                  </>
                )}

                {state.mode === 'forTime' && (
                  <p className="text-gray-500 text-sm md:text-base text-center">Count-up stopwatch — no config needed</p>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {isIdle && (
                <TimerButton onClick={start} color="green" icon={<Play size={28} />} label="Start" />
              )}
              {isRunning && (
                <TimerButton onClick={pause} color="yellow" icon={<Pause size={28} />} label="Pause" />
              )}
              {isPaused && (
                <>
                  <TimerButton onClick={resume} color="green" icon={<Play size={28} />} label="Resume" />
                  <TimerButton onClick={reset} color="gray" icon={<RotateCcw size={28} />} label="Reset" />
                </>
              )}
              {isFinished && (
                <TimerButton onClick={reset} color="gray" icon={<RotateCcw size={28} />} label="Reset" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function TimerButton({ onClick, color, icon, label }: {
  onClick: () => void;
  color: 'green' | 'yellow' | 'gray';
  icon: React.ReactNode;
  label: string;
}) {
  const colors = {
    green: 'bg-green-600 hover:bg-green-700 text-white',
    yellow: 'bg-yellow-500 hover:bg-yellow-600 text-gray-900',
    gray: 'bg-gray-600 hover:bg-gray-500 text-white',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg md:text-xl transition min-h-[56px] min-w-[56px] ${colors[color]}`}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ConfigInput({ label, value, onChange, suffix, min, max, step = 1 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 max-w-sm mx-auto">
      <label className="text-gray-400 text-sm md:text-base font-medium w-24 text-right">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-11 h-11 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="text-white font-mono text-lg md:text-xl w-14 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-11 h-11 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
        {suffix && <span className="text-gray-500 text-sm w-8">{suffix}</span>}
      </div>
    </div>
  );
}
