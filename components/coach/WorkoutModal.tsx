'use client';

import MovementLibraryPopup from '@/components/coach/MovementLibraryPopup';
import ConfigureLiftModal from '@/components/coach/ConfigureLiftModal';
import ConfigureBenchmarkModal from '@/components/coach/ConfigureBenchmarkModal';
import ConfigureForgeBenchmarkModal from '@/components/coach/ConfigureForgeBenchmarkModal';
import PublishModal from '@/components/coach/PublishModal';
import WODSectionComponent from '@/components/coach/WODSectionComponent';
import WorkoutFormFields from '@/components/coach/WorkoutFormFields';
import WorkoutModalHeader from '@/components/coach/WorkoutModalHeader';
import CoachNotesPanel from '@/components/coach/CoachNotesPanel';
import MovementDemosBar from '@/components/coach/MovementDemosBar';
import { useWorkoutModal, WODFormData } from '@/hooks/coach/useWorkoutModal';
import { FocusTrap } from '@/components/ui/FocusTrap';
import { useEffect, useState } from 'react';

// Re-export types for backwards compatibility
export type { WODFormData, WODSection } from '@/hooks/coach/useWorkoutModal';
import {
  Library,
  Plus,
} from 'lucide-react';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wod: WODFormData) => void;
  date: Date;
  editingWOD?: WODFormData | null;
  isPanel?: boolean;
  panelOffset?: number;
  initialNotesOpen?: boolean;
  onNotesToggle?: (open: boolean) => void;
  onTimeUpdated?: () => void;
}

export default function WorkoutModal({
  isOpen,
  onClose,
  onSave,
  date,
  editingWOD,
  isPanel = false,
  initialNotesOpen = false,
  onNotesToggle,
  onTimeUpdated,
}: WorkoutModalProps) {
  const hook = useWorkoutModal(
    isOpen,
    date,
    editingWOD,
    onSave,
    onClose,
    onTimeUpdated,
    initialNotesOpen
  );

  // Use hook's live sessionTime (updated after inline time edit), falling back to editingWOD prop
  const publishSessionTime = hook.sessionTime || editingWOD?.publish_time || editingWOD?.booking_info?.time;

  // Track the VISUAL viewport on mobile so the panel shrinks when the on-screen
  // keyboard opens (S379). The panel is sized with `100vh`, which measures the
  // LAYOUT viewport — the keyboard does NOT shrink it — so tapping into a section's
  // text field made the whole fixed panel taller than the visible area and the
  // browser scrolled it, carrying the sticky "Library / + Section" bar off the top.
  // Sizing to visualViewport keeps that bar pinned at the top of the screen.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024
  );
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [mobileViewport, setMobileViewport] = useState<{ height: number; offsetTop: number } | null>(null);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!isMobile || !vv) {
      setMobileViewport(null);
      return;
    }
    const update = () => setMobileViewport({ height: vv.height, offsetTop: vv.offsetTop });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [isMobile]);

  if (!isOpen) return null;

  const totalDuration = hook.getTotalDuration();

  if (isPanel) {
    return (
      <>
        {/* Coach Notes Floating Modal */}
        <CoachNotesPanel
          isOpen={hook.notesPanelOpen}
          notes={hook.formData.coach_notes || ''}
          mode='floating'
          position={hook.notesModalPos}
          size={hook.notesModalSize}
          zIndex={hook.notesZIndex}
          onDragStart={hook.handleNotesDragStart}
          onResizeStart={hook.handleNotesResizeStart}
          onBringToFront={hook.bringNotesToFront}
          onClose={() => {
            hook.setNotesPanelOpen(false);
            onNotesToggle?.(false);
          }}
          onChange={(notes) => hook.handleChange('coach_notes', notes)}
        />

        {/* WOD Panel - full width on mobile, 800px on desktop */}
        <div
          className='fixed left-0 top-[72px] h-[calc(100vh-72px)] w-full lg:w-[800px] bg-white shadow-2xl flex flex-col border-r-2 border-[#178da6] border-t border-gray-400 animate-slide-in-left'
          style={{
            zIndex: hook.workoutPanelZIndex,
            // On mobile, pin to the visual viewport (below the 72px nav) so the
            // on-screen keyboard shrinks the panel instead of scrolling the sticky
            // "Library / + Section" bar off the top (S379).
            ...(isMobile && mobileViewport
              ? { top: mobileViewport.offsetTop + 72, height: mobileViewport.height - 72 }
              : {}),
          }}
          onMouseDown={hook.bringWorkoutToFront}
        >
          {/* Header */}
          <WorkoutModalHeader
            editingWOD={editingWOD}
            notesPanelOpen={hook.notesPanelOpen}
            sessionTime={hook.sessionTime}
            editingTime={hook.editingTime}
            tempTime={hook.tempTime}
            newSessionTime={hook.newSessionTime}
            hasNotes={!!(hook.formData.coach_notes && hook.formData.coach_notes.trim().length > 0)}
            onNotesToggle={(open) => {
              hook.setNotesPanelOpen(open);
              onNotesToggle?.(open);
            }}
            onTimeEditToggle={hook.setEditingTime}
            onTimeChange={(time, isNew) => {
              if (isNew) { hook.setNewSessionTime(time); } else { hook.setTempTime(time); }
            }}
            onTimeSave={hook.handleTimeUpdate}
            onTempTimeChange={hook.setTempTime}
            onUnpublish={hook.handleUnpublish}
            onPublishClick={hook.requestOpenPublishModal}
            onSave={async () => {
              if (hook.validate()) {
                // Save any pending time changes first
                if (editingWOD && hook.sessionTime && hook.tempTime !== hook.sessionTime.substring(0, 5)) {
                  await hook.handleTimeUpdate();
                }
                const dataToSave = {
                  ...hook.formData,
                  classTimes: !editingWOD ? [hook.newSessionTime] : hook.formData.classTimes,
                };
                await onSave(dataToSave);
                onClose();
              }
            }}
            onClose={onClose}
          />

          {/* Content Area - Form Only */}
          <form
            onSubmit={hook.handleSubmit}
            className='flex-1 min-h-0 overflow-y-auto p-6 space-y-6'
            onDragOver={hook.handlePanelDragOver}
            onDragLeave={hook.handlePanelDragLeave}
            onDrop={hook.handlePanelDrop}
          >
            {/* Drop Zone Indicator */}
            {hook.isDragOver && (
              <div className='sticky top-0 z-10 mb-4 border-2 border-dashed border-[#178da6] rounded-lg p-4 text-center text-sm bg-teal-50 animate-pulse'>
                <p className='font-semibold text-[#178da6]'>Drop Here</p>
                <p className='text-xs text-gray-600'>Drop WOD or section to add to this workout</p>
              </div>
            )}

            <WorkoutFormFields
              date={date}
              formData={hook.formData}
              errors={hook.errors}
              workoutTitles={hook.workoutTitles}
              tracks={hook.tracks}
              loadingTracks={hook.loadingTracks}
              onFieldChange={hook.handleChange}
            />

            {/* Sections */}
            <div>
              <div className='sticky -top-6 z-20 bg-white pt-3 pb-3 -mx-6 px-6'>
                <div className='flex justify-between items-center mb-3'>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900'>
                      Workout Sections <span className='text-red-500'>*</span>
                    </label>
                    <p className='text-xs text-gray-600 mt-1'>
                      Total Duration:{' '}
                      <span className='font-semibold text-[#178da6]'>{totalDuration} mins</span>
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={hook.openLibrary}
                      className='px-4 py-2 bg-white hover:bg-gray-50 border-2 border-[#178da6] text-[#178da6] text-sm font-medium rounded-lg flex items-center gap-2 transition'
                      title='Open Exercise Library'
                    >
                      <Library size={16} />
                      Library
                    </button>
                    <button
                      type='button'
                      onClick={hook.addSection}
                      className='px-4 py-2 bg-[#178da6] hover:bg-[#14758c] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition'
                    >
                      <Plus size={16} />
                      Section
                    </button>
                  </div>
                </div>

                {hook.errors.sections && <p className='text-red-500 text-sm mb-2'>{hook.errors.sections}</p>}

                <MovementDemosBar
                  sections={hook.formData.sections}
                  exercises={hook.exercisesForVideo}
                  videoClips={hook.formData.video_clips || []}
                  onVideoClipsChange={(clips) => hook.handleChange('video_clips', clips)}
                />
              </div>

              <div className='space-y-4'>
                {hook.formData.sections.map((section, index) => (
                  <WODSectionComponent
                    key={section.id}
                    section={section}
                    sectionIndex={index}
                    elapsedMinutes={hook.getElapsedMinutes(index)}
                    isExpanded={hook.expandedSections.has(section.id)}
                    onToggleExpand={() => hook.toggleSectionExpanded(section.id, index)}
                    onUpdate={updates => hook.updateSection(section.id, updates)}
                    onDelete={() => hook.deleteSection(section.id)}
                    onSetActive={() => hook.setActiveSection(index)}
                    onDragStart={hook.handleDragStart}
                    onDragOver={hook.handleDragOver}
                    onDrop={hook.handleDrop}
                    workoutTypes={hook.workoutTypes}
                    sectionTypes={hook.sectionTypes}
                    loadingTracks={hook.loadingTracks}
                    onRemoveLift={hook.handleRemoveLift}
                    onRemoveBenchmark={hook.handleRemoveBenchmark}
                    onRemoveForgeBenchmark={hook.handleRemoveForgeBenchmark}
                    onEditLift={hook.handleEditLift}
                    onTextareaInteraction={hook.handleTextareaInteraction}
                  />
                ))}

                {hook.formData.sections.length === 0 && (
                  <div className='text-center py-8 text-gray-500'>
                    <p>No sections yet. Click &quot;+ Section&quot; to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </form>

        </div>

        {/* Movement Library Popup */}
        <MovementLibraryPopup
          key={hook.libraryKey}
          isOpen={hook.libraryOpen}
          onClose={hook.closeLibrary}
          onSelectExercise={hook.handleSelectExercise}
          onSelectLift={hook.handleSelectLift}
          onSelectBenchmark={hook.handleSelectBenchmark}
          onSelectForgeBenchmark={hook.handleSelectForgeBenchmark}
          zIndex={hook.libraryZIndex}
          onBringToFront={hook.bringLibraryToFront}
        />

        {/* Configure Modals */}
        <ConfigureLiftModal
          isOpen={hook.liftModalOpen}
          lift={hook.selectedLift}
          editingLift={hook.editingLift}
          activeSection={hook.activeSection !== null ? hook.formData.sections[hook.activeSection] : null}
          availableSections={hook.formData.sections}
          onClose={() => {
            hook.setLiftModalOpen(false);
            hook.openLibrary();
          }}
          onAddToSection={hook.handleAddLiftToSection}
        />
        <ConfigureBenchmarkModal
          isOpen={hook.benchmarkModalOpen}
          benchmark={hook.selectedBenchmark}
          activeSection={hook.activeSection !== null ? hook.formData.sections[hook.activeSection] : null}
          availableSections={hook.formData.sections}
          onClose={() => {
            hook.setBenchmarkModalOpen(false);
            hook.openLibrary();
          }}
          onAddToSection={hook.handleAddBenchmarkToSection}
        />
        <ConfigureForgeBenchmarkModal
          isOpen={hook.forgeModalOpen}
          forgeBenchmark={hook.selectedForgeBenchmark}
          activeSection={hook.activeSection !== null ? hook.formData.sections[hook.activeSection] : null}
          availableSections={hook.formData.sections}
          onClose={() => {
            hook.setForgeModalOpen(false);
            hook.openLibrary();
          }}
          onAddToSection={hook.handleAddForgeBenchmarkToSection}
        />

        {/* Publish Modal */}
        <PublishModal
          isOpen={hook.publishModalOpen}
          onClose={() => { hook.setPublishModalOpen(false); hook.resetPublishModalPos(); }}
          onPublish={hook.handlePublish}
          position={hook.publishModalPos}
          zIndex={hook.publishModalZIndex}
          isDragging={hook.isDraggingPublish}
          onDragStart={hook.handlePublishDragStart}
          onMouseDown={hook.bringPublishToFront}
          sections={hook.formData.sections}
          workoutDate={date}
          sessionTime={publishSessionTime}
          currentPublishConfig={
            editingWOD?.is_published
              ? {
                  selectedSectionIds: editingWOD.publish_sections || hook.formData.sections.map(s => s.id),
                  eventTime: editingWOD.publish_time || publishSessionTime || '09:00',
                  eventDurationMinutes: editingWOD.publish_duration || hook.formData.sections.reduce((sum, s) => sum + (s.duration || 0), 0),
                }
              : null
          }
        />
      </>
    );
  }

  // Modal mode
  return (
    <FocusTrap>
    <>
      <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
        <div
          className={`bg-white rounded-lg shadow-2xl w-full ${hook.notesPanelOpen ? 'max-w-7xl' : 'max-w-5xl'} max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300`}
        >
          {/* Header */}
          <WorkoutModalHeader
            editingWOD={editingWOD}
            notesPanelOpen={hook.notesPanelOpen}
            sessionTime={hook.sessionTime}
            editingTime={hook.editingTime}
            tempTime={hook.tempTime}
            newSessionTime={hook.newSessionTime}
            hasNotes={!!(hook.formData.coach_notes && hook.formData.coach_notes.trim().length > 0)}
            onNotesToggle={(open) => {
              hook.setNotesPanelOpen(open);
              onNotesToggle?.(open);
            }}
            onTimeEditToggle={hook.setEditingTime}
            onTimeChange={(time, isNew) => {
              if (isNew) { hook.setNewSessionTime(time); } else { hook.setTempTime(time); }
            }}
            onTimeSave={hook.handleTimeUpdate}
            onTempTimeChange={hook.setTempTime}
            onUnpublish={hook.handleUnpublish}
            onPublishClick={hook.requestOpenPublishModal}
            onSave={async () => {
              if (hook.validate()) {
                // Save any pending time changes first
                if (editingWOD && hook.sessionTime && hook.tempTime !== hook.sessionTime.substring(0, 5)) {
                  await hook.handleTimeUpdate();
                }
                const dataToSave = {
                  ...hook.formData,
                  classTimes: !editingWOD ? [hook.newSessionTime] : hook.formData.classTimes,
                };
                await onSave(dataToSave);
                onClose();
              }
            }}
            onClose={onClose}
          />

          {/* Content Area */}
          <div className='flex-1 flex overflow-hidden'>
            <form
              onSubmit={hook.handleSubmit}
              className={`${hook.notesPanelOpen ? 'flex-1' : 'w-full'} overflow-y-auto p-6 space-y-6`}
            >
              {/* Date Display */}
              <div className='bg-gray-50 p-3 rounded-lg'>
                <p className='text-sm text-gray-600'>Date</p>
                <p className='font-semibold text-gray-900'>
                  {date.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Title */}
              <div>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Workout Title <span className='text-red-500'>*</span>
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    list='workout-titles'
                    value={hook.formData.title}
                    onChange={e => hook.handleChange('title', e.target.value)}
                    placeholder='Select or type custom title...'
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 placeholder-gray-400 ${
                      hook.errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <datalist id='workout-titles'>
                    {hook.workoutTitles.map(wt => (
                      <option key={wt.id} value={wt.name} />
                    ))}
                  </datalist>
                </div>
                {hook.errors.title && <p className='text-red-500 text-sm mt-1'>{hook.errors.title}</p>}
              </div>

              {/* Track */}
              <div>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Track <span className='text-red-500'>*</span>
                </label>
                <select
                  value={hook.formData.track_id || ''}
                  onChange={e => hook.handleChange('track_id', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 bg-white'
                  disabled={hook.loadingTracks}
                >
                  <option value=''>Select Track...</option>
                  {hook.tracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sections */}
              <div>
                <div className='sticky -top-6 z-20 bg-white pt-3 pb-3 -mx-6 px-6'>
                  <div className='flex justify-between items-center mb-3'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900'>
                        Workout Sections <span className='text-red-500'>*</span>
                      </label>
                      <p className='text-xs text-gray-600 mt-1'>
                        Total Duration:{' '}
                        <span className='font-semibold text-[#178da6]'>{totalDuration} mins</span>
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={hook.openLibrary}
                        className='px-4 py-2 bg-white hover:bg-gray-50 border-2 border-[#178da6] text-[#178da6] text-sm font-medium rounded-lg flex items-center gap-2 transition'
                        title='Open Exercise Library'
                      >
                        <Library size={16} />
                        Library
                      </button>
                      <button
                        type='button'
                        onClick={hook.addSection}
                        className='px-4 py-2 bg-[#178da6] hover:bg-[#14758c] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition'
                      >
                        <Plus size={16} />
                        Section
                      </button>
                    </div>
                  </div>

                  {hook.errors.sections && <p className='text-red-500 text-sm mb-2'>{hook.errors.sections}</p>}
                </div>

                <div className='space-y-4'>
                  {hook.formData.sections.map((section, index) => (
                    <WODSectionComponent
                      key={section.id}
                      section={section}
                      sectionIndex={index}
                      elapsedMinutes={hook.getElapsedMinutes(index)}
                      isExpanded={hook.expandedSections.has(section.id)}
                      onToggleExpand={() => hook.toggleSectionExpanded(section.id, index)}
                      onUpdate={updates => hook.updateSection(section.id, updates)}
                      onDelete={() => hook.deleteSection(section.id)}
                      onSetActive={() => hook.setActiveSection(index)}
                      onDragStart={hook.handleDragStart}
                      onDragOver={hook.handleDragOver}
                      onDrop={hook.handleDrop}
                      workoutTypes={hook.workoutTypes}
                      sectionTypes={hook.sectionTypes}
                      loadingTracks={hook.loadingTracks}
                      onRemoveLift={hook.handleRemoveLift}
                      onRemoveBenchmark={hook.handleRemoveBenchmark}
                      onRemoveForgeBenchmark={hook.handleRemoveForgeBenchmark}
                      onEditLift={hook.handleEditLift}
                      onTextareaInteraction={hook.handleTextareaInteraction}
                    />
                  ))}

                  {hook.formData.sections.length === 0 && (
                    <div className='text-center py-8 text-gray-500'>
                      <p>No sections yet. Click &quot;+ Section&quot; to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Coach Notes Panel */}
            <CoachNotesPanel
              isOpen={hook.notesPanelOpen}
              notes={hook.formData.coach_notes || ''}
              mode='side'
              onClose={() => {
                hook.setNotesPanelOpen(false);
                onNotesToggle?.(false);
              }}
              onChange={(notes) => hook.handleChange('coach_notes', notes)}
            />
          </div>
        </div>
      </div>

      {/* Movement Library Popup */}
      <MovementLibraryPopup
        key={hook.libraryKey}
        isOpen={hook.libraryOpen}
        onClose={hook.closeLibrary}
        onSelectExercise={hook.handleSelectExercise}
        onSelectLift={hook.handleSelectLift}
        onSelectBenchmark={hook.handleSelectBenchmark}
        onSelectForgeBenchmark={hook.handleSelectForgeBenchmark}
        zIndex={hook.libraryZIndex}
        onBringToFront={hook.bringLibraryToFront}
      />

      {/* Configure Modals */}
      <ConfigureLiftModal
        isOpen={hook.liftModalOpen}
        lift={hook.selectedLift}
        editingLift={hook.editingLift}
        activeSection={hook.activeSection !== null ? hook.formData.sections[hook.activeSection] : null}
        availableSections={hook.formData.sections}
        onClose={() => {
          hook.setLiftModalOpen(false);
          hook.openLibrary();
        }}
        onAddToSection={hook.handleAddLiftToSection}
      />
      <ConfigureBenchmarkModal
        isOpen={hook.benchmarkModalOpen}
        benchmark={hook.selectedBenchmark}
        activeSection={hook.activeSection !== null ? hook.formData.sections[hook.activeSection] : null}
        availableSections={hook.formData.sections}
        onClose={() => {
          hook.setBenchmarkModalOpen(false);
          hook.openLibrary();
        }}
        onAddToSection={hook.handleAddBenchmarkToSection}
      />
      <ConfigureForgeBenchmarkModal
        isOpen={hook.forgeModalOpen}
        forgeBenchmark={hook.selectedForgeBenchmark}
        activeSection={hook.activeSection !== null ? hook.formData.sections[hook.activeSection] : null}
        availableSections={hook.formData.sections}
        onClose={() => {
          hook.setForgeModalOpen(false);
          hook.openLibrary();
        }}
        onAddToSection={hook.handleAddForgeBenchmarkToSection}
      />

      {/* Publish Modal */}
      <PublishModal
        isOpen={hook.publishModalOpen}
        onClose={() => hook.setPublishModalOpen(false)}
        onPublish={hook.handlePublish}
        sections={hook.formData.sections}
        workoutDate={date}
        sessionTime={publishSessionTime}
        currentPublishConfig={
          editingWOD?.is_published
            ? {
                selectedSectionIds: editingWOD.publish_sections || hook.formData.sections.map(s => s.id),
                eventTime: editingWOD.publish_time || publishSessionTime || '09:00',
                eventDurationMinutes: editingWOD.publish_duration || hook.formData.sections.reduce((sum, s) => sum + (s.duration || 0), 0),
              }
            : null
        }
      />
    </>
    </FocusTrap>
  );
}
