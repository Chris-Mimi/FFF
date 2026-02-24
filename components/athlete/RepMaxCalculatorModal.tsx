'use client';

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface LiftOption {
  name: string;
  category: string;
}

interface LiftRecord {
  lift_name: string;
  weight_kg: number;
  reps: number;
  rep_max_type?: string;
}

interface RepMaxCalculatorModalProps {
  lifts: LiftOption[];
  liftHistory: LiftRecord[];
  onClose: () => void;
}

const CATEGORY_ORDER = ['Olympic', 'Squat', 'Press', 'Pull'];
const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
const RM_TYPES = [1, 3, 5, 10] as const;

function estimateMax(weight: number, reps: number, category: string): number {
  if (reps === 1) return weight;
  if (reps < 1 || reps > 10) return 0;

  if (category === 'Press') {
    return Math.round((100 * weight) / (101.3 - 2.67123 * reps));
  }
  if (category === 'Squat' || category === 'Pull' || category === 'Olympic') {
    return Math.round(weight * (1 + reps / 30));
  }
  return Math.round(weight * (36 / (37 - reps)));
}

function estimateWeightForReps(oneRM: number, targetReps: number, category: string): number {
  if (targetReps === 1) return oneRM;

  if (category === 'Press') {
    return Math.round(oneRM * (101.3 - 2.67123 * targetReps) / 100);
  }
  if (category === 'Squat' || category === 'Pull' || category === 'Olympic') {
    return Math.round(oneRM / (1 + targetReps / 30));
  }
  return Math.round(oneRM * (37 - targetReps) / 36);
}

export default function RepMaxCalculatorModal({ lifts, liftHistory, onClose }: RepMaxCalculatorModalProps) {
  const [selectedLift, setSelectedLift] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState(1);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Pre-fill from existing records when lift changes
  useEffect(() => {
    if (!selectedLift) return;
    const records = liftHistory.filter(r => r.lift_name === selectedLift);
    if (records.length === 0) {
      setWeight('');
      setReps(1);
      return;
    }
    const best = records.reduce((a, b) => {
      if (b.weight_kg > a.weight_kg) return b;
      if (b.weight_kg === a.weight_kg && (b.reps || 1) < (a.reps || 1)) return b;
      return a;
    });
    setWeight(best.weight_kg.toString());
    setReps(Math.min(10, Math.max(1, best.reps || 1)));
  }, [selectedLift, liftHistory]);

  const category = useMemo(() => {
    const found = lifts.find(l => l.name === selectedLift);
    return found?.category || '';
  }, [selectedLift, lifts]);

  const weightNum = parseFloat(weight) || 0;

  const estimated1RM = useMemo(() => {
    if (!weightNum || !category) return 0;
    return estimateMax(weightNum, reps, category);
  }, [weightNum, reps, category]);

  const rmTable = useMemo(() => {
    if (!estimated1RM) return null;
    return RM_TYPES.map(r => ({
      reps: r,
      label: `${r}RM`,
      weight: estimateWeightForReps(estimated1RM, r, category),
    }));
  }, [estimated1RM, category]);

  const percentageTable = useMemo(() => {
    if (!estimated1RM) return null;
    return PERCENTAGES.map(pct => ({
      percent: pct,
      weight: Math.round(estimated1RM * pct / 100),
    }));
  }, [estimated1RM]);

  // Group lifts by category for optgroup
  const liftsByCategory = useMemo(() => {
    const grouped: Record<string, LiftOption[]> = {};
    lifts.forEach(lift => {
      if (!grouped[lift.category]) grouped[lift.category] = [];
      grouped[lift.category].push(lift);
    });
    const sortedKeys = [
      ...CATEGORY_ORDER.filter(c => grouped[c]),
      ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)).sort(),
    ];
    return sortedKeys.map(cat => ({ category: cat, lifts: grouped[cat] }));
  }, [lifts]);

  const showResults = selectedLift && weightNum > 0;

  return (
    <FocusTrap>
      <div
        className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className='bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>
          {/* Header */}
          <div className='bg-[#178da6] text-white p-4 flex justify-between items-center sticky top-0 z-10 rounded-t-xl'>
            <h3 className='font-bold text-lg'>Rep Max Calculator</h3>
            <button
              onClick={onClose}
              className='p-1 hover:bg-white/20 rounded transition'
              aria-label='Close calculator'
            >
              <X size={22} />
            </button>
          </div>

          <div className='p-5 space-y-5'>
            {/* Lift selector */}
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-1'>Lift</label>
              <select
                value={selectedLift}
                onChange={e => setSelectedLift(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
              >
                <option value=''>Select a lift...</option>
                {liftsByCategory.map(group => (
                  <optgroup key={group.category} label={group.category}>
                    {group.lifts.map(l => (
                      <option key={l.name} value={l.name}>{l.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Weight + Reps */}
            <div className='flex gap-4'>
              <div className='flex-1'>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Weight (kg)</label>
                <input
                  type='number'
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder='0'
                  min='0'
                  step='0.5'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                />
              </div>
              <div className='w-28'>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Reps</label>
                <input
                  type='number'
                  value={reps}
                  onChange={e => setReps(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  min='1'
                  max='10'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                />
              </div>
            </div>

            {reps > 0 && reps <= 10 && (
              <p className='text-xs text-gray-500'>
                {reps === 1 ? 'Entered weight is your 1RM — estimating other rep maxes.' : `Estimating from ${reps}-rep max.`}
              </p>
            )}

            {/* Results */}
            {showResults && rmTable && (
              <>
                {/* RM Estimates */}
                <div>
                  <h4 className='text-sm font-semibold text-gray-700 mb-2'>Estimated Rep Maxes</h4>
                  <div className='grid grid-cols-4 gap-2'>
                    {rmTable.map(rm => {
                      const isInput = rm.reps === reps;
                      return (
                        <div
                          key={rm.label}
                          className={`text-center p-3 rounded-lg border ${
                            isInput
                              ? 'bg-[#178da6] text-white border-[#178da6]'
                              : 'bg-gray-50 text-gray-900 border-gray-200'
                          }`}
                        >
                          <div className={`text-xs font-semibold mb-1 ${isInput ? 'text-white/80' : 'text-gray-500'}`}>
                            {rm.label}
                          </div>
                          <div className='text-xl font-bold'>{rm.weight}</div>
                          <div className={`text-xs ${isInput ? 'text-white/70' : 'text-gray-400'}`}>kg</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Percentage Table */}
                <div>
                  <h4 className='text-sm font-semibold text-gray-700 mb-2'>Percentage of 1RM ({estimated1RM} kg)</h4>
                  <div className='border border-gray-200 rounded-lg overflow-hidden'>
                    <table className='w-full text-sm'>
                      <thead className='bg-gray-100'>
                        <tr>
                          <th className='px-4 py-2 text-left font-semibold text-gray-600'>%</th>
                          <th className='px-4 py-2 text-right font-semibold text-gray-600'>Weight (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {percentageTable!.map(row => (
                          <tr
                            key={row.percent}
                            className={`border-t border-gray-100 ${
                              row.percent === 100 ? 'bg-[#178da6]/10 font-semibold' : ''
                            }`}
                          >
                            <td className='px-4 py-1.5 text-gray-700'>{row.percent}%</td>
                            <td className='px-4 py-1.5 text-right text-gray-900'>{row.weight}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
