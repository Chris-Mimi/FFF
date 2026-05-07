'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useScoreEntry } from '@/hooks/coach/useScoreEntry';
import ScoreEntryGrid from './ScoreEntryGrid';

interface ScoreEntryModalProps {
  sessionId: string;
  onClose: () => void;
}

export default function ScoreEntryModal({ sessionId, onClose }: ScoreEntryModalProps) {
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

  // Format date for display
  const dateStr = session
    ? new Date(session.date + 'T00:00:00').toLocaleDateString('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const timeStr = session?.time?.substring(0, 5) || '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40">
      <div className="w-full max-w-3xl h-full bg-gray-50 overflow-y-auto relative">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                {session && wod && (
                  <>
                    <div className="text-sm font-semibold text-gray-800">
                      {dateStr} · {timeStr}
                    </div>
                    <div className="text-xs text-gray-500">
                      {wod.workout_name || wod.session_type || 'Workout'}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 text-gray-400 hover:text-gray-700 transition"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Section chips */}
            {!loading && session && wod && scorableSections.length > 0 && (
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

                {/* Configured movements — lift / benchmark / forge benchmark chips */}
                {selectedSection &&
                  ((selectedSection.lifts?.length ?? 0) > 0 ||
                    (selectedSection.benchmarks?.length ?? 0) > 0 ||
                    (selectedSection.forge_benchmarks?.length ?? 0) > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedSection.lifts?.map((lift, i) => {
                        const repScheme = lift.rm_test
                          ? lift.rm_test
                          : lift.rep_type === 'constant'
                            ? `${lift.sets || 1}x${lift.reps || 1}`
                            : lift.variable_sets?.map(s => s.reps).join('-') || '';
                        return (
                          <span
                            key={`lift-${i}`}
                            className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200"
                          >
                            {lift.name}{repScheme ? ` · ${repScheme}` : ''}
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
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading session...</div>
          ) : !session || !wod ? (
            <div className="text-center py-12 text-gray-500">Session or workout not found</div>
          ) : scorableSections.length === 0 ? (
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
    </div>
  );
}
