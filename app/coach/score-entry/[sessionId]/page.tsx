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

  // Navigate between scorable sections
  const currentIdx = scorableSections.findIndex((s) => s.id === selectedSectionId);
  const hasNext = currentIdx < scorableSections.length - 1;
  const hasPrev = currentIdx > 0;

  const goNextSection = () => {
    if (hasNext) setSelectedSectionId(scorableSections[currentIdx + 1].id);
  };
  const goPrevSection = () => {
    if (hasPrev) setSelectedSectionId(scorableSections[currentIdx - 1].id);
  };

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

          {/* Section selector */}
          {scorableSections.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Section:</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:ring-2 focus:ring-[#178da6]"
              >
                {scorableSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.type} ({s.duration} min)
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400 ml-auto">
                {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}
              </span>
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

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                {hasPrev && (
                  <button
                    onClick={goPrevSection}
                    className="text-sm px-3 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    ← Previous
                  </button>
                )}
              </div>

              <button
                onClick={saveScores}
                disabled={saving}
                className="px-6 py-2 bg-[#178da6] text-white text-sm font-medium rounded hover:bg-[#147a91] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Scores'}
              </button>

              <div className="flex gap-2">
                {hasNext && (
                  <button
                    onClick={goNextSection}
                    className="text-sm px-3 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
