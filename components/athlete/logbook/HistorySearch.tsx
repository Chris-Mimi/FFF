'use client';

/**
 * Search your own workout history, inside the Logbook.
 *
 * Browse-first by design: CFH's members are German and movement names are English, so
 * picking a name out of a list beats recalling one. The chips come from the athlete's own
 * workout names — Chris writes those as movement lists in the gym's shorthand ("Run, T2B,
 * Burpee, Bear Crawl, WBs"), so they're exactly the words on the whiteboard. Most-used
 * first, because the movements you do often are the ones you look up. Typing is secondary
 * and searches the published workout text too, so the long form ("handstand hold") finds
 * a workout whose name only says "HS Hold".
 */

import { useMemo, useState } from 'react';
import { useHistorySearch } from '@/hooks/athlete/useHistorySearch';
import { filterHistory, suggestTerms } from '@/utils/athlete-history-search';

interface HistorySearchProps {
  userId: string;
  /** Jump to this workout's leaderboard (parent switches tab + date) */
  onOpenLeaderboard: (date: string) => void;
}

const INITIAL_CHIPS = 24;

/** "2026-08-24" → "Mon 24 Aug 2026" */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function HistorySearch({ userId, onOpenLeaderboard }: HistorySearchProps) {
  const { entries, terms, loading, error, reload } = useHistorySearch(userId, true);

  const [query, setQuery] = useState('');
  const [term, setTerm] = useState<string | null>(null);
  const [showAllChips, setShowAllChips] = useState(false);

  const suggestions = useMemo(
    () => (term ? [] : suggestTerms(entries, query)),
    [entries, query, term]
  );

  const results = useMemo(
    () => filterHistory(entries, { query: term ? '' : query, term }),
    [entries, query, term]
  );

  const isFiltering = !!term || query.trim().length > 0;
  const visibleChips = showAllChips ? terms : terms.slice(0, INITIAL_CHIPS);

  const clearAll = () => {
    setQuery('');
    setTerm(null);
  };

  if (loading) {
    return (
      <div className='py-12 text-center text-gray-500 text-sm'>
        Loading your workout history…
      </div>
    );
  }

  if (error) {
    return (
      <div className='py-10 text-center'>
        <p className='text-sm text-gray-600 mb-3'>{error}</p>
        <button
          onClick={reload}
          className='px-4 py-2 rounded-md bg-[#178da6] text-white text-sm font-medium'
        >
          Try again
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className='py-12 text-center text-gray-500 text-sm'>
        No workouts yet — once you&apos;ve trained a few sessions they&apos;ll show up here.
      </div>
    );
  }

  return (
    <div>
      {/* Type-ahead */}
      <div className='relative mb-4'>
        <input
          type='text'
          value={term ?? query}
          onChange={(e) => {
            setTerm(null);
            setQuery(e.target.value);
          }}
          placeholder='Search a movement or workout'
          aria-label='Search your workouts'
          className='w-full pl-3 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
        />
        {isFiltering && (
          <button
            onClick={clearAll}
            aria-label='Clear search'
            className='absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-gray-400 hover:text-gray-700 text-lg leading-none'
          >
            ×
          </button>
        )}

        {suggestions.length > 0 && (
          <ul className='absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto'>
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  onClick={() => {
                    setTerm(name);
                    setQuery('');
                  }}
                  className='w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50'
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Browse — the primary route */}
      {!isFiltering && terms.length > 0 && (
        <div className='mb-6'>
          <p className='text-xs text-gray-500 mb-2'>Or tap a movement you&apos;ve done:</p>
          <div className='flex flex-wrap gap-2'>
            {visibleChips.map(({ term: name, count }) => (
              <button
                key={name}
                onClick={() => {
                  setTerm(name);
                  setQuery('');
                }}
                className='px-2.5 py-1 rounded-full bg-gray-100 hover:bg-[#178da6] hover:text-white text-xs text-gray-700 transition'
              >
                {name}
                <span className='ml-1.5 text-gray-400'>{count}</span>
              </button>
            ))}
          </div>
          {terms.length > INITIAL_CHIPS && (
            <button
              onClick={() => setShowAllChips((v) => !v)}
              className='mt-3 text-xs font-medium text-[#178da6]'
            >
              {showAllChips
                ? 'Show fewer'
                : `Show all ${terms.length} movements`}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {isFiltering && (
        <>
          <p className='text-xs text-gray-500 mb-3'>
            {results.length === 0
              ? 'No workouts found'
              : `${results.length} workout${results.length === 1 ? '' : 's'}`}
            {term && (
              <>
                {' '}
                with <span className='font-medium text-gray-700'>{term}</span>
              </>
            )}
          </p>

          <div className='space-y-3'>
            {results.map((entry) => (
              <div
                key={entry.wodId}
                className='border border-gray-200 rounded-lg p-3 bg-white'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-gray-900'>{entry.title}</p>
                    <p className='text-xs text-gray-500 mt-0.5'>
                      {formatDate(entry.date)}
                      {entry.time && <span> · {entry.time}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenLeaderboard(entry.date)}
                    className='shrink-0 px-2.5 py-1.5 rounded-md bg-[#178da6] text-white text-xs font-medium'
                  >
                    Leaderboard
                  </button>
                </div>

                {entry.scores.length > 0 ? (
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {entry.scores.map((score, i) => (
                      <span
                        key={`${entry.wodId}-${i}`}
                        className='px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-xs'
                      >
                        <span className='text-teal-600'>{score.label}:</span> {score.text}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className='mt-2 text-xs text-gray-400 italic'>No score recorded</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
