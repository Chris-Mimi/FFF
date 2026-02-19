'use client';

import BenchmarksTab from '@/components/coach/BenchmarksTab';
import ExercisesTab from '@/components/coach/ExercisesTab';
import ExerciseVideoModal from '@/components/coach/ExerciseVideoModal';
import ForgeBenchmarksTab from '@/components/coach/ForgeBenchmarksTab';
import LiftsTab from '@/components/coach/LiftsTab';
import ReferencesTab from '@/components/coach/ReferencesTab';
import ProgrammingNotesTab from '@/components/coach/ProgrammingNotesTab';
import TracksTab from '@/components/coach/TracksTab';
import AchievementsTab from '@/components/coach/AchievementsTab';
import { getCurrentUser } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBenchmarksCrud } from '@/hooks/coach/useBenchmarksCrud';
import { useForgeBenchmarksCrud } from '@/hooks/coach/useForgeBenchmarksCrud';
import { useLiftsCrud } from '@/hooks/coach/useLiftsCrud';
import { useExercisesCrud } from '@/hooks/coach/useExercisesCrud';
import { useReferencesCrud } from '@/hooks/coach/useReferencesCrud';
import { useTracksCrud } from '@/hooks/coach/useTracksCrud';
import { useWorkoutTypesCrud } from '@/hooks/coach/useWorkoutTypesCrud';

export default function BenchmarksLiftsManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'forge' | 'lifts' | 'exercises' | 'references' | 'tracks' | 'notes' | 'achievements'>('benchmarks');
  const [loading, setLoading] = useState(true);

  // Domain hooks
  const benchmarksCrud = useBenchmarksCrud();
  const forgeCrud = useForgeBenchmarksCrud();
  const liftsCrud = useLiftsCrud();
  const exercisesCrud = useExercisesCrud();
  const referencesCrud = useReferencesCrud();
  const tracksCrud = useTracksCrud();
  const workoutTypesCrud = useWorkoutTypesCrud();

  useEffect(() => {
    let cancelled = false;

    const runAuth = async () => {
      if (!cancelled) {
        await checkAuth();
      }
    };

    runAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!loading && !cancelled) {
        await Promise.all([
          benchmarksCrud.fetchBenchmarks(),
          forgeCrud.fetchForgeBenchmarks(),
          liftsCrud.fetchLifts(),
          exercisesCrud.fetchExercises(),
          referencesCrud.fetchReferences(),
          workoutTypesCrud.fetchWorkoutTypes(),
          tracksCrud.fetchTracks(),
        ]);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [loading]);

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    const role = currentUser.user_metadata?.role || 'athlete';
    if (role !== 'coach') {
      router.push('/coach');
      return;
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-400'>
      {/* Header */}
      <div className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-2 sm:px-4 lg:px-8'>
          <div className='flex items-center gap-1 sm:gap-2 md:gap-4 py-2 md:py-4'>
            <button
              onClick={() => router.push('/coach')}
              className='flex items-center gap-1 p-1 sm:p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition text-gray-700 text-xs sm:text-sm'
            >
              <ArrowLeft size={16} className='sm:w-5 sm:h-5 md:w-6 md:h-6' />
              <span className='md:hidden'>Back</span>
            </button>
            <div>
              <h1 className='text-base sm:text-xl md:text-3xl font-bold text-gray-900'>Toolkit</h1>
              <p className='text-[10px] sm:text-xs md:text-sm text-gray-600 hidden md:block'>Manage benchmarks, lifts, exercises, programming references, and notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 md:py-8'>
        {/* Tabs */}
        <div className='flex gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-4 md:mb-6 overflow-x-auto pb-2'>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg font-medium transition text-[10px] sm:text-xs md:text-base whitespace-nowrap ${
              activeTab === 'benchmarks'
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('forge')}
            className={`px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg font-medium transition text-[10px] sm:text-xs md:text-base whitespace-nowrap ${
              activeTab === 'forge'
                ? 'bg-cyan-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Forge
          </button>
          <button
            onClick={() => setActiveTab('lifts')}
            className={`px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg font-medium transition text-[10px] sm:text-xs md:text-base whitespace-nowrap ${
              activeTab === 'lifts'
                ? 'bg-blue-400 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Lifts
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg font-medium transition text-[10px] sm:text-xs md:text-base whitespace-nowrap ${
              activeTab === 'exercises'
                ? 'bg-[#14b8a6] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Exercises
          </button>
          <button
            onClick={() => setActiveTab('references')}
            className={`px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg font-medium transition text-[10px] sm:text-xs md:text-base whitespace-nowrap ${
              activeTab === 'references'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Refs
          </button>
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg font-medium transition text-[10px] sm:text-xs md:text-base whitespace-nowrap ${
              activeTab === 'tracks'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tracks
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg font-medium transition text-[10px] sm:text-xs md:text-base whitespace-nowrap ${
              activeTab === 'notes'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Aids
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg font-medium transition text-[10px] sm:text-xs md:text-base whitespace-nowrap ${
              activeTab === 'achievements'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Achievements
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'benchmarks' && (
          <BenchmarksTab
            benchmarks={benchmarksCrud.benchmarks}
            onAdd={() => benchmarksCrud.openBenchmarkModal()}
            onEdit={benchmarksCrud.openBenchmarkModal}
            onDelete={benchmarksCrud.deleteBenchmark}
            showModal={benchmarksCrud.showBenchmarkModal}
            onCloseModal={() => benchmarksCrud.setShowBenchmarkModal(false)}
            editingBenchmark={benchmarksCrud.editingBenchmark}
            form={benchmarksCrud.benchmarkForm}
            onFormChange={benchmarksCrud.handleBenchmarkFormChange}
            onSave={benchmarksCrud.saveBenchmark}
            workoutTypes={workoutTypesCrud.workoutTypes}
            loadingWorkoutTypes={workoutTypesCrud.loadingWorkoutTypes}
          />
        )}

        {activeTab === 'forge' && (
          <ForgeBenchmarksTab
            forgeBenchmarks={forgeCrud.forgeBenchmarks}
            onAdd={() => forgeCrud.openForgeModal()}
            onEdit={forgeCrud.openForgeModal}
            onDelete={forgeCrud.deleteForge}
            onDragEnd={forgeCrud.handleForgeDragEnd}
            onInsertRow={forgeCrud.handleInsertForgeRow}
            showModal={forgeCrud.showForgeModal}
            onCloseModal={() => forgeCrud.setShowForgeModal(false)}
            editingForge={forgeCrud.editingForge}
            form={forgeCrud.forgeForm}
            onFormChange={forgeCrud.handleForgeFormChange}
            onSave={forgeCrud.saveForge}
            workoutTypes={workoutTypesCrud.workoutTypes}
            loadingWorkoutTypes={workoutTypesCrud.loadingWorkoutTypes}
          />
        )}

        {activeTab === 'lifts' && (
          <LiftsTab
            lifts={liftsCrud.lifts}
            onAdd={() => liftsCrud.openLiftModal()}
            onEdit={liftsCrud.openLiftModal}
            onDelete={liftsCrud.deleteLift}
            onDragEnd={liftsCrud.handleLiftDragEnd}
            showModal={liftsCrud.showLiftModal}
            onCloseModal={() => liftsCrud.setShowLiftModal(false)}
            editingLift={liftsCrud.editingLift}
            form={liftsCrud.liftForm}
            onFormChange={liftsCrud.handleLiftFormChange}
            onSave={liftsCrud.saveLift}
          />
        )}

        {activeTab === 'exercises' && (
          <ExercisesTab
            exercises={exercisesCrud.exercises}
            onAdd={() => {
              exercisesCrud.setEditingExercise(null);
              exercisesCrud.setShowExerciseModal(true);
            }}
            onEdit={(exercise) => {
              exercisesCrud.setEditingExercise(exercise);
              exercisesCrud.setShowExerciseModal(true);
            }}
            onDelete={exercisesCrud.handleDeleteExercise}
            searchTerm={exercisesCrud.exerciseSearchTerm}
            onSearchChange={exercisesCrud.setExerciseSearchTerm}
            collapsedCategories={exercisesCrud.collapsedExerciseCategories}
            onToggleCategory={exercisesCrud.toggleExerciseCategory}
            showModal={exercisesCrud.showExerciseModal}
            onCloseModal={() => {
              exercisesCrud.setShowExerciseModal(false);
              exercisesCrud.setEditingExercise(null);
            }}
            editingExercise={exercisesCrud.editingExercise}
            onSave={exercisesCrud.handleSaveExercise}
            onOpenVideoModal={exercisesCrud.openVideoModal}
          />
        )}

        {activeTab === 'references' && (
          <ReferencesTab
            references={referencesCrud.references}
            collapsedSections={referencesCrud.collapsedSections}
            onToggleSection={referencesCrud.toggleSection}
            onAddReference={referencesCrud.handleAddReference}
            onEditReference={referencesCrud.handleEditReference}
            onDeleteReference={referencesCrud.handleDeleteReference}
            showModal={referencesCrud.showReferenceModal}
            onCloseModal={() => {
              referencesCrud.setShowReferenceModal(false);
              referencesCrud.setEditingReference(null);
            }}
            editingReference={referencesCrud.editingReference}
            referenceType={referencesCrud.referenceType}
            form={referencesCrud.referenceForm}
            onFormChange={referencesCrud.handleReferenceFormChange}
            onSave={referencesCrud.handleSaveReference}
          />
        )}

        {activeTab === 'tracks' && (
          <TracksTab
            tracks={tracksCrud.tracks}
            loadingTracks={tracksCrud.loadingTracks}
            showTrackModal={tracksCrud.showTrackModal}
            editingTrack={tracksCrud.editingTrack}
            trackFormData={tracksCrud.trackFormData}
            onAdd={() => tracksCrud.openTrackModal(null)}
            onEdit={(track) => tracksCrud.openTrackModal(track)}
            onDelete={tracksCrud.handleDeleteTrack}
            onSave={tracksCrud.handleSaveTrack}
            onCloseModal={() => tracksCrud.setShowTrackModal(false)}
            onFormChange={tracksCrud.handleTrackFormChange}
          />
        )}

        {activeTab === 'notes' && <ProgrammingNotesTab />}

        {activeTab === 'achievements' && <AchievementsTab />}
      </div>

      {/* Video Modal */}
      <ExerciseVideoModal
        isOpen={exercisesCrud.videoModalOpen}
        onClose={exercisesCrud.closeVideoModal}
        videoUrl={exercisesCrud.selectedVideoUrl}
        exerciseName={exercisesCrud.selectedVideoName}
      />
    </div>
  );
}
