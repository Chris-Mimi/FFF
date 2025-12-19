'use client';

import { BarChart3, ChevronLeft, ChevronRight, Library, X } from 'lucide-react';
import { RefObject } from 'react';

type TimeframePeriod = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2 | 3 | 6 | 12;

interface Exercise {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
  subcategory?: string;
  equipment?: string[];
  body_parts?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface Statistics {
  totalWorkouts: number;
  trackBreakdown: { trackId: string; trackName: string; count: number; color: string }[];
  typeBreakdown: { typeId: string; typeName: string; count: number }[];
  exerciseFrequency: { exercise: string; count: number }[];
  allExerciseFrequency: { exercise: string; count: number }[];
  totalWODDuration: number;
  averageWODDuration: number;
  durationBreakdown: { range: string; count: number }[];
}

interface StatisticsSectionProps {
  loading: boolean;
  statistics: Statistics | null;
  exercises: Exercise[];
  timeframePeriod: TimeframePeriod;
  onTimeframePeriodChange: (period: TimeframePeriod) => void;
  selectedMonth: Date;
  onChangeMonth: (direction: 'prev' | 'next') => void;
  timeframeLabel: string;
  dateButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenDateRangePicker: () => void;
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  selectedMovementTypes: Array<'lift' | 'benchmark' | 'forge_benchmark' | 'exercise'>;
  onToggleMovementType: (type: 'lift' | 'benchmark' | 'forge_benchmark' | 'exercise') => void;
  showUnusedOnly: boolean;
  onToggleUnusedOnly: () => void;
  onClearFilters: () => void;
  exerciseSearch: string;
  onExerciseSearchChange: (value: string) => void;
  filteredExercises: { exercise: string; count: number; type?: 'lift' | 'benchmark' | 'forge_benchmark' | 'exercise'; category?: string }[];
  onExerciseSelect: (exercise: string) => void;
  onOpenLibrary: () => void;
  selectedExercises: string[];
  onRemoveExercise: (exercise: string) => void;
  onClearAllExercises: () => void;
  filteredTopExercises: { exercise: string; count: number }[];
}

export default function StatisticsSection({
  loading,
  statistics,
  exercises,
  timeframePeriod,
  onTimeframePeriodChange,
  selectedMonth,
  onChangeMonth,
  timeframeLabel,
  dateButtonRef,
  onOpenDateRangePicker,
  categories,
  selectedCategories,
  onToggleCategory,
  selectedMovementTypes,
  onToggleMovementType,
  showUnusedOnly,
  onToggleUnusedOnly,
  onClearFilters,
  exerciseSearch,
  onExerciseSearchChange,
  filteredExercises,
  onExerciseSelect,
  onOpenLibrary,
  selectedExercises,
  onRemoveExercise,
  onClearAllExercises,
  filteredTopExercises,
}: StatisticsSectionProps) {
  return (
    <div className='bg-gray-600 rounded-xl shadow-xl p-8' style={{ overflowAnchor: 'none' }}>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-bold text-gray-100'>Statistics</h2>
        <div className='flex items-center gap-6'>
          {/* Timeframe Period Selector */}
          <div className='flex items-center gap-2 bg-gray-100 rounded-lg p-1'>
            {/* Week Dropdown */}
            <select
              value={timeframePeriod <= 2 ? timeframePeriod : ''}
              onChange={(e) => {
                e.preventDefault();
                const value = parseFloat(e.target.value);
                if (value) onTimeframePeriodChange(value as TimeframePeriod);
              }}
              className={`px-3 py-1.5 rounded-md font-semibold text-sm transition cursor-pointer ${
                timeframePeriod <= 2
                  ? 'bg-[#208479] text-white'
                  : 'text-gray-700 hover:bg-gray-300'
              }`}
            >
              <option value="" disabled>Weeks</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(weeks => (
                <option key={weeks} value={weeks * 0.25}>
                  {weeks} Week{weeks > 1 ? 's' : ''}
                </option>
              ))}
            </select>

            {/* Month Buttons */}
            {([3, 6, 12] as TimeframePeriod[]).map(period => (
              <button
                key={period}
                onClick={(e) => {
                  e.preventDefault();
                  onTimeframePeriodChange(period);
                }}
                className={`px-3 py-1.5 rounded-md font-semibold text-sm transition ${
                  timeframePeriod === period
                    ? 'bg-[#208479] text-white'
                    : 'text-gray-700 hover:bg-gray-300'
                }`}
              >
                {`${period} Months`}
              </button>
            ))}
          </div>

          {/* Month Navigation */}
          <div className='flex items-center gap-4'>
            <button
              onClick={() => onChangeMonth('prev')}
              className='p-2 hover:bg-gray-400 rounded-lg transition'
            >
              <ChevronLeft size={20} className='text-gray-100' />
            </button>
            <button
              ref={dateButtonRef}
              onClick={onOpenDateRangePicker}
              className='text-lg font-semibold text-gray-100 min-w-[200px] text-center hover:bg-gray-400 px-4 py-2 rounded-lg transition border border-transparent hover:border-gray-500'
            >
              {timeframeLabel}
            </button>
            <button
              onClick={() => onChangeMonth('next')}
              className='p-2 hover:bg-gray-400 rounded-lg transition'
            >
              <ChevronRight size={20} className='text-gray-100' />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className='text-center py-12 text-gray-500' style={{ minHeight: '400px' }}>
          <p>Loading...</p>
        </div>
      ) : statistics ? (
        <div className='space-y-6'>
          {/* Summary Cards with Duration Distribution */}
          <div className='flex gap-6 items-start'>
            {/* Summary Cards */}
            <div className='flex gap-4'>
              <div className='bg-gradient-to-br from-[#208479] to-[#1a6b62] text-white rounded-lg p-4 flex items-center gap-3'>
                <div>
                  <div className='text-xs font-semibold opacity-90'>Total Workouts</div>
                  <div className='text-2xl font-bold'>{statistics.totalWorkouts}</div>
                </div>
              </div>
              <div className='bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 flex items-center gap-3'>
                <div>
                  <div className='text-xs font-semibold opacity-90'>Avg WOD Duration</div>
                  <div className='text-2xl font-bold'>
                    {statistics.averageWODDuration}
                    <span className='text-base ml-1'>min</span>
                  </div>
                </div>
              </div>
              <div className='bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg p-4 flex items-center gap-3'>
                <div>
                  <div className='text-xs font-semibold opacity-90'>Total WOD Time</div>
                  <div className='text-2xl font-bold'>
                    {statistics.totalWODDuration}
                    <span className='text-base ml-1'>min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* WOD Duration Distribution - Compact */}
            <div className='flex-1'>
              <h3 className='text-sm font-bold text-gray-100 mb-2'>WOD Duration Distribution</h3>
              <div className='flex gap-2 flex-wrap'>
                {statistics.durationBreakdown.map((duration, idx) => (
                  <div
                    key={idx}
                    className='bg-gray-50 rounded-lg p-2 text-center border border-gray-200 min-w-[80px]'
                  >
                    <div className='text-lg font-bold text-[#208479]'>{duration.count}</div>
                    <div className='text-[10px] text-gray-700 font-medium'>{duration.range}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Exercise Search */}
          <div className='bg-gray-700 border border-gray-500 rounded-lg p-6' style={{ overflowAnchor: 'none' }}>
            <h3 className='text-lg font-bold text-gray-100 mb-4'>Exercise/Movement Search</h3>

            {/* Movement Type Filter Badges */}
            <div className='mb-4'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='text-sm font-medium text-gray-100'>Filter by Movement Type:</span>
              </div>
              <div className='flex flex-wrap gap-2'>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                    onToggleMovementType('lift');
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                    selectedMovementTypes.includes('lift')
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Lifts
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                    onToggleMovementType('benchmark');
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                    selectedMovementTypes.includes('benchmark')
                      ? 'bg-teal-500 text-white'
                      : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                  }`}
                >
                  Benchmarks
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                    onToggleMovementType('forge_benchmark');
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                    selectedMovementTypes.includes('forge_benchmark')
                      ? 'bg-cyan-500 text-white'
                      : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                  }`}
                >
                  Forge Benchmarks
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                    onToggleMovementType('exercise');
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                    selectedMovementTypes.includes('exercise')
                      ? 'bg-[#208479] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Exercises
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            {categories.length > 0 && (
              <div className='mb-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <span className='text-sm font-medium text-gray-100'>Filter by Category:</span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={(e) => {
                        e.preventDefault();
                        e.currentTarget.blur();
                        onToggleCategory(category);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                        selectedCategories.includes(category)
                          ? 'bg-[#208479] text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  <button
                    onClick={onToggleUnusedOnly}
                    className={`px-3 py-1.5 text-sm rounded-full font-medium transition border-2 ${
                      showUnusedOnly
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-orange-600 border-orange-500 hover:bg-orange-50'
                    }`}
                  >
                    Unused
                  </button>
                  {(selectedCategories.length > 0 || selectedMovementTypes.length > 0 || showUnusedOnly) && (
                    <button
                      onClick={onClearFilters}
                      className='px-3 py-1.5 text-sm rounded-full bg-red-100 text-red-700 hover:bg-red-200 font-medium transition'
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search Input with Browse Library Button */}
            <div className='flex gap-2 items-start'>
              <div className='flex-1 relative'>
                <input
                  type='text'
                  value={exerciseSearch}
                  onChange={(e) => onExerciseSearchChange(e.target.value)}
                  placeholder='Search for an exercise or movement...'
                  autoComplete='off'
                  readOnly
                  onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                  className='w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-50'
                />

                {/* Dropdown Results */}
                {(exerciseSearch || showUnusedOnly) && filteredExercises.length > 0 && (
                  <div className='absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                    {filteredExercises.map((exercise, idx) => {
                      const exerciseData = exercises.find(ex =>
                        ex.name === exercise.exercise ||
                        ex.display_name === exercise.exercise ||
                        ex.name.toLowerCase() === exercise.exercise.toLowerCase() ||
                        ex.display_name?.toLowerCase() === exercise.exercise.toLowerCase()
                      );
                      return (
                        <button
                          key={idx}
                          onClick={() => onExerciseSelect(exercise.exercise)}
                          className='w-full px-4 py-3 text-left hover:bg-gray-300 flex justify-between items-center border-b border-gray-100 last:border-b-0'
                        >
                          <div className='flex-1'>
                            <div className='flex items-center gap-2'>
                              <div className='text-gray-900 font-medium'>
                                {exerciseData?.display_name || exercise.exercise}
                              </div>
                              {/* Movement type badge */}
                              {exercise.type && (
                                <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                  exercise.type === 'lift' ? 'bg-purple-100 text-purple-700' :
                                  exercise.type === 'benchmark' ? 'bg-teal-100 text-teal-700' :
                                  exercise.type === 'forge_benchmark' ? 'bg-cyan-100 text-cyan-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {exercise.type === 'lift' ? 'Lift' :
                                   exercise.type === 'benchmark' ? 'Benchmark' :
                                   exercise.type === 'forge_benchmark' ? 'Forge' :
                                   'Exercise'}
                                </span>
                              )}
                            </div>
                            {/* Equipment badges */}
                            {exerciseData?.equipment && exerciseData.equipment.length > 0 && (
                              <div className='flex gap-1 mt-1'>
                                {exerciseData.equipment.map(eq => (
                                  <span key={eq} className='px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded'>
                                    {eq}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className='text-[#208479] font-bold text-sm ml-2'>{exercise.count}x</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {exerciseSearch && filteredExercises.length === 0 && (
                  <div className='absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-100'>
                    No exercises found matching &quot;{exerciseSearch}&quot;
                  </div>
                )}
              </div>

              {/* Browse Library Button */}
              <button
                onClick={onOpenLibrary}
                className='flex items-center gap-2 px-4 py-3 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition whitespace-nowrap'
              >
                <Library size={20} />
                Browse Library
              </button>
            </div>

            {/* Selected Exercises as Chips */}
            {selectedExercises.length > 0 && (
              <div className='mt-4'>
                <div className='flex flex-wrap gap-2'>
                  {selectedExercises.map(exerciseName => {
                    const exerciseData = exercises.find(ex =>
                      ex.name === exerciseName ||
                      ex.display_name === exerciseName ||
                      ex.name.toLowerCase() === exerciseName.toLowerCase() ||
                      ex.display_name?.toLowerCase() === exerciseName.toLowerCase()
                    );
                    const count = statistics?.allExerciseFrequency.find(e => e.exercise === exerciseName)?.count || 0;
                    return (
                      <span
                        key={exerciseName}
                        className='inline-flex items-center gap-1 px-3 py-2 bg-[#208479] text-white text-sm rounded-full'
                      >
                        <span className='font-medium'>{exerciseData?.display_name || exerciseName}</span>
                        {exerciseData?.equipment && exerciseData.equipment.length > 0 && (
                          <span className='text-xs opacity-75'>({exerciseData.equipment.join(', ')})</span>
                        )}
                        <span className='text-xs opacity-90'>({count}x)</span>
                        <button
                          onClick={() => onRemoveExercise(exerciseName)}
                          className='hover:bg-[#1a6b62] rounded-full p-0.5 ml-1'
                        >
                          <X size={14} />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <div className='mt-3 flex gap-2'>
                  <button
                    onClick={onClearAllExercises}
                    className='px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg text-sm transition'
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {!exerciseSearch && selectedExercises.length === 0 && (
              <p className='text-sm text-gray-300 mt-3'>
                Start typing to search through all exercises in the selected timeframe
              </p>
            )}
          </div>

          {/* Track Breakdown */}
          {statistics.trackBreakdown.length > 0 && (
            <div>
              <h3 className='text-lg font-bold text-gray-100 mb-3'>Workouts by Track</h3>
              <div className='space-y-2'>
                {statistics.trackBreakdown.map(track => (
                  <div key={track.trackId} className='flex items-center gap-3'>
                    <div
                      className='w-4 h-4 rounded-full flex-shrink-0'
                      style={{ backgroundColor: track.color }}
                    />
                    <div className='flex-1 flex items-center gap-3'>
                      <span className='text-gray-100 font-medium min-w-[150px]'>
                        {track.trackName}
                      </span>
                      <div className='flex-1 bg-gray-200 rounded-full h-6 relative'>
                        <div
                          className='h-6 rounded-full transition-all'
                          style={{
                            width: `${(track.count / statistics.totalWorkouts) * 100}%`,
                            backgroundColor: track.color,
                          }}
                        />
                        <span className='absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700'>
                          {track.count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workout Type Breakdown */}
          {statistics.typeBreakdown.length > 0 && (
            <div>
              <h3 className='text-lg font-bold text-gray-100 mb-3'>Workouts by Type</h3>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                {statistics.typeBreakdown.map(type => (
                  <div
                    key={type.typeId}
                    className='bg-gray-50 rounded-lg p-4 text-center border border-gray-200'
                  >
                    <div className='text-2xl font-bold text-[#208479]'>{type.count}</div>
                    <div className='text-sm text-gray-700 font-medium mt-1'>
                      {type.typeName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercise Frequency */}
          {filteredTopExercises.length > 0 && (
            <div style={{ overflowAnchor: 'none' }}>
              <h3 className='text-lg font-bold text-gray-100 mb-3'>
                Top Exercises{selectedCategories.length > 0 && ` (${selectedCategories.join(', ')})`}
              </h3>
              <div className='flex flex-wrap gap-2'>
                {filteredTopExercises.map((exercise, idx) => {
                  const exerciseData = exercises.find(ex =>
                    ex.name === exercise.exercise ||
                    ex.display_name === exercise.exercise ||
                    ex.name.toLowerCase() === exercise.exercise.toLowerCase() ||
                    ex.display_name?.toLowerCase() === exercise.exercise.toLowerCase()
                  );
                  return (
                    <span
                      key={idx}
                      className='inline-flex items-center px-3 py-2 bg-gray-100 text-gray-900 border-2 border-[#208479] text-sm rounded-full font-medium'
                    >
                      {exerciseData?.display_name || exercise.exercise} ({exercise.count}x)
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {statistics.totalWorkouts === 0 && (
            <div className='text-center py-12 text-gray-500'>
              <BarChart3 size={48} className='mx-auto mb-4 text-gray-300' />
              <p className='text-lg'>No workouts found for this month</p>
              <p className='text-sm mt-2'>
                Create some workouts on the dashboard to see statistics here.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className='text-center py-12 text-gray-500'>
          <BarChart3 size={48} className='mx-auto mb-4 text-gray-300' />
          <p className='text-lg'>No data available</p>
        </div>
      )}
    </div>
  );
}
