'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/utils/date-utils';
import {
  getBenchmarkFrequency,
  getForgeBenchmarkFrequency,
  type BenchmarkOccurrence,
} from '@/utils/movement-analytics';
import { getExerciseRecencyPillColor, formatExerciseRecency } from '@/utils/exercise-recency';

// ============================================================================
// Planner → Benchmarks panel (S425). When + how often each Benchmark / Forge
// Benchmark was programmed, so overdue ones are easy to spot. Library items that
// were never programmed are listed too. Respects the Planner's Track / Session
// toggles; "in period" = the last N months up to today (N = Planner view length).
// Counting matches the Analysis page: one per unique workout (see getWorkoutKey).
// ============================================================================

type Kind = 'benchmarks' | 'forge';
type SortMode = 'stale' | 'most' | 'name';

interface Row {
  id: string;
  name: string;
  description: string | null;
  lastUsed: string | null;
  occurrences: BenchmarkOccurrence[];
}

interface PlannerBenchmarksProps {
  excludeSessionTypes: string[];
  viewMonths: number;
}

const OPEN_KEY = 'planner-benchmarks-open';

async function loadRows(kind: Kind, excludeSessionTypes: string[]): Promise<Row[]> {
  const table = kind === 'benchmarks' ? 'benchmark_workouts' : 'forge_benchmarks';
  const [libRes, freq] = await Promise.all([
    supabase.from(table).select('id, name, description'),
    kind === 'benchmarks'
      ? getBenchmarkFrequency({ excludeSessionTypes })
      : getForgeBenchmarkFrequency({ excludeSessionTypes }),
  ]);
  if (libRes.error) throw libRes.error;

  const rows = new Map<string, Row>();
  (libRes.data || []).forEach(b => rows.set(b.id, {
    id: b.id, name: b.name, description: b.description || null, lastUsed: null, occurrences: [],
  }));
  // Programmed items win; one deleted from the library still shows under its workout name.
  freq.forEach(f => rows.set(f.id, {
    id: f.id,
    name: rows.get(f.id)?.name || f.name,
    description: rows.get(f.id)?.description || null,
    lastUsed: f.lastUsed,
    occurrences: f.occurrences,
  }));
  return Array.from(rows.values());
}

export default function PlannerBenchmarks({ excludeSessionTypes, viewMonths }: PlannerBenchmarksProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('benchmarks');
  const [sortMode, setSortMode] = useState<SortMode>('stale');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [descId, setDescId] = useState<string | null>(null);
  const descRef = useRef<HTMLDivElement | null>(null);

  // Close the description popover on any outside click.
  useEffect(() => {
    if (!descId) return;
    const onDoc = (e: MouseEvent) => {
      if (descRef.current && !descRef.current.contains(e.target as Node)) setDescId(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [descId]);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(OPEN_KEY) === 'true');
    } catch { /* storage blocked — stay closed */ }
  }, []);

  const toggleOpen = () => {
    setOpen(prev => {
      const next = !prev;
      try { window.localStorage.setItem(OPEN_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Load only while open; reload when the tab or the Track/Session toggles change.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    loadRows(kind, excludeSessionTypes)
      .then(r => { if (!cancelled) setRows(r); })
      .catch(err => { console.error('Error loading benchmark frequency:', err); if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, kind, excludeSessionTypes]);

  const today = formatDate(new Date());
  const periodStart = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - viewMonths);
    return formatDate(d);
  }, [viewMonths]);

  const sorted = useMemo(() => {
    const withCounts = rows.map(r => ({
      ...r,
      periodCount: r.occurrences.filter(o => o.date >= periodStart && o.date <= today).length,
    }));
    return withCounts.sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name);
      if (sortMode === 'most') {
        return b.periodCount - a.periodCount
          || b.occurrences.length - a.occurrences.length
          || a.name.localeCompare(b.name);
      }
      // stale: never first, then oldest last-programmed
      if (!a.lastUsed && !b.lastUsed) return a.name.localeCompare(b.name);
      if (!a.lastUsed) return -1;
      if (!b.lastUsed) return 1;
      return a.lastUsed.localeCompare(b.lastUsed) || a.name.localeCompare(b.name);
    });
  }, [rows, sortMode, periodStart, today]);

  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const toggleBtn = (active: boolean, first: boolean) =>
    `px-3 py-1 text-xs font-medium transition ${first ? '' : 'border-l border-gray-200'} ${
      active ? 'bg-[#178da6] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <div className='border border-gray-200 rounded-lg bg-white'>
      <button
        onClick={toggleOpen}
        className='w-full flex items-center justify-between p-3 md:p-4 hover:bg-gray-50 transition'
      >
        <div className='flex items-center gap-2'>
          {open ? <ChevronDown size={16} className='text-gray-500' /> : <ChevronRight size={16} className='text-gray-500' />}
          <h3 className='text-sm md:text-base font-semibold text-gray-800'>Benchmarks</h3>
          <span className='text-xs text-gray-500 hidden sm:inline'>when + how often each was programmed</span>
        </div>
      </button>

      {open && (
        <div className='border-t border-gray-200 p-3 md:p-4 space-y-3'>
          <div className='flex items-center gap-3 flex-wrap'>
            <div className='flex rounded-lg border border-gray-200 overflow-hidden'>
              <button onClick={() => { setKind('benchmarks'); setExpandedId(null); }} className={toggleBtn(kind === 'benchmarks', true)}>
                Benchmarks
              </button>
              <button onClick={() => { setKind('forge'); setExpandedId(null); }} className={toggleBtn(kind === 'forge', false)}>
                Forge Benchmarks
              </button>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-medium text-gray-500'>Sort:</span>
              <div className='flex rounded-lg border border-gray-200 overflow-hidden'>
                {([['stale', 'Stalest first'], ['most', 'Most used'], ['name', 'A–Z']] as const).map(([val, label], i) => (
                  <button key={val} onClick={() => setSortMode(val)} className={toggleBtn(sortMode === val, i === 0)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <p className='text-xs text-gray-500'>Loading…</p>
          ) : sorted.length === 0 ? (
            <p className='text-xs text-gray-500'>None found.</p>
          ) : (
            <div /* no overflow-x-auto — it would clip the description popover */>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='text-left text-gray-500 border-b border-gray-200'>
                    <th className='py-1.5 pr-2 font-medium'>Name</th>
                    <th className='py-1.5 px-2 font-medium whitespace-nowrap'>Last programmed</th>
                    <th className='py-1.5 px-2 font-medium text-right whitespace-nowrap'>Last {viewMonths} mo</th>
                    <th className='py-1.5 pl-2 font-medium text-right'>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const isOpen = expandedId === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          onClick={() => r.occurrences.length > 0 && setExpandedId(isOpen ? null : r.id)}
                          className={`border-b border-gray-100 ${r.occurrences.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                        >
                          <td className='py-1.5 pr-2'>
                            <div className='relative inline-block' ref={descId === r.id ? descRef : undefined}>
                              <button
                                type='button'
                                onClick={e => { e.stopPropagation(); setDescId(descId === r.id ? null : r.id); }}
                                className={`inline-block px-1.5 py-0.5 rounded border text-left ${getExerciseRecencyPillColor(r.lastUsed)}`}
                                title='Show description'
                              >
                                {r.name}
                              </button>
                              {descId === r.id && (
                                <div
                                  onClick={e => e.stopPropagation()}
                                  className='absolute left-0 top-full mt-1 z-30 w-72 max-w-[80vw] max-h-60 overflow-y-auto bg-gray-800 text-white text-[11px] leading-snug rounded px-2.5 py-2 shadow-lg whitespace-pre-wrap cursor-default'
                                >
                                  {r.description?.trim() || 'No description in the library.'}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className='py-1.5 px-2 text-gray-700 whitespace-nowrap' title={formatExerciseRecency(r.lastUsed)}>
                            {r.lastUsed ? fmt(r.lastUsed) : 'Never'}
                          </td>
                          <td className='py-1.5 px-2 text-right text-gray-700'>{r.periodCount}</td>
                          <td className='py-1.5 pl-2 text-right text-gray-700'>{r.occurrences.length}</td>
                        </tr>
                        {isOpen && (
                          <tr className='bg-gray-50 border-b border-gray-100'>
                            <td colSpan={4} className='py-2 px-3'>
                              <ul className='space-y-0.5'>
                                {r.occurrences.map(o => (
                                  <li key={`${o.date}-${o.workout_name}`} className='flex items-center gap-2 flex-wrap'>
                                    <Link href={`/coach?date=${o.date}`} className='text-[#178da6] hover:underline whitespace-nowrap'>
                                      {fmt(o.date)}
                                    </Link>
                                    <span className='text-gray-700'>{o.workout_name || '—'}</span>
                                    <span className='text-gray-400'>{o.session_type}</span>
                                    {o.date > today && <span className='text-amber-600'>upcoming</span>}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className='text-[10px] text-gray-400'>
            Click a name for its description; click elsewhere on the row for every date (a date opens that day in the calendar). A workout repeated within the same 2 weeks counts once.
          </p>
        </div>
      )}
    </div>
  );
}
