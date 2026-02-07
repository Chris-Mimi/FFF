'use client';

import {
  MembershipType,
  ClassType,
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_TYPE_COLORS,
  CLASS_TYPE_LABELS,
  CLASS_TYPE_COLORS,
} from '@/types/member';

interface MemberFiltersProps {
  attendanceTimeframe: 7 | 30 | 365 | 'all';
  onTimeframeChange: (value: 7 | 30 | 365 | 'all') => void;
  ageFilter: 'all' | 'adults' | 'kids' | '<7' | '7-11' | '12-16' | '7-16';
  onAgeFilterChange: (value: 'all' | 'adults' | 'kids' | '<7' | '7-11' | '12-16' | '7-16') => void;
  selectedFilters: MembershipType[];
  onToggleFilter: (type: MembershipType) => void;
  onClearFilters: () => void;
  membershipCounts: Record<MembershipType, number>;
  filteredCount: number;
  selectedClassTypes: ClassType[];
  onToggleClassType: (type: ClassType) => void;
  onClearClassTypes: () => void;
  hasMembers: boolean;
}

export default function MemberFilters({
  attendanceTimeframe,
  onTimeframeChange,
  ageFilter,
  onAgeFilterChange,
  selectedFilters,
  onToggleFilter,
  onClearFilters,
  membershipCounts,
  filteredCount,
  selectedClassTypes,
  onToggleClassType,
  onClearClassTypes,
  hasMembers,
}: MemberFiltersProps) {
  if (!hasMembers) return null;

  const isKidsFilter = ageFilter === 'kids' || ageFilter === '7-16' || ageFilter === '<7' || ageFilter === '7-11' || ageFilter === '12-16';

  return (
    <>
      {/* Attendance Timeframe Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 font-medium">Attendance timeframe:</span>
          <select
            value={attendanceTimeframe}
            onChange={(e) => {
              const value = e.target.value;
              onTimeframeChange(value === 'all' ? 'all' : parseInt(value) as 7 | 30 | 365);
            }}
            className="px-3 py-1 bg-gray-700 text-white rounded text-sm border border-gray-600"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="365">Last 12 months</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          {/* Age Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-gray-400 font-medium">Age:</span>
            <select
              value={ageFilter}
              onChange={(e) => onAgeFilterChange(e.target.value as typeof ageFilter)}
              className="px-2 md:px-3 py-1 bg-gray-700 border border-gray-600 rounded text-xs md:text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">All</option>
              <option value="adults">Adults</option>
              <option value="kids">Kids (&lt;16)</option>
              <option value="12-16">12-16</option>
              <option value="7-16">7-16</option>
              <option value="7-11">7-11</option>
              <option value="<7">&lt;7</option>
            </select>
          </div>

          {/* Membership Type Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 flex-1">
            <span className="text-xs md:text-sm text-gray-400 font-medium">Member Type:</span>
            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
              {(Object.keys(MEMBERSHIP_TYPE_LABELS) as MembershipType[])
                .filter(type => {
                  if (isKidsFilter) {
                    return ['member', 'ten_card', 'wellpass'].includes(type);
                  }
                  return true;
                })
                .map(type => (
              <button
                key={type}
                onClick={() => onToggleFilter(type)}
                className={`flex flex-col items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded text-xs font-medium transition ${
                  selectedFilters.includes(type)
                    ? MEMBERSHIP_TYPE_COLORS[type].active
                    : MEMBERSHIP_TYPE_COLORS[type].inactive
                }`}
              >
                <span>{MEMBERSHIP_TYPE_LABELS[type]}</span>
                <span className="text-[10px] opacity-75">{membershipCounts[type]}</span>
              </button>
            ))}
              {selectedFilters.length > 0 && (
                <button
                  onClick={onClearFilters}
                  className="px-2 md:px-2.5 py-0.5 md:py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Clear ({filteredCount})
                </button>
              )}
              <div className="ml-auto px-2 md:px-3 py-0.5 md:py-1 bg-gray-700 rounded text-xs font-medium text-gray-300">
                Total: {filteredCount}
              </div>
            </div>
          </div>

          {/* Class Type Filters (only show for kids) */}
          {isKidsFilter && (
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-xs md:text-sm text-gray-400 font-medium">Class:</span>
              <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                {(Object.keys(CLASS_TYPE_LABELS) as ClassType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => onToggleClassType(type)}
                    className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded text-xs font-medium transition ${
                      selectedClassTypes.includes(type)
                        ? CLASS_TYPE_COLORS[type].active
                        : CLASS_TYPE_COLORS[type].inactive
                    }`}
                  >
                    {CLASS_TYPE_LABELS[type]}
                  </button>
                ))}
                {selectedClassTypes.length > 0 && (
                  <button
                    onClick={onClearClassTypes}
                    className="px-2 md:px-2.5 py-0.5 md:py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
