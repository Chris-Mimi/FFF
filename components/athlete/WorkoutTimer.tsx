'use client';

import { useWorkoutTimer, TimerMode } from '@/hooks/useWorkoutTimer';
import { Play, Pause, RotateCcw, Maximize2, X, Volume2, VolumeX, Save, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  { id: 'intervals', label: 'Intervals' },
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
      case 'intervals':
        return formatTime(state.phaseRemaining);
      case 'hold':
        return `${formatTime(state.elapsed)} / ${formatTime(config.holdTarget)}`;
    }
  })();

  // Color for timer display
  const displayColor = (() => {
    if (isFinished) return 'text-red-400';
    if ((state.mode === 'tabata' || state.mode === 'intervals') && isRunning) {
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

              {/* Round indicator (EMOM/Tabata/Intervals) */}
              {(state.mode === 'emom' || state.mode === 'tabata' || state.mode === 'intervals') && (
                <div className={`text-gray-400 mt-3 ${hideChrome ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl lg:text-3xl'}`}>
                  Round {state.currentRound} / {state.totalRounds}
                </div>
              )}

              {/* Phase indicator (Tabata/Intervals) */}
              {(state.mode === 'tabata' || state.mode === 'intervals') && (isRunning || isPaused) && (
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

              {/* Total elapsed (for EMOM/Tabata/Intervals secondary display) */}
              {(state.mode === 'emom' || state.mode === 'tabata' || state.mode === 'intervals') && !isIdle && (
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

                {state.mode === 'intervals' && (
                  <IntervalsEditor
                    intervals={config.intervals}
                    onChange={(intervals) => updateConfig({ intervals })}
                  />
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

type IntervalPreset = { name: string; intervals: Array<{ work: number; rest: number }> };

function IntervalsEditor({ intervals, onChange }: {
  intervals: Array<{ work: number; rest: number }>;
  onChange: (intervals: Array<{ work: number; rest: number }>) => void;
}) {
  const [fillRounds, setFillRounds] = useState(12);
  const [fillWork, setFillWork] = useState(50);
  const [fillRest, setFillRest] = useState(10);
  const [presets, setPresets] = useState<IntervalPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('timer_presets')
        .select('name, intervals')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (cancelled) return;
      setPresets((data || []) as IntervalPreset[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLoad = (name: string) => {
    setSelectedPreset(name);
    if (!name) return;
    const preset = presets.find(p => p.name === name);
    if (preset && preset.intervals.length > 0) {
      onChange(preset.intervals.map(iv => ({ work: iv.work, rest: iv.rest })));
    }
  };

  const handleSave = async () => {
    const name = window.prompt('Name this routine:', selectedPreset || '');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = presets.find(p => p.name === trimmed);
    if (existing && !window.confirm(`Overwrite "${trimmed}"?`)) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); alert('Not signed in.'); return; }
    const payload = {
      user_id: user.id,
      name: trimmed,
      intervals: intervals.map(iv => ({ work: iv.work, rest: iv.rest })),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('timer_presets')
      .upsert(payload, { onConflict: 'user_id,name' });
    setBusy(false);
    if (error) { alert(`Save failed: ${error.message}`); return; }
    const next = [
      ...presets.filter(p => p.name !== trimmed),
      { name: trimmed, intervals: payload.intervals },
    ].sort((a, b) => a.name.localeCompare(b.name));
    setPresets(next);
    setSelectedPreset(trimmed);
  };

  const handleDelete = async () => {
    if (!selectedPreset) return;
    if (!window.confirm(`Delete "${selectedPreset}"?`)) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase
      .from('timer_presets')
      .delete()
      .eq('user_id', user.id)
      .eq('name', selectedPreset);
    setBusy(false);
    if (error) { alert(`Delete failed: ${error.message}`); return; }
    setPresets(presets.filter(p => p.name !== selectedPreset));
    setSelectedPreset('');
  };

  const updateRow = (i: number, patch: Partial<{ work: number; rest: number }>) => {
    onChange(intervals.map((iv, idx) => (idx === i ? { ...iv, ...patch } : iv)));
  };
  const removeRow = (i: number) => {
    if (intervals.length <= 1) return;
    onChange(intervals.filter((_, idx) => idx !== i));
  };
  const addRow = () => {
    const last = intervals[intervals.length - 1];
    onChange([...intervals, { work: last?.work ?? 50, rest: last?.rest ?? 10 }]);
  };
  const duplicateLast = () => {
    const last = intervals[intervals.length - 1];
    if (!last) return;
    onChange([...intervals, { ...last }]);
  };
  const applyFill = () => {
    onChange(
      Array.from({ length: Math.max(1, fillRounds) }, () => ({
        work: Math.max(5, fillWork),
        rest: Math.max(0, fillRest),
      })),
    );
  };

  const totalSeconds = intervals.reduce((s, iv) => s + iv.work + iv.rest, 0);
  const totalMin = Math.floor(totalSeconds / 60);
  const totalSec = totalSeconds % 60;

  return (
    <div className="space-y-5">
      <div className="bg-gray-800/60 rounded-xl p-4">
        <div className="text-gray-300 text-sm md:text-base font-medium mb-3 text-center">
          Presets
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPreset}
            onChange={(e) => handleLoad(e.target.value)}
            className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-[#178da6]"
            aria-label="Load preset"
          >
            <option value="">— Load routine —</option>
            {presets.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={busy}
            className="px-3 py-2 rounded-lg bg-[#178da6] hover:bg-[#1a9db8] disabled:opacity-50 text-white transition flex items-center gap-1 text-sm font-medium"
            aria-label="Save current routine"
            title="Save current routine"
          >
            <Save size={16} />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedPreset || busy}
            className="p-2 rounded-lg bg-gray-700 hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-gray-700 text-white transition"
            aria-label="Delete selected preset"
            title="Delete selected preset"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="bg-gray-800/60 rounded-xl p-4">
        <div className="text-gray-300 text-sm md:text-base font-medium mb-3 text-center">
          Quick Fill — set all rounds
        </div>
        <div className="space-y-2">
          <QuickFillRow label="Rounds" value={fillRounds} onChange={setFillRounds} min={1} max={99} />
          <QuickFillRow label="Work" value={fillWork} onChange={setFillWork} suffix="sec" min={5} max={600} step={5} />
          <QuickFillRow label="Rest" value={fillRest} onChange={setFillRest} suffix="sec" min={0} max={600} step={5} />
        </div>
        <div className="flex justify-center mt-3">
          <button
            onClick={applyFill}
            className="px-6 py-2 rounded-lg bg-[#178da6] hover:bg-[#1a9db8] text-white font-semibold text-sm md:text-base transition"
          >
            Apply
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-gray-300 text-sm md:text-base font-medium">
            Rounds ({intervals.length})
          </span>
          <span className="text-gray-500 text-xs md:text-sm font-mono">
            Total {String(totalMin).padStart(2, '0')}:{String(totalSec).padStart(2, '0')}
          </span>
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {intervals.map((iv, i) => (
            <IntervalRow
              key={i}
              index={i}
              work={iv.work}
              rest={iv.rest}
              canDelete={intervals.length > 1}
              onChangeWork={(v) => updateRow(i, { work: v })}
              onChangeRest={(v) => updateRow(i, { rest: v })}
              onDelete={() => removeRow(i)}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={addRow}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition"
          >
            + Add round
          </button>
          <button
            onClick={duplicateLast}
            disabled={intervals.length === 0}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm font-medium transition"
          >
            Duplicate last
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickFillRow({ label, value, onChange, suffix, min, max, step = 1 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-gray-400 text-sm w-16 text-right">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="text-white font-mono text-base w-12 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
        {suffix && <span className="text-gray-500 text-xs w-8">{suffix}</span>}
      </div>
    </div>
  );
}

function IntervalRow({ index, work, rest, canDelete, onChangeWork, onChangeRest, onDelete }: {
  index: number;
  work: number;
  rest: number;
  canDelete: boolean;
  onChangeWork: (v: number) => void;
  onChangeRest: (v: number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1.5">
      <span className="text-gray-400 text-xs md:text-sm font-medium w-10 flex-shrink-0">
        Rd {index + 1}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-green-400 text-xs font-semibold w-3">W</span>
        <button
          onClick={() => onChangeWork(Math.max(5, work - 5))}
          className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition"
          aria-label="Decrease work"
        >
          −
        </button>
        <span className="text-white font-mono text-sm w-7 text-center">{work}</span>
        <button
          onClick={() => onChangeWork(Math.min(600, work + 5))}
          className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition"
          aria-label="Increase work"
        >
          +
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-red-400 text-xs font-semibold w-3">R</span>
        <button
          onClick={() => onChangeRest(Math.max(0, rest - 5))}
          className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition"
          aria-label="Decrease rest"
        >
          −
        </button>
        <span className="text-white font-mono text-sm w-7 text-center">{rest}</span>
        <button
          onClick={() => onChangeRest(Math.min(600, rest + 5))}
          className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold transition"
          aria-label="Increase rest"
        >
          +
        </button>
      </div>
      <button
        onClick={onDelete}
        disabled={!canDelete}
        className="ml-auto p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-gray-500 transition"
        aria-label="Delete round"
      >
        <X size={16} />
      </button>
    </div>
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
