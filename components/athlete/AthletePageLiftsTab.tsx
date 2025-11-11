// AthletePageLiftsTab component
'use client';

import { supabase } from '@/lib/supabase';
import { Dumbbell, Edit2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const [editingLiftId, setEditingLiftId] = useState<string | null>(null);
  const [lifts, setLifts] = useState<Array<{ name: string; category: string }>>([]);

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

      // Custom reorder: Move "Clean" between "Snatch" and "Clean & Jerk"
      const reorderedLifts = (data || []).slice();
      const cleanIndex = reorderedLifts.findIndex(l => l.name === 'Clean');
      const cleanAndJerkIndex = reorderedLifts.findIndex(l => l.name === 'Clean & Jerk');

      if (cleanIndex !== -1 && cleanAndJerkIndex !== -1) {
        const [cleanLift] = reorderedLifts.splice(cleanIndex, 1);
        const newCleanAndJerkIndex = reorderedLifts.findIndex(l => l.name === 'Clean & Jerk');
        reorderedLifts.splice(newCleanAndJerkIndex, 0, cleanLift);
      }

      setLifts(reorderedLifts);
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

      // Clear form
      setNewWeight('');
      setNewRepMaxType('1RM');
      setNewNotes('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setSelectedLift(null);
      setEditingLiftId(null);
    } catch (error) {
      console.error('Error saving lift:', error);
      alert('Failed to save lift record. Please try again.');
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
      alert('Failed to delete lift record. Please try again.');
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

    return results.map(entry => ({
      date: new Date(entry.lift_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      weight: entry.weight_kg,
      calculated1rm: entry.calculated_1rm,
    }));
  };

  return (
    <div className='space-y-6'>
      <div className='bg-white rounded-lg shadow p-6'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>Barbell Lifts</h2>
        <p className='text-gray-600 mb-6'>
          Track your strength progress with barbell movements.
        </p>

        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
          {(() => {
            // Separate olympic lifts (Snatch, Clean, Clean & Jerk) from others
            const olympicLiftNames = ['Snatch', 'Clean', 'Clean & Jerk'];
            const nonOlympicLifts = lifts.filter(l => !olympicLiftNames.includes(l.name));
            const olympicLifts = lifts.filter(l => olympicLiftNames.includes(l.name));

            // Calculate spacers needed to push olympic lifts to new row (5 columns)
            const spacersNeeded = nonOlympicLifts.length % 5 === 0 ? 0 : 5 - (nonOlympicLifts.length % 5);

            return (
              <>
                {/* Non-olympic lifts */}
                {nonOlympicLifts.map(lift => {
                  const prs = getAllRepMaxPRs(lift.name);
                  const hasAnyPR = Object.values(prs).some(pr => pr !== null);
                  return (
                    <div
                      key={lift.name}
                      onClick={() => setSelectedLift(lift.name)}
                      className='group border border-gray-300 rounded-lg p-3 bg-cyan-100/50 hover:border-[#208479] hover:bg-cyan-100/70 cursor-pointer transition'
                    >
                      <div className='flex items-start justify-between mb-1'>
                        <h4 className='text-base font-bold text-gray-900'>{lift.name}</h4>
                        <Dumbbell size={18} className='text-[#208479] flex-shrink-0' />
                      </div>
                      {hasAnyPR ? (
                        <div className='mt-2 grid grid-cols-2 gap-2'>
                          {(['1RM', '3RM', '5RM', '10RM'] as const).map(
                            type =>
                              prs[type] !== null && (
                                <div key={type}>
                                  <p className='text-xs text-gray-600'>{type}:</p>
                                  <p className='text-sm font-bold text-[#208479]'>{prs[type]}kg</p>
                                </div>
                              )
                          )}
                        </div>
                      ) : (
                        <p className='text-xs text-gray-500 mt-2'>No records yet</p>
                      )}
                    </div>
                  );
                })}

                {/* Spacers to push olympic lifts to new row */}
                {Array.from({ length: spacersNeeded }, (_, i) => (
                  <div key={`spacer-${i}`} className='invisible'></div>
                ))}

                {/* Olympic lifts */}
                {olympicLifts.map(lift => {
                  const prs = getAllRepMaxPRs(lift.name);
                  const hasAnyPR = Object.values(prs).some(pr => pr !== null);
                  return (
                    <div
                      key={lift.name}
                      onClick={() => setSelectedLift(lift.name)}
                      className='group border border-gray-300 rounded-lg p-3 bg-cyan-100/50 hover:border-[#208479] hover:bg-cyan-100/70 cursor-pointer transition'
                    >
                      <div className='flex items-start justify-between mb-1'>
                        <h4 className='text-base font-bold text-gray-900'>{lift.name}</h4>
                        <Dumbbell size={18} className='text-[#208479] flex-shrink-0' />
                      </div>
                      {hasAnyPR ? (
                        <div className='mt-2 grid grid-cols-2 gap-2'>
                          {(['1RM', '3RM', '5RM', '10RM'] as const).map(
                            type =>
                              prs[type] !== null && (
                                <div key={type}>
                                  <p className='text-xs text-gray-600'>{type}:</p>
                                  <p className='text-sm font-bold text-[#208479]'>{prs[type]}kg</p>
                                </div>
                              )
                          )}
                        </div>
                      ) : (
                        <p className='text-xs text-gray-500 mt-2'>No records yet</p>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
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
          <div className='bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-semibold text-gray-900'>
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
                  className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition'
                >
                  ✕
                </button>
              </div>
            </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                <input
                  type='date'
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Rep Max Type</label>
                <select
                  value={newRepMaxType}
                  onChange={e => setNewRepMaxType(e.target.value as '1RM' | '3RM' | '5RM' | '10RM')}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                >
                  <option value='1RM'>1 Rep Max</option>
                  <option value='3RM'>3 Rep Max</option>
                  <option value='5RM'>5 Rep Max</option>
                  <option value='10RM'>10 Rep Max</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Weight (kg)</label>
                <input
                  type='number'
                  step='0.5'
                  value={newWeight}
                  onChange={e => setNewWeight(e.target.value)}
                  placeholder='e.g., 100'
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                />
                {newWeight && (
                  <p className='text-sm text-gray-600 mt-1'>
                    Estimated 1RM: {calculate1RM(parseFloat(newWeight), newRepMaxType === '1RM' ? 1 : newRepMaxType === '3RM' ? 3 : newRepMaxType === '5RM' ? 5 : 10)}kg
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Notes</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder='How did it feel? Any form notes?'
                  rows={4}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
                />
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  onClick={() => {
                    setSelectedLift(null);
                    setNewWeight('');
                    setNewRepMaxType('1RM');
                    setNewNotes('');
                    setNewDate(new Date().toISOString().split('T')[0]);
                    setEditingLiftId(null);
                  }}
                  className='flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLift}
                  disabled={!newWeight}
                  className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {editingLiftId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

            {/* History */}
            <div>
              <h4 className='text-lg font-semibold text-gray-900 mb-4'>Previous Records</h4>
              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {liftHistory
                  .filter(entry => entry.lift_name === selectedLift)
                  .map(entry => (
                    <div key={entry.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='font-semibold text-gray-900'>{entry.weight_kg}kg</span>
                          <span className='text-sm text-gray-600'>({entry.rep_max_type})</span>
                          {entry.calculated_1rm && entry.rep_max_type !== '1RM' && (
                            <span className='text-sm text-[#208479]'>Est. 1RM: {entry.calculated_1rm}kg</span>
                          )}
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
                          className='p-2 text-gray-600 hover:text-[#208479] hover:bg-white rounded transition'
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
            <div className='mt-6'>
              <div className='flex items-center justify-between mb-4'>
                <h4 className='text-lg font-semibold text-gray-900'>
                  {chartLift} Progress
                </h4>
                <select
                  value={chartRepMaxType}
                  onChange={e => setChartRepMaxType(e.target.value as '1RM' | '3RM' | '5RM' | '10RM')}
                  className='px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent'
                >
                  <option value='1RM'>1RM</option>
                  <option value='3RM'>3RM</option>
                  <option value='5RM'>5RM</option>
                  <option value='10RM'>10RM</option>
                </select>
              </div>
              <ResponsiveContainer width='100%' height={300}>
                <LineChart data={getLiftChartData(chartLift, chartRepMaxType)}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className='bg-white p-3 border border-gray-300 rounded shadow-lg'>
                            <p className='text-sm text-gray-900 font-semibold'>
                              {payload[0].payload.date}
                            </p>
                            <p className='text-sm text-[#208479] font-semibold'>
                              Weight: {payload[0].payload.weight}kg
                            </p>
                            {payload[0].payload.calculated1rm && (
                              <p className='text-sm text-gray-600'>
                                Est. 1RM: {payload[0].payload.calculated1rm}kg
                              </p>
                            )}
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
                    stroke='#208479'
                    strokeWidth={2}
                    dot={{ fill: '#208479', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#208479', strokeWidth: 2 }}
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
