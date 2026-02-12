// AthletePageLiftsTab component
'use client';

import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface LiftRecord {
  id: string;
  lift_name: string;
  weight_kg: number;
  reps: number;
  calculated_1rm?: number;
  rep_max_type?: string;
  rep_scheme?: string;
  notes?: string;
  lift_date: string;
}

interface AthletePageLiftsTabProps {
  userId: string;
}

export default function AthletePageLiftsTab({ userId }: AthletePageLiftsTabProps) {
  const [selectedLift, setSelectedLift] = useState<string | null>(null);
  const [chartLift, setChartLift] = useState<string | null>(null);
  const [chartRepMaxType, setChartRepMaxType] = useState<'1RM' | '3RM' | '5RM' | '10RM'>('1RM');
  const [newWeight, setNewWeight] = useState('');
  const [newRepMaxType, setNewRepMaxType] = useState<'1RM' | '3RM' | '5RM' | '10RM'>('1RM');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [liftHistory, setLiftHistory] = useState<LiftRecord[]>([]);
  const [recentLifts, setRecentLifts] = useState<LiftRecord[]>([]);
  const [editingLiftId, setEditingLiftId] = useState<string | null>(null);
  const [lifts, setLifts] = useState<Array<{ name: string; category: string }>>([]);
  const [expandedSections, setExpandedSections] = useState({
    recent: true,
    workoutProgress: true,
  });
  const [expandedCategories, setExpandedCategories] = useState({
    Olympic: false,
    Press: false,
    Pull: false,
    Squat: false,
  });

  useEffect(() => {
    fetchLifts();
    fetchLiftHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchLifts = async () => {
    try {
      const { data, error } = await supabase
        .from('barbell_lifts')
        .select('name, category')
        .order('display_order');

      if (error) throw error;
      setLifts(data || []);
    } catch (error) {
      console.error('Error fetching lifts:', error);
    }
  };

  const fetchLiftHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('lift_records')
        .select('*')
        .eq('user_id', userId)
        .order('lift_date', { ascending: false });

      if (error) throw error;
      setLiftHistory(data || []);
      setRecentLifts((data || []).slice(0, 10));
    } catch (error) {
      console.error('Error fetching lift history:', error);
    }
  };

  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 1) return weight;
    // Epley formula: 1RM = weight * (1 + reps/30)
    return Math.round(weight * (1 + reps / 30));
  };

  const handleSaveLift = async () => {
    if (!selectedLift || !newWeight) return;

    const weight = parseFloat(newWeight);
    const reps = newRepMaxType === '1RM' ? 1 : newRepMaxType === '3RM' ? 3 : newRepMaxType === '5RM' ? 5 : 10;
    const calculated1rm = calculate1RM(weight, reps);

    try {
      if (editingLiftId) {
        // Update existing lift
        const { error } = await supabase
          .from('lift_records')
          .update({
            lift_name: selectedLift,
            weight_kg: weight,
            reps: reps,
            calculated_1rm: calculated1rm,
            rep_max_type: newRepMaxType,
            notes: newNotes || null,
            lift_date: newDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLiftId);

        if (error) throw error;
      } else {
        // Insert new lift
        const { error } = await supabase.from('lift_records').insert({
          user_id: userId,
          lift_name: selectedLift,
          weight_kg: weight,
          reps: reps,
          calculated_1rm: calculated1rm,
          rep_max_type: newRepMaxType,
          notes: newNotes || null,
          lift_date: newDate,
        });

        if (error) throw error;
      }

      // Refresh the history
      await fetchLiftHistory();

      // Clear form but keep modal open
      setNewWeight('');
      setNewRepMaxType('1RM');
      setNewNotes('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setEditingLiftId(null);
    } catch (error) {
      console.error('Error saving lift:', error);
      toast.error('Failed to save lift record. Please try again.');
    }
  };

  const handleEditLift = (entry: LiftRecord) => {
    setSelectedLift(entry.lift_name);
    setNewWeight(entry.weight_kg.toString());
    setNewRepMaxType((entry.rep_max_type as '1RM' | '3RM' | '5RM' | '10RM') || '1RM');
    setNewNotes(entry.notes || '');
    setNewDate(entry.lift_date);
    setEditingLiftId(entry.id);
  };

  const handleDeleteLift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lift record?')) return;

    try {
      const { error } = await supabase.from('lift_records').delete().eq('id', id);

      if (error) throw error;

      // Refresh the history
      await fetchLiftHistory();
    } catch (error) {
      console.error('Error deleting lift:', error);
      toast.error('Failed to delete lift record. Please try again.');
    }
  };

  const getAllRepMaxPRs = (liftName: string) => {
    const liftRecords = liftHistory.filter(entry => entry.lift_name === liftName);

    const prs = {
      '1RM': null as number | null,
      '3RM': null as number | null,
      '5RM': null as number | null,
      '10RM': null as number | null,
    };

    (['1RM', '3RM', '5RM', '10RM'] as const).forEach(type => {
      const records = liftRecords.filter(r => r.rep_max_type === type);
      if (records.length > 0) {
        prs[type] = Math.max(...records.map(r => r.weight_kg));
      }
    });

    return prs;
  };

  const getLiftChartData = (liftName: string, repMaxType: '1RM' | '3RM' | '5RM' | '10RM') => {
    const results = liftHistory
      .filter(entry => entry.lift_name === liftName && entry.rep_max_type === repMaxType)
      .sort((a, b) => new Date(a.lift_date).getTime() - new Date(b.lift_date).getTime());

    // Find best result for this rep max type to mark as PR
    const prWeight = results.length > 0 ? Math.max(...results.map(r => r.weight_kg)) : 0;

    return results.map(entry => ({
      date: new Date(entry.lift_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      weight: entry.weight_kg,
      calculated1rm: entry.calculated_1rm,
      isPR: entry.weight_kg === prWeight,
    }));
  };

  // Custom dot component to render PR badges (all red)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isPR) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill='#178da6' stroke='#fff' strokeWidth={2} />
          <circle cx={cx} cy={cy} r={10} fill='#ef4444' opacity={0.8} />
          <text x={cx} y={cy + 4} textAnchor='middle' fill='white' fontSize={10} fontWeight='bold'>
            PR
          </text>
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill='#178da6' stroke='#fff' strokeWidth={2} />;
  };

  // Get chart variations for a lift (only RM tests: 1RM, 3RM, 5RM, 10RM)
  const getAllLiftCharts = (liftName: string) => {
    const charts: Array<{
      type: 'RM';
      label: string;
      data: Array<{ date: string; weight: number; isPR: boolean }>;
      count?: number;
    }> = [];

    // Group records by rep_max_type only (exclude rep_scheme/logbook entries)
    const repGroups = new Map<string, LiftRecord[]>();

    liftHistory.forEach(record => {
      if (record.lift_name !== liftName) return;
      if (!record.rep_max_type) return;

      if (!repGroups.has(record.rep_max_type)) {
        repGroups.set(record.rep_max_type, []);
      }
      repGroups.get(record.rep_max_type)!.push(record);
    });

    // Create charts for each RM type with 2+ entries
    repGroups.forEach((records, repMaxType) => {
      if (records.length >= 2) {
        const sorted = records.sort((a, b) => new Date(a.lift_date).getTime() - new Date(b.lift_date).getTime());
        const prWeight = Math.max(...sorted.map(r => r.weight_kg));

        charts.push({
          type: 'RM',
          label: repMaxType,
          data: sorted.map(entry => ({
            date: new Date(entry.lift_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            weight: entry.weight_kg,
            isPR: entry.weight_kg === prWeight,
          })),
          count: records.length,
        });
      }
    });

    // Sort charts by rep count (1RM, 3RM, 5RM, 10RM)
    charts.sort((a, b) => {
      const repsA = parseInt(a.label);
      const repsB = parseInt(b.label);
      return repsA - repsB;
    });

    return charts;
  };

  return (
    <div className='space-y-4 sm:space-y-6 bg-gray-500 p-3 sm:p-6 rounded-lg'>
      <div className='bg-white rounded-xl shadow-lg p-4 sm:p-8'>
        <h2 className='text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 sm:mb-4'>Barbell Lifts</h2>
        <p className='text-sm sm:text-base text-gray-700 mb-4 sm:mb-8 leading-relaxed'>
          Track your strength progress with barbell movements.
        </p>

        {/* Group lifts by category */}
        {(() => {
          const CATEGORY_ORDER = ['Olympic', 'Squat', 'Press', 'Pull'];
          const liftsByCategory: Record<string, typeof lifts> = {};

          lifts.forEach(lift => {
            if (!liftsByCategory[lift.category]) {
              liftsByCategory[lift.category] = [];
            }
            liftsByCategory[lift.category].push(lift);
          });

          // Sort categories by predefined order, then add any unrecognized categories
          const allCategories = Object.keys(liftsByCategory);
          const sortedCategories = [
            ...CATEGORY_ORDER.filter(cat => liftsByCategory[cat]),
            ...allCategories.filter(cat => !CATEGORY_ORDER.includes(cat)).sort()
          ];

          return (
            <div className='space-y-6'>
              {sortedCategories.map(category => {
                const categoryLifts = liftsByCategory[category];

                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className='bg-[#178da6] text-white px-4 py-2 rounded-t-lg mb-2'>
                      <h4 className='text-sm font-bold uppercase tracking-wide'>
                        {category} <span className='opacity-75'>({categoryLifts.length})</span>
                      </h4>
                    </div>

                    {/* Lifts Grid */}
                    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3'>
                      {categoryLifts.map(lift => {
                  const prs = getAllRepMaxPRs(lift.name);
                  const liftAttempts = liftHistory.filter(r => r.lift_name === lift.name);
                  const attemptCount = liftAttempts.length;

                  // Find best rep max (prioritize 1RM > 3RM > 5RM > 10RM)
                  let bestRepMax = null;
                  let bestWeight = null;
                  for (const type of ['1RM', '3RM', '5RM', '10RM'] as const) {
                    if (prs[type] !== null) {
                      bestRepMax = type;
                      bestWeight = prs[type];
                      break;
                    }
                  }

                  return (
                    <div
                      key={lift.name}
                      onClick={() => setSelectedLift(lift.name)}
                      className='group border border-[#0ABAB5] rounded-lg p-2 sm:p-3 bg-[#AFEEEE] hover:border-sky-400 hover:bg-[#40E0D0] cursor-pointer transition min-h-[60px]'
                    >
<div className='flex items-center justify-between mb-1'>
  <h4 className='text-sm sm:text-base font-bold text-gray-900 leading-tight'>{lift.name}</h4>
  {attemptCount > 0 && (
    <p className='text-xs font-bold text-gray-500 ml-1'>{attemptCount}x</p>
  )}
</div>
                      {bestRepMax ? (
<div>
  <p className='text-base sm:text-lg font-bold text-[#178da6]'>{bestWeight}kg</p>
</div>
                      ) : (
                        <p className='text-xs text-gray-500 mt-1'>No records</p>
                      )}
                    </div>
                  );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Recent Lifts Section */}
      <div className='bg-white rounded-xl shadow p-4 sm:p-6'>
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, recent: !prev.recent }))}
          className='flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-700 mb-3 sm:mb-4 hover:text-[#178da6] transition'
        >
          {expandedSections.recent ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          Recent Lifts
        </button>

        {expandedSections.recent && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
            {recentLifts.length > 0 ? (
              recentLifts.map(lift => (
                <div key={lift.id} className='flex flex-col p-3 bg-gradient-to-r from-[#AFEEEE] to-[#40E0D0] border border-[#0ABAB5] rounded-lg relative group'>
                  <div className='flex items-start justify-between mb-2'>
                    <h4 className='font-bold text-gray-700 flex-1'>{lift.lift_name}</h4>

                    <div className='flex items-center gap-2'>
                      {/* Rep scheme badge */}
                      {(lift.rep_max_type || lift.rep_scheme) && (
                        <span className='text-xs px-2 py-1 rounded bg-[#AFEEEE] text-gray-900 whitespace-nowrap'>
                          {lift.rep_max_type || lift.rep_scheme}
                        </span>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLift(lift.id);
                        }}
                        className='p-1 text-gray-600 hover:text-red-600 hover:bg-white/50 rounded transition opacity-0 group-hover:opacity-100'
                        title='Delete lift record'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className='flex items-center justify-between'>
                    <p className='text-lg font-bold text-[#178da6] flex-1'>
                      {lift.weight_kg}kg
                    </p>
                    <p className='text-sm text-gray-700 flex-1 text-right'>
                      {new Date(lift.lift_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className='text-gray-500 text-center py-8'>No recent lift results</p>
            )}
          </div>
        )}
      </div>

      {/* Lift Progress Section */}
      <div className='bg-white rounded-lg shadow p-4 sm:p-6'>
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, workoutProgress: !prev.workoutProgress }))}
          className='flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-700 mb-3 sm:mb-4 hover:text-[#178da6] transition'
        >
          {expandedSections.workoutProgress ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          Lift Progress
        </button>

        {expandedSections.workoutProgress && (
          <div>
            <p className='text-sm sm:text-base text-gray-700 mb-4 sm:mb-6'>Track your strength progress across all lifts, including RM tests and workout patterns.</p>

            {(['Olympic', 'Press', 'Pull', 'Squat'] as const).map(category => {
              // Get all lifts in this category that have any chart data
              const categoryLifts = lifts
                .filter(lift => lift.category === category)
                .map(lift => ({ ...lift, charts: getAllLiftCharts(lift.name) }))
                .filter(lift => lift.charts.length > 0);

              if (categoryLifts.length === 0) return null;

              return (
                <div key={category} className='mb-4'>
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                    className='flex items-center gap-2 text-lg font-bold text-gray-700 mb-3 hover:text-[#178da6] transition w-full'
                  >
                    {expandedCategories[category] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    {category} Lifts ({categoryLifts.length})
                  </button>

                  {expandedCategories[category] && (
                    <div className='space-y-6 sm:pl-6'>
                      {categoryLifts.map(lift => (
                        <div key={lift.name} className='space-y-3'>
                          <h3 className='text-lg font-bold text-gray-800'>{lift.name}</h3>
                          <div className='grid grid-cols-1 gap-4'>
                            {lift.charts.map((chart, idx) => (
                              <div key={`${lift.name}-${chart.label}-${idx}`} className='border border-sky-300 rounded-lg p-2 sm:p-4 bg-gradient-to-br from-[#40E0D0] to-[#AFEEEE]'>
                                <h4 className='font-bold text-gray-700 mb-3'>
                                  {chart.label}
                                  {chart.count && <span className='text-sm text-gray-600 ml-2'>({chart.count} sessions)</span>}
                                </h4>
                                <ResponsiveContainer width='100%' height={200} className='[&_svg]:outline-none'>
                                  <LineChart data={chart.data} margin={{ top: 5, right: 10, left: -10, bottom: 15 }}>
                                    <CartesianGrid strokeDasharray='3 3' stroke='white' />
                                    <XAxis dataKey='date' tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                                      const parts = payload.value.replace(',', '').split(' ');
                                      const line1 = `${parts[0]} ${parts[1]}`;
                                      const line2 = parts[2];
                                      return (
                                        <g transform={`translate(${x},${y})`}>
                                          <text x={0} y={0} dy={10} textAnchor='middle' fontSize={10}>{line1}</text>
                                          <text x={0} y={0} dy={22} textAnchor='middle' fontSize={10} fill='#999'>{line2}</text>
                                        </g>
                                      );
                                    }} padding={{ left: 20, right: 20 }} interval={0} />
                                    <YAxis width={35} tick={{ fontSize: 10 }} />
                                    <Tooltip
                                      isAnimationActive={false}
                                      cursor={{ stroke: '#aaa', strokeWidth: 1.5 }}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          return (
                                            <div className='bg-white p-2 border border-gray-300 rounded shadow-lg'>
                                              <p className='text-xs text-gray-900 font-semibold'>
                                                {payload[0].payload.date}
                                              </p>
                                              <p className='text-xs text-[#178da6] font-semibold'>
                                                {payload[0].payload.weight}kg
                                              </p>
                                              {payload[0].payload.isPR && (
                                                <p className='text-xs text-red-600 font-bold'>PR!</p>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Line
                                      type='monotone'
                                      dataKey='weight'
                                      stroke='#178da6'
                                      strokeWidth={2}
                                      dot={<CustomDot />}
                                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Lift Modal */}
      {selectedLift && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50' onClick={() => {
          setSelectedLift(null);
          setEditingLiftId(null);
          setNewWeight('');
          setNewRepMaxType('1RM');
          setNewDate(new Date().toISOString().split('T')[0]);
        }}>
          <div className='bg-gray-700 rounded-lg shadow-xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-3 sm:mb-4'>
              <h3 className='text-lg sm:text-xl font-semibold text-gray-50'>
                {editingLiftId ? 'Edit' : 'Log'} {selectedLift}
              </h3>
              <div className='flex gap-2'>
                <button
                  onClick={() => setChartLift(chartLift === selectedLift ? null : selectedLift)}
                  className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition'
                >
                  {chartLift === selectedLift ? 'Hide Chart' : 'Show Progress'}
                </button>
                <button
                  onClick={() => {
                    setSelectedLift(null);
                    setEditingLiftId(null);
                    setNewWeight('');
                    setNewRepMaxType('1RM');
                    setNewDate(new Date().toISOString().split('T')[0]);
                  }}
                  className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded transition'
                >
                  ✕
                </button>
              </div>
            </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-2'>Date</label>
                <input
                  type='date'
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-100 date-input-calendar'
                  style={{
                    colorScheme: 'dark'
                  }}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-2'>Rep Max Type</label>
                <select
                  value={newRepMaxType}
                  onChange={e => setNewRepMaxType(e.target.value as '1RM' | '3RM' | '5RM' | '10RM')}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-100'
                >
                  <option value='1RM'>1 Rep Max</option>
                  <option value='3RM'>3 Rep Max</option>
                  <option value='5RM'>5 Rep Max</option>
                  <option value='10RM'>10 Rep Max</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-2'>Weight (kg)</label>
                <input
                  type='number'
                  step='0.5'
                  value={newWeight}
                  onChange={e => setNewWeight(e.target.value)}
                  placeholder='e.g., 100'
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-100'
                />
                {newWeight && (
                  <p className='text-sm text-gray-600 mt-1'>
                    Estimated 1RM: {calculate1RM(parseFloat(newWeight), newRepMaxType === '1RM' ? 1 : newRepMaxType === '3RM' ? 3 : newRepMaxType === '5RM' ? 5 : 10)}kg
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-2'>Notes</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder='How did it feel? Any form notes?'
                  rows={4}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-100 resize-none'
                />
              </div>

              <div className='flex gap-3 pt-3 sm:pt-4'>
                <button
                  onClick={() => {
                    setSelectedLift(null);
                    setNewWeight('');
                    setNewRepMaxType('1RM');
                    setNewNotes('');
                    setNewDate(new Date().toISOString().split('T')[0]);
                    setEditingLiftId(null);
                  }}
                  className='flex-1 px-4 py-2 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLift}
                  disabled={!newWeight}
                  className='flex-1 px-4 py-2 min-h-[44px] bg-[#178da6] hover:bg-[#14758c] text-white font-medium rounded-lg transition disabled:bg-gray-500 disabled:cursor-not-allowed'
                >
                  {editingLiftId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

            {/* History */}
            <div>
              <h4 className='text-lg font-semibold text-gray-50 mb-4'>Previous Records</h4>
              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {liftHistory
                  .filter(entry => entry.lift_name === selectedLift)
                  .map(entry => (
                    <div key={entry.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='font-semibold text-gray-900'>
                            {entry.weight_kg}kg
                            {entry.calculated_1rm && entry.rep_max_type !== '1RM' && (
                              <span className='text-sm text-gray-500 font-normal ml-2'>(Est. 1RM: {entry.calculated_1rm}kg)</span>
                            )}
                          </span>
                          <span className='text-sm text-gray-600'>({entry.rep_max_type})</span>
                        </div>
                        <p className='text-sm text-gray-600'>
                          {new Date(entry.lift_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        {entry.notes && <p className='text-sm text-gray-500 mt-1'>{entry.notes}</p>}
                      </div>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => handleEditLift(entry)}
                          className='p-2 text-gray-600 hover:text-[#178da6] hover:bg-white rounded transition'
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteLift(entry.id)}
                          className='p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded transition'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {chartLift && (
            <div className='mt-4 sm:mt-6'>
              <div className='flex items-center justify-between mb-3 sm:mb-4'>
                <h4 className='text-base sm:text-lg font-semibold text-gray-100'>
                  {chartLift} Progress
                </h4>
                <select
                  value={chartRepMaxType}
                  onChange={e => setChartRepMaxType(e.target.value as '1RM' | '3RM' | '5RM' | '10RM')}
                  className='px-3 py-1 text-sm text-gray-100 border border-gray-300 rounded focus:ring-2 focus:ring-[#178da6] focus:border-transparent'
                >
                  <option value='1RM'>1RM</option>
                  <option value='3RM'>3RM</option>
                  <option value='5RM'>5RM</option>
                  <option value='10RM'>10RM</option>
                </select>
              </div>
              <ResponsiveContainer width='100%' height={250} className='[&_svg]:outline-none'>
                <LineChart
                  data={getLiftChartData(chartLift, chartRepMaxType)}
                  margin={{ top: 5, right: 10, left: -10, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray='3 3' stroke='white' />
                  <XAxis dataKey='date' tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                    const parts = payload.value.replace(',', '').split(' ');
                    const line1 = `${parts[0]} ${parts[1]}`;
                    const line2 = parts[2];
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={10} textAnchor='middle' fontSize={10} fill='#f3f4f6'>{line1}</text>
                        <text x={0} y={0} dy={22} textAnchor='middle' fontSize={10} fill='#999'>{line2}</text>
                      </g>
                    );
                  }} padding={{ left: 20, right: 20 }} interval={0} />
                  <YAxis width={35} tick={{ fill: '#f3f4f6', fontSize: 10 }} />
                  <Tooltip
                    cursor={{ stroke: '#999', strokeWidth: 1.5 }}
                    isAnimationActive={false}
                    allowEscapeViewBox={{ x: false, y: true }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className='bg-gray-800 p-2 sm:p-3 border border-gray-600 rounded shadow-lg max-w-[200px]'>
                            <p className='text-xs sm:text-sm text-gray-100 font-semibold'>
                              {payload[0].payload.date}
                            </p>
                            <p className='text-xs sm:text-sm text-[#83e1b2ff] font-semibold'>
                              {payload[0].payload.weight}kg
                              {payload[0].payload.calculated1rm && (
                                <span className='text-xs sm:text-sm text-gray-100 font-normal ml-1'>
                                  (Est. 1RM: {payload[0].payload.calculated1rm}kg)
                                </span>
                              )}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='weight'
                    stroke='#178da6'
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
