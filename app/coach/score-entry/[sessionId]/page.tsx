'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useScoreEntry } from '@/hooks/coach/useScoreEntry';
import ScoreEntryGrid from '@/components/coach/score-entry/ScoreEntryGrid';

export default function ScoreEntryPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const {
    session,
    wod,
    athletes,
    loading,
    saving,
    scores,
    scorableSections,
    selectedSectionId,
    selectedSection,
    setSelectedSectionId,
    updateScore,
    saveScores,
    fetchData,
  } = useScoreEntry(sessionId);

  useEffect(() => {
    if (sessionId) fetchData();
  }, [sessionId, fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading session...</div>
      </div>
    );
  }

  if (!session || !wod) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="text-gray-500">Session or workout not found</div>
        <button
          onClick={() => router.push('/coach')}
          className="text-sm text-[#178da6] hover:underline"
        >
          Back to Calendar
        </button>
      </div>
    );
  }

  // Format date for display
  const dateStr = new Date(session.date + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = session.time?.substring(0, 5) || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/coach')}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <span>←</span> Back
            </button>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-800">
                {dateStr} · {timeStr}
              </div>
              <div className="text-xs text-gray-500">
                {wod.workout_name || wod.session_type || 'Workout'}
              </div>
            </div>
          </div>

          {/* Section chips */}
          {scorableSections.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 flex-wrap">
                {scorableSections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSectionId(s.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedSectionId === s.id
                        ? 'bg-[#178da6] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.type} ({s.duration} min)
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-auto">
                  {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Configured movements — surfaces lift / benchmark / forge benchmark
                  names so the coach doesn't have to duplicate them in content. */}
              {selectedSection &&
                ((selectedSection.lifts?.length ?? 0) > 0 ||
                  (selectedSection.benchmarks?.length ?? 0) > 0 ||
                  (selectedSection.forge_benchmarks?.length ?? 0) > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedSection.lifts?.map((l, i) => {
                      const repScheme = l.rm_test
                        ? l.rm_test
                        : l.rep_type === 'constant'
                          ? `${l.sets || 1}x${l.reps || 1}`
                          : l.variable_sets?.map(s => s.reps).join('-') || '';
                      return (
                        <span
                          key={`lift-${i}`}
                          className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200"
                        >
                          {l.name}{repScheme ? ` · ${repScheme}` : ''}
                        </span>
                      );
                    })}
                    {selectedSection.benchmarks?.map((b, i) => (
                      <span
                        key={`bm-${i}`}
                        className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200"
                      >
                        Benchmark · {b.name}
                      </span>
                    ))}
                    {selectedSection.forge_benchmarks?.map((f, i) => (
                      <span
                        key={`fb-${i}`}
                        className="text-xs px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200"
                      >
                        Forge · {f.name}
                      </span>
                    ))}
                  </div>
                )}

              {/* Benchmark / Forge detail — exercises + description from JSONB snapshot */}
              {selectedSection &&
                ((selectedSection.benchmarks?.some(b => (b.exercises?.length ?? 0) > 0 || !!b.description?.trim()) ?? false) ||
                  (selectedSection.forge_benchmarks?.some(f => (f.exercises?.length ?? 0) > 0 || !!f.description?.trim()) ?? false)) && (
                  <div className="mt-2 px-3 py-2 bg-teal-50 rounded border border-teal-200 text-xs text-teal-900 space-y-2 max-h-40 overflow-y-auto">
                    {selectedSection.benchmarks?.map((b, i) => {
                      const hasExercises = (b.exercises?.length ?? 0) > 0;
                      const hasDesc = !!b.description?.trim();
                      if (!hasExercises && !hasDesc) return null;
                      return (
                        <div key={`bm-detail-${i}`}>
                          <div className="font-semibold">{b.name}</div>
                          {hasExercises && <div className="mt-0.5">{b.exercises!.join(' • ')}</div>}
                          {hasDesc && <div className="mt-0.5 whitespace-pre-wrap text-teal-800/90">{b.description}</div>}
                        </div>
                      );
                    })}
                    {selectedSection.forge_benchmarks?.map((f, i) => {
                      const hasExercises = (f.exercises?.length ?? 0) > 0;
                      const hasDesc = !!f.description?.trim();
                      if (!hasExercises && !hasDesc) return null;
                      return (
                        <div key={`fb-detail-${i}`}>
                          <div className="font-semibold">{f.name}</div>
                          {hasExercises && <div className="mt-0.5">{f.exercises!.join(' • ')}</div>}
                          {hasDesc && <div className="mt-0.5 whitespace-pre-wrap text-teal-800/90">{f.description}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

              {/* Section content preview */}
              {selectedSection?.content && (
                <div className="mt-2 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600 max-h-32 overflow-y-auto overflow-x-auto">
                  {/* pre-line collapsed runs of spaces, which flattened any
                      space-aligned table. pre-wrap keeps them; a monospace
                      section uses pre + horizontal scroll so a wide table row
                      scrolls instead of wrapping. */}
                  <div className={selectedSection.monospace ? 'font-mono whitespace-pre' : 'whitespace-pre-wrap'}>
                    {selectedSection.content}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {scorableSections.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No scorable sections in this workout
          </div>
        ) : selectedSection ? (
          <>
            <ScoreEntryGrid
              athletes={athletes}
              section={selectedSection}
              scores={scores}
              onUpdateScore={updateScore}
            />

            {/* Save button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={saveScores}
                disabled={saving}
                className="px-8 py-2 bg-[#178da6] text-white text-sm font-medium rounded hover:bg-[#147a91] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save All Scores'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
