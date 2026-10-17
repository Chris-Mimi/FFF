'use client';

/**
 * Toolkit → Split Times (S421; internal name "pacing").
 *
 * Reference times for PARTS of workouts (a 400 m run, 30 Up-Downs…) so the
 * coach can see how long the fastest and slowest athletes need when writing a
 * for-time WOD. These are not best times — where in the workout a task sat
 * (start/end, 1st/last round) is recorded and shown as the dot colour.
 *
 * Tables: `pacing_tasks` + `pacing_scores` (coach-only RLS, migration
 * 20261018000000). Scores belong to members; `legacy_name` only exists for
 * ex-athletes imported from the old Aids note.
 */

import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { FocusTrap } from '@/components/ui/FocusTrap';
import { fetchAllExercises } from '@/utils/fetch-all-exercises';
import { formatDate } from '@/utils/date-utils';
import { Edit2, Search, Timer, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const CATEGORIES = ['Runs', 'Ergs', 'Bodyweight', 'Lunges & carries', 'Holds', 'Other'] as const;
type Position = 'start' | 'end' | 'first' | 'last' | null;

const POSITION_LABEL: Record<string, string> = { start: 'Start of WOD', end: 'End of WOD', first: '1st round', last: 'Last round' };
const isFresh = (p: Position) => p === 'start' || p === 'first';
const isTired = (p: Position) => p === 'end' || p === 'last';
const dotColor = (p: Position) => (isFresh(p) ? 'bg-teal-600' : isTired(p) ? 'bg-orange-600' : 'bg-slate-400');
const tagClass = (p: Position) => (isFresh(p) ? 'bg-teal-100 text-teal-800' : isTired(p) ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500');

interface PacingTask {
  id: string;
  exercise_id: string | null;
  movement: string;
  amount: string | null;
  amount_female: string | null;
  amount_male: string | null;
  category: string;
  note: string | null;
  created_at: string;
}

interface PacingScore {
  id: string;
  task_id: string;
  member_id: string | null;
  legacy_name: string | null;
  time_seconds: number;
  position: Position;
  scaling: string | null;
  score_date: string | null;
  note: string | null;
  created_at: string;
}

interface MemberLite {
  id: string;
  label: string;
  first: string;
  whiteboard: string | null;
  gender: 'M' | 'F' | null;
}

// ---------- helpers ----------

const fmtTime = (s: number) => {
  const r = Math.round(s);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
};

/** "2:18" → 138. Returns null unless it is m:ss with seconds < 60. */
const parseTime = (v: string): number | null => {
  const m = v.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** "14/10/26", "14.10.2026", "5/10/26" → "2026-10-14". */
const parseDeDate = (v: string): string | null => {
  const m = v.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};

const showDate = (iso: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}` : '–');

const taskTitle = (t: PacingTask) => {
  if (t.amount_female || t.amount_male) return `${t.movement} · ♀ ${t.amount_female ?? '–'} · ♂ ${t.amount_male ?? '–'}`;
  return t.amount ? `${t.movement} · ${t.amount}` : t.movement;
};

interface Summary { min: number; med: number; max: number; fastWho: string; slowWho: string }

function summarise(rows: { seconds: number; who: string }[]): Summary | null {
  if (!rows.length) return null;
  const s = [...rows].sort((a, b) => a.seconds - b.seconds);
  const v = s.map(r => r.seconds);
  const n = v.length;
  const med = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  const who = (x: number) => [...new Set(s.filter(r => r.seconds === x).map(r => r.who))].join(', ');
  return { min: v[0], med, max: v[n - 1], fastWho: who(v[0]), slowWho: who(v[n - 1]) };
}

async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order('created_at').range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

// ---------- component ----------

export default function PacingTab() {
  const router = useRouter();
  const [tasks, setTasks] = useState<PacingTask[]>([]);
  const [scores, setScores] = useState<PacingScore[]>([]);
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [library, setLibrary] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'az' | 'count' | 'recent'>('az');
  const [openTasks, setOpenTasks] = useState<Record<string, boolean>>({});

  const [helper, setHelper] = useState<{ id: string; n: number }[]>([]);
  const [transition, setTransition] = useState(10);
  // CrossFit programs the cap for the FASTEST athletes; everyone else scales or gets capped.
  const [margin, setMargin] = useState(10);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [taskModal, setTaskModal] = useState<{ editing: PacingTask | null } | null>(null);
  const [scoreModal, setScoreModal] = useState<{ taskId: string | null; editing: PacingScore | null } | null>(null);

  const load = async () => {
    try {
      const [t, s, m, ex] = await Promise.all([
        fetchAllRows<PacingTask>('pacing_tasks', '*'),
        fetchAllRows<PacingScore>('pacing_scores', '*'),
        fetchAllRows<{ id: string; name: string; display_name: string | null; whiteboard_name: string | null; gender: 'M' | 'F' | null; status: string }>(
          'members', 'id, name, display_name, whiteboard_name, gender, status, created_at'
        ),
        fetchAllExercises<{ id: string; name: string; display_name: string | null }>('id, name, display_name', 'name'),
      ]);
      setTasks(t);
      setScores(s);
      setMembers(
        m.filter(x => x.status !== 'blocked')
          .map(x => {
            const label = (x.display_name || x.name || '').trim();
            return { id: x.id, label, first: label.split(' ')[0] ?? '', whiteboard: x.whiteboard_name, gender: x.gender };
          })
          .filter(x => x.label)
          .sort((a, b) => a.label.localeCompare(b.label))
      );
      if (ex.error) throw ex.error;
      setLibrary((ex.data ?? []).map(e => ({ id: e.id, name: e.display_name || e.name })));
    } catch (err) {
      console.error('Pacing load failed', err);
      toast.error('Could not load split times');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const memberById = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const nameOf = (s: PacingScore) => (s.member_id ? memberById.get(s.member_id)?.label ?? 'Unknown member' : s.legacy_name ?? '–');
  const scoresByTask = useMemo(() => {
    const map = new Map<string, PacingScore[]>();
    for (const s of scores) map.set(s.task_id, [...(map.get(s.task_id) ?? []), s]);
    return map;
  }, [scores]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tasks.filter(t => {
      if (category !== 'All' && t.category !== category) return false;
      if (!q) return true;
      if (taskTitle(t).toLowerCase().includes(q)) return true;
      return (scoresByTask.get(t.id) ?? []).some(s => nameOf(s).toLowerCase().includes(q));
    });
    const latest = (t: PacingTask) => Math.max(new Date(t.created_at).getTime(), ...(scoresByTask.get(t.id) ?? []).map(s => new Date(s.created_at).getTime()));
    return list.sort(
      sort === 'count' ? (a, b) => (scoresByTask.get(b.id)?.length ?? 0) - (scoresByTask.get(a.id)?.length ?? 0)
        : sort === 'recent' ? (a, b) => latest(b) - latest(a)
          : (a, b) => taskTitle(a).localeCompare(taskTitle(b), undefined, { numeric: true })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, scoresByTask, category, query, sort, memberById]);

  const deleteTask = async (t: PacingTask) => {
    const n = scoresByTask.get(t.id)?.length ?? 0;
    if (!await confirm({ title: 'Delete task', message: `Delete "${taskTitle(t)}" and its ${n} score${n === 1 ? '' : 's'}?`, confirmText: 'Delete', variant: 'danger' })) return;
    const { error } = await supabase.from('pacing_tasks').delete().eq('id', t.id);
    if (error) { console.error(error); toast.error('Failed to delete task'); return; }
    setHelper(h => h.filter(x => x.id !== t.id));
    toast.success('Task deleted');
    load();
  };

  const deleteScore = async (s: PacingScore) => {
    if (!await confirm({ title: 'Delete score', message: `Delete ${nameOf(s)}'s ${fmtTime(s.time_seconds)}?`, confirmText: 'Delete', variant: 'danger' })) return;
    const { error } = await supabase.from('pacing_scores').delete().eq('id', s.id);
    if (error) { console.error(error); toast.error('Failed to delete score'); return; }
    toast.success('Score deleted');
    load();
  };

  const toggleHelper = (id: string) =>
    setHelper(h => (h.some(x => x.id === id) ? h.filter(x => x.id !== id) : [...h, { id, n: 1 }]));

  if (loading) return <div className='bg-white rounded-lg p-6 text-gray-600'>Loading split times…</div>;

  const helperPanel = (
    <HelperPanel
      tasks={tasks}
      scoresByTask={scoresByTask}
      helper={helper}
      setHelper={setHelper}
      transition={transition}
      margin={margin}
      setMargin={setMargin}
      setTransition={setTransition}
      onClose={() => setSheetOpen(false)}
    />
  );

  return (
    <div className='grid lg:grid-cols-[minmax(0,1fr)_330px] gap-4 items-start pb-20 lg:pb-0'>
      <section className='min-w-0'>
        {/* Toolbar */}
        <div className='bg-white rounded-lg p-3 mb-3 grid gap-2.5'>
          <div className='flex flex-wrap gap-2 items-center'>
            <div className='relative flex-1 min-w-[200px]'>
              <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Search movement or athlete…'
                className='w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm'
              />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className='px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white'>
              <option value='az'>A–Z</option>
              <option value='count'>Most scores</option>
              <option value='recent'>Recently added</option>
            </select>
            <button onClick={() => setTaskModal({ editing: null })} className='px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50'>
              + New task
            </button>
            <button
              onClick={() => setScoreModal({ taskId: null, editing: null })}
              disabled={!tasks.length}
              className='px-3 py-2 rounded-lg text-sm font-medium bg-[#178da6] text-white hover:brightness-95 disabled:opacity-50'
            >
              + Add scores
            </button>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {['All', ...CATEGORIES].map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1 rounded-full text-xs sm:text-sm border ${category === c ? 'bg-[#178da6]/10 border-[#178da6] text-[#178da6] font-semibold' : 'border-gray-200 bg-white text-gray-700'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500'>
            <span className='flex items-center gap-1.5'><span className='w-2.5 h-2.5 rounded-full bg-teal-600' />Start of WOD / 1st round</span>
            <span className='flex items-center gap-1.5'><span className='w-2.5 h-2.5 rounded-full bg-orange-600' />End of WOD / last round</span>
            <span className='flex items-center gap-1.5'><span className='w-2.5 h-2.5 rounded-full bg-slate-400' />Not recorded</span>
          </div>
        </div>

        {/* Cards */}
        {!tasks.length ? (
          <div className='bg-white rounded-lg p-6 text-gray-600 text-sm'>
            No split times yet. Create one with <strong>+ New task</strong> (e.g. Run 400m), then add your athletes&apos; times with <strong>+ Add scores</strong>.
          </div>
        ) : !shown.length ? (
          <div className='bg-white rounded-lg p-6 text-gray-600 text-sm'>No tasks match. Clear the search or pick another group.</div>
        ) : (
          <div className='grid gap-3'>
            {shown.map(t => {
              const rows = scoresByTask.get(t.id) ?? [];
              const athletes = new Set(rows.map(nameOf)).size;
              const inHelper = helper.some(h => h.id === t.id);
              const split = !!(t.amount_female || t.amount_male);
              const toRows = (list: PacingScore[]) => list.map(s => ({ seconds: s.time_seconds, who: nameOf(s) }));
              return (
                <article key={t.id} className='bg-white rounded-lg p-3 sm:p-4 grid gap-3'>
                  <div className='flex flex-wrap gap-2 items-start justify-between'>
                    <div className='min-w-0'>
                      <h3 className='text-base sm:text-lg font-semibold text-gray-900'>
                        {t.movement}
                        {!split && t.amount && <span className='ml-2 align-middle text-xs font-semibold bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5'>{t.amount}</span>}
                        {split && <span className='ml-2 align-middle text-xs font-semibold bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5'>♀ {t.amount_female ?? '–'} · ♂ {t.amount_male ?? '–'}</span>}
                      </h3>
                      <div className='text-xs text-gray-500 mt-0.5'>
                        {t.category} · {rows.length} score{rows.length === 1 ? '' : 's'} · {athletes} athlete{athletes === 1 ? '' : 's'}{t.note ? ` · ${t.note}` : ''}
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-1.5 items-center'>
                      <button onClick={() => setScoreModal({ taskId: t.id, editing: null })} className='px-2.5 py-1 text-xs sm:text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium'>+ Score</button>
                      <button
                        onClick={() => toggleHelper(t.id)}
                        className={`px-2.5 py-1 text-xs sm:text-sm rounded-lg font-medium border flex items-center gap-1 ${inHelper ? 'bg-[#178da6] border-[#178da6] text-white' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <Timer size={14} />{inHelper ? 'In helper' : 'Add to helper'}
                      </button>
                      <button onClick={() => setTaskModal({ editing: t })} className='p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900' aria-label='Edit task'><Edit2 size={15} /></button>
                      <button onClick={() => deleteTask(t)} className='p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-red-600' aria-label='Delete task'><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {split ? (
                    <div className='grid gap-2'>
                      {(['F', 'M'] as const).map(g => {
                        const list = rows.filter(s => s.member_id && memberById.get(s.member_id)?.gender === g);
                        const sum = summarise(toRows(list));
                        if (!sum) return null;
                        return (
                          <div key={g} className='grid gap-1.5'>
                            <div className='text-xs font-semibold text-gray-500'>{g === 'F' ? `♀ ${t.amount_female ?? ''}` : `♂ ${t.amount_male ?? ''}`}</div>
                            <StatTiles s={sum} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (() => {
                    const sum = summarise(toRows(rows));
                    if (!sum) return <div className='text-sm text-gray-500'>No scores yet.</div>;
                    return (
                      <>
                        <StatTiles s={sum} />
                        <RangeStrip rows={rows} sum={sum} nameOf={nameOf} />
                      </>
                    );
                  })()}

                  {rows.length > 0 && (
                    <div>
                      <button onClick={() => setOpenTasks(o => ({ ...o, [t.id]: !o[t.id] }))} className='text-sm font-medium text-[#178da6]'>
                        {openTasks[t.id] ? '▾' : '▸'} All {rows.length} scores
                      </button>
                      {openTasks[t.id] && (
                        <div className='overflow-x-auto mt-2 border border-gray-200 rounded-lg'>
                          <table className='w-full text-sm'>
                            <thead className='bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500'>
                              <tr>
                                <th className='text-left px-3 py-2'>Athlete</th>
                                <th className='text-left px-3 py-2'>Time</th>
                                <th className='text-left px-3 py-2'>When</th>
                                <th className='text-left px-3 py-2'>Scale</th>
                                <th className='text-left px-3 py-2'>Date</th>
                                <th className='px-3 py-2' />
                              </tr>
                            </thead>
                            <tbody>
                              {[...rows].sort((a, b) => a.time_seconds - b.time_seconds).map(s => (
                                <tr key={s.id} className='border-t border-gray-100 whitespace-nowrap'>
                                  <td className='px-3 py-1.5'>
                                    {nameOf(s)}
                                    {!s.member_id && <span className='ml-1.5 text-[10px] text-gray-400' title='Imported from the old note — not a member'>(ex)</span>}
                                    {s.note && <span className='block text-xs text-gray-500 whitespace-normal'>{s.note}</span>}
                                  </td>
                                  <td className='px-3 py-1.5 font-mono tabular-nums'>{fmtTime(s.time_seconds)}</td>
                                  <td className='px-3 py-1.5'><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tagClass(s.position)}`}>{s.position ? POSITION_LABEL[s.position] : '–'}</span></td>
                                  <td className='px-3 py-1.5'>{s.scaling || '–'}</td>
                                  <td className='px-3 py-1.5 font-mono tabular-nums'>
                                    {s.score_date ? (
                                      <button onClick={() => router.push(`/coach?date=${s.score_date}`)} className='text-[#178da6] underline underline-offset-2' title='Open that day in the calendar'>
                                        {showDate(s.score_date)}
                                      </button>
                                    ) : '–'}
                                  </td>
                                  <td className='px-2 py-1.5'>
                                    <div className='flex gap-1 justify-end'>
                                      <button onClick={() => setScoreModal({ taskId: t.id, editing: s })} className='p-1 text-gray-500 hover:text-gray-900' aria-label='Edit score'><Edit2 size={14} /></button>
                                      <button onClick={() => deleteScore(s)} className='p-1 text-gray-500 hover:text-red-600' aria-label='Delete score'><Trash2 size={14} /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Time-cap helper: docked on desktop, bottom sheet on phones */}
      <aside className='hidden lg:block sticky top-3'>{helperPanel}</aside>
      <button
        onClick={() => setSheetOpen(true)}
        className='lg:hidden fixed right-4 bottom-4 z-30 bg-[#178da6] text-white rounded-full px-4 py-3 font-semibold shadow-lg flex items-center gap-2'
      >
        <Timer size={18} /> Time-cap helper{helper.length ? ` (${helper.length})` : ''}
      </button>
      {sheetOpen && (
        <div className='lg:hidden fixed inset-0 z-40 bg-black/40 flex items-end' onClick={() => setSheetOpen(false)}>
          <div className='w-full max-h-[80vh] overflow-y-auto' onClick={e => e.stopPropagation()}>{helperPanel}</div>
        </div>
      )}

      {taskModal && (
        <TaskModal
          editing={taskModal.editing}
          library={library}
          onClose={() => setTaskModal(null)}
          onSaved={() => { setTaskModal(null); load(); }}
        />
      )}
      {scoreModal && (
        <ScoreModal
          tasks={tasks}
          taskId={scoreModal.taskId}
          editing={scoreModal.editing}
          members={members}
          onClose={() => setScoreModal(null)}
          onSaved={() => { setScoreModal(null); load(); }}
        />
      )}
    </div>
  );
}

// ---------- pieces ----------

function StatTiles({ s }: { s: Summary }) {
  const tile = (k: string, v: number, who: string) => (
    <div className='bg-gray-50 rounded-lg px-2.5 py-2 min-w-0'>
      <div className='text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-500 font-semibold'>{k}</div>
      <div className='text-lg sm:text-xl font-semibold font-mono tabular-nums'>{fmtTime(v)}</div>
      <div className='text-xs text-gray-500 truncate' title={who}>{who}</div>
    </div>
  );
  return (
    <div className='grid grid-cols-3 gap-2'>
      {tile('Fastest', s.min, s.fastWho)}
      {tile('Median', s.med, 'middle of the group')}
      {tile('Slowest', s.max, s.slowWho)}
    </div>
  );
}

function RangeStrip({ rows, sum, nameOf }: { rows: PacingScore[]; sum: Summary; nameOf: (s: PacingScore) => string }) {
  const span = Math.max(1, sum.max - sum.min);
  return (
    <div className='relative h-9 mx-2' aria-hidden='true'>
      <div className='absolute inset-x-0 top-[11px] h-1 rounded bg-gradient-to-r from-teal-100 via-amber-200 to-orange-200' />
      {rows.map(s => (
        <span
          key={s.id}
          title={`${nameOf(s)} ${fmtTime(s.time_seconds)}${s.position ? ' · ' + POSITION_LABEL[s.position] : ''}`}
          className={`absolute top-1.5 w-3.5 h-3.5 -ml-[7px] rounded-full border-2 border-white shadow ${dotColor(s.position)}`}
          style={{ left: `${((s.time_seconds - sum.min) / span) * 100}%` }}
        />
      ))}
      <span className='absolute top-6 -left-2 text-[11px] text-gray-500 font-mono'>{fmtTime(sum.min)}</span>
      <span className='absolute top-6 -right-2 text-[11px] text-gray-500 font-mono'>{fmtTime(sum.max)}</span>
    </div>
  );
}

function HelperPanel({ tasks, scoresByTask, helper, setHelper, transition, setTransition, margin, setMargin, onClose }: {
  tasks: PacingTask[];
  scoresByTask: Map<string, PacingScore[]>;
  helper: { id: string; n: number }[];
  setHelper: React.Dispatch<React.SetStateAction<{ id: string; n: number }[]>>;
  transition: number;
  setTransition: (n: number) => void;
  margin: number;
  setMargin: (n: number) => void;
  onClose: () => void;
}) {
  let fast = 0, med = 0, slow = 0, count = 0;
  const items = helper.map(h => {
    const t = tasks.find(x => x.id === h.id);
    const sum = summarise((scoresByTask.get(h.id) ?? []).map(s => ({ seconds: s.time_seconds, who: '' })));
    if (t && sum) { fast += sum.min * h.n; med += sum.med * h.n; slow += sum.max * h.n; count += h.n; }
    return { h, t };
  }).filter(x => x.t);
  const tr = transition * count;

  return (
    <div className='bg-white rounded-t-2xl lg:rounded-lg p-4 grid gap-3'>
      <div className='flex items-center justify-between'>
        <h2 className='font-semibold text-base flex items-center gap-2'><Timer size={18} /> Time-cap helper</h2>
        <button onClick={onClose} className='lg:hidden p-1.5 text-gray-500' aria-label='Close'><X size={18} /></button>
      </div>
      <p className='text-xs text-gray-500'>Add tasks from the cards to see how long your fastest and slowest athletes need for a for-time WOD.</p>
      {!items.length ? (
        <div className='text-sm text-gray-500 bg-gray-50 rounded-lg p-3'>Nothing added yet. Tap “Add to helper” on a card, then set how many times each task is done.</div>
      ) : (
        <div className='grid gap-2'>
          {items.map(({ h, t }) => (
            <div key={h.id} className='grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-center bg-gray-50 rounded-lg pl-2.5 pr-1.5 py-1.5'>
              <div className='text-sm font-medium truncate'>{taskTitle(t!)}</div>
              <div className='flex items-center border border-gray-200 rounded-md bg-white'>
                <button onClick={() => setHelper(hs => hs.map(x => x.id === h.id ? { ...x, n: Math.max(1, x.n - 1) } : x))} className='w-7 h-7' aria-label='Fewer'>−</button>
                <span className='w-7 text-center text-sm font-mono'>{h.n}×</span>
                <button onClick={() => setHelper(hs => hs.map(x => x.id === h.id ? { ...x, n: x.n + 1 } : x))} className='w-7 h-7' aria-label='More'>+</button>
              </div>
              <button onClick={() => setHelper(hs => hs.filter(x => x.id !== h.id))} className='p-1 text-gray-400 hover:text-gray-900' aria-label='Remove'><X size={15} /></button>
            </div>
          ))}
        </div>
      )}
      <label className='flex items-center gap-2 text-sm text-gray-600'>
        Transition per task
        <input type='number' min={0} step={5} value={transition} onChange={e => setTransition(Math.max(0, Number(e.target.value) || 0))} className='w-16 border border-gray-200 rounded-md px-2 py-1 font-mono' />
        sec
      </label>
      <label className='flex items-center gap-2 text-sm text-gray-600'>
        Margin for the fastest
        <input type='number' min={0} step={5} value={margin} onChange={e => setMargin(Math.max(0, Number(e.target.value) || 0))} className='w-16 border border-gray-200 rounded-md px-2 py-1 font-mono' />
        %
      </label>
      {items.length > 0 && (
        <>
          <div className='grid grid-cols-3 gap-1.5'>
            {[['Fastest', fast], ['Median', med], ['Slowest', slow]].map(([k, v]) => (
              <div key={k as string} className='bg-gray-50 rounded-lg px-2 py-1.5'>
                <div className='text-[10px] uppercase tracking-wider text-gray-500 font-semibold'>{k}</div>
                <div className='text-base font-semibold font-mono tabular-nums'>{fmtTime((v as number) + tr)}</div>
              </div>
            ))}
          </div>
          <div className='border-2 border-[#178da6] rounded-lg px-3 py-2 flex items-center justify-between gap-2'>
            <div>
              <div className='font-semibold text-sm'>Suggested time cap</div>
              <div className='text-xs text-gray-500'>Fastest + transitions + {margin}%. Everyone else scales to fit or gets capped.</div>
            </div>
            <div className='text-2xl font-bold text-[#178da6] font-mono'>{Math.ceil(((fast + tr) * (1 + margin / 100)) / 60)} min</div>
          </div>
        </>
      )}
    </div>
  );
}

function TaskModal({ editing, library, onClose, onSaved }: {
  editing: PacingTask | null;
  library: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [movement, setMovement] = useState(editing?.movement ?? '');
  const [split, setSplit] = useState(!!(editing?.amount_female || editing?.amount_male));
  const [amount, setAmount] = useState(editing?.amount ?? '');
  const [amountF, setAmountF] = useState(editing?.amount_female ?? '');
  const [amountM, setAmountM] = useState(editing?.amount_male ?? '');
  const [category, setCategory] = useState(editing?.category ?? 'Runs');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const ex = library.find(e => e.name.toLowerCase() === movement.trim().toLowerCase());
    if (!ex) { setError('Pick the movement from the Exercise Library list. Add it to the library first if it is missing.'); return; }
    if (split && (!amountF.trim() || !amountM.trim())) { setError('Enter both the ♀ and the ♂ amount, or untick the box.'); return; }
    setSaving(true);
    const row = {
      exercise_id: ex.id,
      movement: ex.name,
      amount: split ? null : amount.trim() || null,
      amount_female: split ? amountF.trim() : null,
      amount_male: split ? amountM.trim() : null,
      category,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = editing
      ? await supabase.from('pacing_tasks').update(row).eq('id', editing.id)
      : await supabase.from('pacing_tasks').insert(row);
    setSaving(false);
    if (err) { console.error(err); setError('Failed to save the task.'); return; }
    toast.success(editing ? 'Task updated' : 'Task created');
    onSaved();
  };

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm';
  return (
    <FocusTrap>
      <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4'>
        <div className='bg-white rounded-lg p-4 sm:p-6 w-full max-w-md grid gap-3 max-h-[95vh] overflow-y-auto'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-bold'>{editing ? 'Edit task' : 'New task'}</h3>
            <button onClick={onClose} className='p-1 text-gray-500' aria-label='Close'><X size={20} /></button>
          </div>
          <label className='grid gap-1 text-sm font-medium'>
            Movement <span className='text-xs font-normal text-gray-500'>from the Exercise Library</span>
            <input list='pacing-library' value={movement} onChange={e => setMovement(e.target.value)} placeholder='e.g. Run 400m' className={input} autoFocus />
            <datalist id='pacing-library'>{library.map(e => <option key={e.id} value={e.name} />)}</datalist>
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <input type='checkbox' checked={split} onChange={e => setSplit(e.target.checked)} /> Different amount for ♀ and ♂
          </label>
          {split ? (
            <div className='grid grid-cols-2 gap-3'>
              <label className='grid gap-1 text-sm font-medium'>♀ amount<input value={amountF} onChange={e => setAmountF(e.target.value)} placeholder='800 m' className={input} /></label>
              <label className='grid gap-1 text-sm font-medium'>♂ amount<input value={amountM} onChange={e => setAmountM(e.target.value)} placeholder='1000 m' className={input} /></label>
            </div>
          ) : (
            <label className='grid gap-1 text-sm font-medium'>
              Amount <span className='text-xs font-normal text-gray-500'>leave empty when the name says it (Run 400m)</span>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder='30 reps, 500 m…' className={input} />
            </label>
          )}
          <label className='grid gap-1 text-sm font-medium'>
            Group
            <select value={category} onChange={e => setCategory(e.target.value)} className={input}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className='grid gap-1 text-sm font-medium'>
            Note <span className='text-xs font-normal text-gray-500'>optional</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder='e.g. 5 × (10 m forwards + 10 m backwards)' className={input} />
          </label>
          {error && <div className='text-sm text-red-600'>{error}</div>}
          <div className='flex justify-end gap-2'>
            <button onClick={onClose} className='px-4 py-2 border border-gray-300 rounded-lg text-sm'>Cancel</button>
            <button onClick={save} disabled={saving} className='px-4 py-2 bg-[#178da6] text-white rounded-lg text-sm font-medium disabled:opacity-50'>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}

/** Resolve a typed/pasted name to a member: full name, whiteboard name, or a unique first name. */
function resolveMember(name: string, members: MemberLite[]): MemberLite | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const exact = members.filter(m => m.label.toLowerCase() === n);
  if (exact.length === 1) return exact[0];
  const wb = members.filter(m => (m.whiteboard ?? '').toLowerCase() === n);
  if (wb.length === 1) return wb[0];
  const first = members.filter(m => m.first.toLowerCase() === n);
  return first.length === 1 ? first[0] : null;
}

interface PasteRow { raw: string; member: MemberLite | null; name: string; times: number[]; date: string | null; bad?: string }

/** One athlete per line: "Claudia: 1:15, 1:55" or "Lena (14/10/26): 1:40". A date carries down to the lines below it. */
function parsePaste(text: string, members: MemberLite[], defaultDate: string | null): PasteRow[] {
  let carry = defaultDate;
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(raw => {
    const colon = raw.lastIndexOf(':', raw.search(/\d{1,3}:[0-5]\d/) - 1);
    const head = colon > 0 ? raw.slice(0, colon) : raw;
    const tail = colon > 0 ? raw.slice(colon + 1) : '';
    const date = parseDeDate(head);
    if (date) carry = date;
    const name = head.replace(/\(?\d{1,2}[./]\d{1,2}[./]\d{2,4}\)?/, '').trim();
    const times = (tail.match(/\d{1,3}:[0-5]\d/g) ?? []).map(t => parseTime(t)!).filter(Boolean);
    const member = resolveMember(name, members);
    const bad = !name || !times.length ? 'Can’t read this line' : !member ? `No member called “${name}”` : undefined;
    return { raw, member, name, times, date: carry, bad };
  });
}

function ScoreModal({ tasks, taskId, editing, members, onClose, onSaved }: {
  tasks: PacingTask[];
  taskId: string | null;
  editing: PacingScore | null;
  members: MemberLite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'one' | 'paste'>('one');
  const [task, setTask] = useState(taskId ?? tasks[0]?.id ?? '');
  const editingName = editing?.member_id ? members.find(m => m.id === editing.member_id)?.label ?? '' : editing?.legacy_name ?? '';
  const [athlete, setAthlete] = useState(editingName);
  const [time, setTime] = useState(editing ? fmtTime(editing.time_seconds) : '');
  const [position, setPosition] = useState<string>(editing?.position ?? '');
  const [scaling, setScaling] = useState(editing?.scaling ?? '');
  const [date, setDate] = useState(editing ? editing.score_date ?? '' : formatDate(new Date()));
  const [note, setNote] = useState(editing?.note ?? '');
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const pasteRows = useMemo(() => parsePaste(paste, members, date || null), [paste, members, date]);

  const save = async () => {
    setError('');
    if (!task) { setError('Pick a task.'); return; }
    if (mode === 'one') {
      const secs = parseTime(time);
      if (secs === null) { setError('Write the time as minutes:seconds, e.g. 2:18.'); return; }
      const member = resolveMember(athlete, members);
      const keepLegacy = editing && !editing.member_id && athlete.trim() === editingName;
      if (!member && !keepLegacy) { setError('Pick the athlete from the members list.'); return; }
      const row = {
        task_id: task,
        member_id: member?.id ?? null,
        legacy_name: member ? null : editing?.legacy_name ?? null,
        time_seconds: secs,
        position: position || null,
        scaling: scaling || null,
        score_date: date || null,
        note: note.trim() || null,
      };
      setSaving(true);
      const { error: err } = editing
        ? await supabase.from('pacing_scores').update(row).eq('id', editing.id)
        : await supabase.from('pacing_scores').insert(row);
      setSaving(false);
      if (err) { console.error(err); setError('Failed to save the score.'); return; }
      toast.success(editing ? 'Score updated' : 'Score added');
      onSaved();
      return;
    }
    if (!pasteRows.length) { setError('Paste at least one line like “Chris: 2:18”.'); return; }
    if (pasteRows.some(r => r.bad)) { setError('Fix the red lines first (use the member’s full name if the first name is shared).'); return; }
    const rows = pasteRows.flatMap(r => r.times.map((secs, i) => ({
      task_id: task,
      member_id: r.member!.id,
      time_seconds: secs,
      position: r.times.length > 1 ? (i === 0 ? 'first' : i === r.times.length - 1 ? 'last' : null) : position || null,
      scaling: scaling || null,
      score_date: r.date,
    })));
    setSaving(true);
    const { error: err } = await supabase.from('pacing_scores').insert(rows);
    setSaving(false);
    if (err) { console.error(err); setError('Failed to save the scores.'); return; }
    toast.success(`${rows.length} score${rows.length === 1 ? '' : 's'} added`);
    onSaved();
  };

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm';
  return (
    <FocusTrap>
      <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4'>
        <div className='bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg grid gap-3 max-h-[95vh] overflow-y-auto'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-bold'>{editing ? 'Edit score' : 'Add scores'}</h3>
            <button onClick={onClose} className='p-1 text-gray-500' aria-label='Close'><X size={20} /></button>
          </div>
          {!editing && (
            <div className='flex gap-1.5'>
              {(['one', 'paste'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded-full text-sm border ${mode === m ? 'bg-[#178da6]/10 border-[#178da6] text-[#178da6] font-semibold' : 'border-gray-200'}`}>
                  {m === 'one' ? 'One score' : 'Paste a list'}
                </button>
              ))}
            </div>
          )}
          <label className='grid gap-1 text-sm font-medium'>
            Task
            <select value={task} onChange={e => setTask(e.target.value)} className={input}>
              {[...tasks].sort((a, b) => taskTitle(a).localeCompare(taskTitle(b), undefined, { numeric: true })).map(t => <option key={t.id} value={t.id}>{taskTitle(t)}</option>)}
            </select>
          </label>

          {mode === 'one' ? (
            <div className='grid sm:grid-cols-2 gap-3'>
              <label className='grid gap-1 text-sm font-medium sm:col-span-2'>
                Athlete
                <input list='pacing-members' value={athlete} onChange={e => setAthlete(e.target.value)} placeholder='Start typing a name…' className={input} autoFocus={!editing} />
                <datalist id='pacing-members'>{members.map(m => <option key={m.id} value={m.label} />)}</datalist>
              </label>
              <label className='grid gap-1 text-sm font-medium'>
                Time <span className='text-xs font-normal text-gray-500'>min:sec</span>
                <input value={time} onChange={e => setTime(e.target.value)} placeholder='2:18' inputMode='numeric' className={`${input} font-mono`} />
              </label>
              <label className='grid gap-1 text-sm font-medium'>
                When in the workout
                <select value={position} onChange={e => setPosition(e.target.value)} className={input}>
                  <option value=''>Not recorded</option>
                  {Object.entries(POSITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className='grid gap-1 text-sm font-medium'>
                Scale
                <select value={scaling} onChange={e => setScaling(e.target.value)} className={input}>
                  <option value=''>–</option><option>Rx</option><option>Sc</option>
                </select>
              </label>
              <label className='grid gap-1 text-sm font-medium'>
                Date
                <input type='date' value={date} onChange={e => setDate(e.target.value)} className={input} />
              </label>
              <label className='grid gap-1 text-sm font-medium sm:col-span-2'>
                Note <span className='text-xs font-normal text-gray-500'>optional</span>
                <input value={note} onChange={e => setNote(e.target.value)} className={input} />
              </label>
            </div>
          ) : (
            <div className='grid gap-3'>
              <label className='grid gap-1 text-sm font-medium'>
                One athlete per line
                <span className='text-xs font-normal text-gray-500'>Same as your old note: “Claudia: 1:15, 1:55”. Two times = 1st and last round. A date on a line, e.g. “Lena (14/10/26): 1:40”, applies to the lines below it too.</span>
                <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={7} placeholder={'Claudia: 1:15, 1:55\nChris: 1:15, 1:56\nLena (14/10/26): 1:40'} className={`${input} font-mono`} autoFocus />
              </label>
              <div className='grid grid-cols-2 gap-3'>
                <label className='grid gap-1 text-sm font-medium'>
                  Date <span className='text-xs font-normal text-gray-500'>until a line gives one</span>
                  <input type='date' value={date} onChange={e => setDate(e.target.value)} className={input} />
                </label>
                <label className='grid gap-1 text-sm font-medium'>
                  Scale for all
                  <select value={scaling} onChange={e => setScaling(e.target.value)} className={input}>
                    <option value=''>–</option><option>Rx</option><option>Sc</option>
                  </select>
                </label>
                <label className='grid gap-1 text-sm font-medium col-span-2'>
                  When (lines with one time)
                  <select value={position} onChange={e => setPosition(e.target.value)} className={input}>
                    <option value=''>Not recorded</option>
                    {Object.entries(POSITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              </div>
              {pasteRows.length > 0 && (
                <div className='bg-gray-50 rounded-lg p-2.5 text-sm grid gap-1'>
                  {pasteRows.map((r, i) => (
                    <div key={i} className={r.bad ? 'text-red-600' : ''}>
                      {r.bad ? <>{r.bad}: <span className='font-mono'>{r.raw}</span></> : (
                        <><strong>{r.member!.label}</strong> · <span className='font-mono'>{r.times.map(fmtTime).join(' → ')}</span> · {showDate(r.date)}</>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div className='text-sm text-red-600'>{error}</div>}
          <div className='flex justify-end gap-2'>
            <button onClick={onClose} className='px-4 py-2 border border-gray-300 rounded-lg text-sm'>Cancel</button>
            <button onClick={save} disabled={saving} className='px-4 py-2 bg-[#178da6] text-white rounded-lg text-sm font-medium disabled:opacity-50'>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
