'use client';

import { BarChart3, ChevronLeft, ChevronRight, Library, X } from 'lucide-react';
import { RefObject } from 'react';

// Mobile-friendly category name mapping
const MOBILE_CATEGORY_NAMES: Record<string, string> = {
  'Warm-up & Mobility': 'Warm-up',
  'Olympic Lifting & Barbell Movements': 'Oly Lift',
  'Compound Exercises': 'Compound',
  'Gymnastics & Bodyweight': 'Gymnastics',
  'Core, Abs & Isometric Holds': 'Core & Iso',
  'Cardio & Conditioning': 'Cardio',
  'Specialty': 'Specialty',
  'Recovery & Stretching': 'Recovery',
  'Strength & Functional Conditioning': 'Strength',
};

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

interface MovementFrequencyItem {
  name: string;
  count: number;
  type: 'lift' | 'benchmark' | 'forge_benchmark' | 'exercise';
  category?: string;
}

interface Statistics {
  totalWorkouts: number;
  totalUniqueWorkouts: number;
  trackBreakdown: { trackId: string; trackName: string; count: number; color: string }[];
  typeBreakdown: { typeId: string; typeName: string; count: number }[];
  sectionTypeBreakdown: { sectionType: string; count: number; totalDuration: number }[];
  exerciseFrequency: { exercise: string; count: number }[];
  allExerciseFrequency: { exercise: string; count: number }[];
  movementFrequency: MovementFrequencyItem[];
  allMovementFrequency: MovementFrequencyItem[];
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
    <div className='bg-gray-600 rounded-xl shadow-xl p-4 md:p-8' style={{ overflowAnchor: 'none', minHeight: '150vh' }}>
      <div className='flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-6 mb-4 md:mb-6'>
        <h2 className='text-lg md:text-xl font-bold text-gray-100'>Statistics</h2>
        <div className='flex flex-col md:flex-row md:items-center gap-3 md:gap-6'>
          {/* Timeframe Period Selector */}
          <div className='flex items-center gap-1 md:gap-2 bg-gray-100 rounded-lg p-1 overflow-x-auto'>
            {/* Week Dropdown */}
            <select
              value={timeframePeriod <= 2 ? timeframePeriod : ''}
              onChange={(e) => {
                e.preventDefault();
                const value = parseFloat(e.target.value);
                if (value) onTimeframePeriodChange(value as TimeframePeriod);
              }}
              className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md font-semibold text-xs md:text-sm transition cursor-pointer ${
                timeframePeriod <= 2
                  ? 'bg-[#178da6] text-white'
                  : 'text-gray-700 hover:bg-gray-300'
              }`}
            >
              <option value="" disabled>Weeks</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(weeks => (
                <option key={weeks} value={weeks * 0.25}>
                  {weeks}W
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
                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md font-semibold text-xs md:text-sm transition whitespace-nowrap ${
                  timeframePeriod === period
                    ? 'bg-[#178da6] text-white'
                    : 'text-gray-700 hover:bg-gray-300'
                }`}
              >
                {`${period}M`}
              </button>
            ))}
          </div>

          {/* Month Navigation */}
          <div className='flex items-center justify-center gap-2 md:gap-4'>
            <button
              onClick={() => onChangeMonth('prev')}
              className='p-1.5 md:p-2 hover:bg-gray-400 rounded-lg transition'
            >
              <ChevronLeft size={18} className='md:w-5 md:h-5 text-gray-100' />
            </button>
            <button
              ref={dateButtonRef}
              onClick={onOpenDateRangePicker}
              className='text-sm md:text-lg font-semibold text-gray-100 min-w-[140px] md:min-w-[200px] text-center hover:bg-gray-400 px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition border border-transparent hover:border-gray-500'
            >
              {timeframeLabel}
            </button>
            <button
              onClick={() => onChangeMonth('next')}
              className='p-1.5 md:p-2 hover:bg-gray-400 rounded-lg transition'
            >
              <ChevronRight size={18} className='md:w-5 md:h-5 text-gray-100' />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className='text-center py-12 text-gray-500' style={{ minHeight: '400px' }}>
          <p>Loading...</p>
        </div>
      ) : statistics ? (
        <div className='space-y-4 md:space-y-6'>
          {/* Summary Cards with Duration Distribution */}
          <div className='flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start'>
            {/* Summary Cards */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4'>
              <div className='bg-gradient-to-br from-[#178da6] to-[#14758c] text-white rounded-lg p-2 md:p-4'>
                <div className='text-[10px] md:text-xs font-semibold opacity-90'>Total Workouts</div>
                <div className='text-lg md:text-2xl font-bold'>{statistics.totalWorkouts}</div>
              </div>
              <div className='bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg p-2 md:p-4'>
                <div className='text-[10px] md:text-xs font-semibold opacity-90'>Unique Workouts</div>
                <div className='text-lg md:text-2xl font-bold'>{statistics.totalUniqueWorkouts}</div>
              </div>
              <div className='bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-2 md:p-4'>
                <div className='text-[10px] md:text-xs font-semibold opacity-90'>Avg WOD</div>
                <div className='text-lg md:text-2xl font-bold'>
                  {statistics.averageWODDuration}
                  <span className='text-xs md:text-base ml-0.5 md:ml-1'>m</span>
                </div>
              </div>
              <div className='bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg p-2 md:p-4'>
                <div className='text-[10px] md:text-xs font-semibold opacity-90'>Total Time</div>
                <div className='text-lg md:text-2xl font-bold'>
                  {statistics.totalWODDuration}
                  <span className='text-xs md:text-base ml-0.5 md:ml-1'>m</span>
                </div>
              </div>
            </div>

            {/* WOD Duration Distribution - Compact */}
            <div className='flex-1'>
              <h3 className='text-xs md:text-sm font-bold text-gray-100 mb-2'>WOD Duration Distribution</h3>
              <div className='grid grid-cols-4 md:grid-cols-7 gap-1 md:gap-2'>
                {statistics.durationBreakdown.map((duration, idx) => (
                  <div
                    key={idx}
                    className='bg-gray-50 rounded-lg p-1.5 md:p-2 text-center border border-gray-200'
                  >
                    <div className='text-sm md:text-lg font-bold text-[#178da6]'>{duration.count}</div>
                    <div className='text-[8px] md:text-[10px] text-gray-700 font-medium leading-tight'>{duration.range}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Exercise Search */}
          <div className='bg-gray-700 border border-gray-500 rounded-lg p-3 md:p-6' style={{ overflowAnchor: 'none' }}>
            <h3 className='text-base md:text-lg font-bold text-gray-100 mb-3 md:mb-4'>Exercise/Movement Search</h3>

            {/* Movement Type Filter Badges */}
            <div className='mb-3 md:mb-4'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='text-xs md:text-sm font-medium text-gray-100'>Movement Type:</span>
              </div>
              <div className='flex flex-wrap gap-1.5 md:gap-2'>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                    onToggleMovementType('lift');
                  }}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-full font-medium transition ${
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
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-full font-medium transition ${
                    selectedMovementTypes.includes('benchmark')
                      ? 'bg-teal-500 text-white'
                      : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                  }`}
                >
                  Bench
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                    onToggleMovementType('forge_benchmark');
                  }}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-full font-medium transition ${
                    selectedMovementTypes.includes('forge_benchmark')
                      ? 'bg-cyan-500 text-white'
                      : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                  }`}
                >
                  Forge
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                    onToggleMovementType('exercise');
                  }}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-full font-medium transition ${
                    selectedMovementTypes.includes('exercise')
                      ? 'bg-[#178da6] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Exercises
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            {categories.length > 0 && (
              <div className='mb-3 md:mb-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <span className='text-xs md:text-sm font-medium text-gray-100'>Category:</span>
                </div>
                <div className='flex flex-wrap gap-1.5 md:gap-2'>
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={(e) => {
                        e.preventDefault();
                        e.currentTarget.blur();
                        onToggleCategory(category);
                      }}
                      className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-sm rounded-full font-medium transition ${
                        selectedCategories.includes(category)
                          ? 'bg-[#178da6] text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <span className='md:hidden'>{MOBILE_CATEGORY_NAMES[category] || category}</span>
                      <span className='hidden md:inline'>{category}</span>
                    </button>
                  ))}
                  <button
                    onClick={onToggleUnusedOnly}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-sm rounded-full font-medium transition border-2 ${
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
                      className='px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-sm rounded-full bg-red-100 text-red-700 hover:bg-red-200 font-medium transition'
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Browse Library Button */}
            <div className='mb-3'>
              <button
                onClick={onOpenLibrary}
                className='w-full flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-[#178da6] hover:bg-[#14758c] text-white rounded-lg font-medium transition text-sm md:text-base'
              >
                <Library size={18} className='md:w-5 md:h-5' />
                <span className='md:hidden'>Library</span>
                <span className='hidden md:inline'>Browse Library</span>
              </button>
            </div>

            {/* Search Input */}
            <div className='relative'>
              <input
                type='text'
                value={exerciseSearch}
                onChange={(e) => onExerciseSearchChange(e.target.value)}
                placeholder='Search exercises...'
                autoComplete='off'
                readOnly
                onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                className='w-full px-3 md:px-4 py-2 md:py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-50 text-sm md:text-base'
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
                          <span className='text-[#178da6] font-bold text-sm ml-2'>{exercise.count}x</span>
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
                    const count = statistics?.allMovementFrequency.find(m => m.name === exerciseName)?.count || 0;
                    return (
                      <span
                        key={exerciseName}
                        className='inline-flex items-center gap-1 px-3 py-2 bg-[#178da6] text-white text-sm rounded-full'
                      >
                        <span className='font-medium'>{exerciseData?.display_name || exerciseName}</span>
                        {exerciseData?.equipment && exerciseData.equipment.length > 0 && (
                          <span className='text-xs opacity-75'>({exerciseData.equipment.join(', ')})</span>
                        )}
                        <span className='text-xs opacity-90'>({count}x)</span>
                        <button
                          onClick={() => onRemoveExercise(exerciseName)}
                          className='hover:bg-[#14758c] rounded-full p-0.5 ml-1'
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
              <p className='text-sm text-gray-500 mt-3'>
                Start typing to search through all exercises in the selected timeframe
              </p>
            )}
          </div>

          {/* Track Breakdown */}
          {statistics.trackBreakdown.length > 0 && (
            <div>
              <h3 className='text-base md:text-lg font-bold text-gray-100 mb-2 md:mb-3'>Workouts by Track</h3>
              <div className='space-y-1.5 md:space-y-2'>
                {statistics.trackBreakdown.map(track => (
                  <div key={track.trackId} className='flex items-center gap-2 md:gap-3'>
                    <div
                      className='w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0'
                      style={{ backgroundColor: track.color }}
                    />
                    <div className='flex-1 flex items-center gap-2 md:gap-3'>
                      <span className='text-gray-100 font-medium text-xs md:text-base min-w-[80px] md:min-w-[150px] truncate'>
                        {track.trackName}
                      </span>
                      <div className='flex-1 bg-gray-200 rounded-full h-5 md:h-6 relative'>
                        <div
                          className='h-5 md:h-6 rounded-full transition-all'
                          style={{
                            width: `${(track.count / statistics.totalWorkouts) * 100}%`,
                            backgroundColor: track.color,
                          }}
                        />
                        <span className='absolute inset-0 flex items-center justify-center text-xs md:text-sm font-semibold text-gray-700'>
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
              <h3 className='text-base md:text-lg font-bold text-gray-100 mb-2 md:mb-3'>Workouts by Type</h3>
              <div className='grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3'>
                {statistics.typeBreakdown.map(type => (
                  <div
                    key={type.typeId}
                    className='bg-gray-50 rounded-lg p-2 md:p-4 text-center border border-gray-200'
                  >
                    <div className='text-lg md:text-2xl font-bold text-[#178da6]'>{type.count}</div>
                    <div className='text-[10px] md:text-sm text-gray-700 font-medium mt-0.5 md:mt-1 truncate'>
                      {type.typeName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Type Breakdown */}
          {statistics.sectionTypeBreakdown.length > 0 && (
            <div>
              <h3 className='text-base md:text-lg font-bold text-gray-100 mb-2 md:mb-3'>Section Types Used</h3>
              <div className='grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3'>
                {statistics.sectionTypeBreakdown.map(section => (
                  <div
                    key={section.sectionType}
                    className='bg-gray-50 rounded-lg p-2 md:p-4 text-center border border-gray-200'
                  >
                    <div className='text-lg md:text-2xl font-bold text-blue-600'>{section.count}x</div>
                    <div className='text-[10px] md:text-sm text-gray-700 font-medium mt-0.5 md:mt-1 truncate'>
                      {section.sectionType}
                    </div>
                    {section.totalDuration > 0 && (
                      <div className='text-xs md:text-sm text-gray-600 font-semibold mt-1'>
                        {section.totalDuration}m
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercise Frequency */}
          {filteredTopExercises.length > 0 && (
            <div style={{ overflowAnchor: 'none' }}>
              <h3 className='text-base md:text-lg font-bold text-gray-100 mb-2 md:mb-3'>
                Top Exercises{selectedCategories.length > 0 && ` (${selectedCategories.join(', ')})`}
              </h3>
              <div className='flex flex-wrap gap-1.5 md:gap-2'>
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
                      className='inline-flex items-center px-2 md:px-3 py-1 md:py-2 bg-gray-100 text-gray-900 border-2 border-[#178da6] text-[10px] md:text-sm rounded-full font-medium'
                    >
                      {exerciseData?.display_name || exercise.exercise} ({exercise.count}x)
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {statistics.totalWorkouts === 0 && (
            <div className='text-center py-8 md:py-12 text-gray-500'>
              <BarChart3 size={36} className='md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-gray-400' />
              <p className='text-base md:text-lg'>No workouts found for this month</p>
              <p className='text-xs md:text-sm mt-2'>
                Create some workouts on the dashboard to see statistics here.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className='text-center py-8 md:py-12 text-gray-500'>
          <BarChart3 size={36} className='md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-gray-400' />
          <p className='text-base md:text-lg'>No data available</p>
        </div>
      )}
    </div>
  );
}
