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

              {/* Section content preview */}
              {selectedSection?.content && (
                <div className="mt-2 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600 whitespace-pre-line max-h-32 overflow-y-auto">
                  {selectedSection.content}
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
