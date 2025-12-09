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
import { useWorkoutModal, WODFormData } from '@/hooks/coach/useWorkoutModal';

// Re-export types for backwards compatibility
export type { WODFormData, WODSection } from '@/hooks/coach/useWorkoutModal';
import {
  ChevronDown,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialNotesOpen = false,
  onNotesToggle,
  onTimeUpdated,
}: WorkoutModalProps) {
  // Calculate session time for publish modal
  const publishSessionTime = editingWOD?.publish_time || editingWOD?.booking_info?.time;

  const hook = useWorkoutModal(
    isOpen,
    date,
    editingWOD,
    onSave,
    onClose,
    onTimeUpdated
  );

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
          onDragStart={hook.handleNotesDragStart}
          onResizeStart={hook.handleNotesResizeStart}
          onClose={() => {
            hook.setNotesPanelOpen(false);
            onNotesToggle?.(false);
          }}
          onChange={(notes) => hook.handleChange('coach_notes', notes)}
        />

        {/* WOD Panel */}
        <div className='fixed left-0 top-[72px] h-[calc(100vh-72px)] w-[800px] bg-white shadow-2xl z-50 flex flex-col border-r-2 border-[#208479] border-t border-gray-400 animate-slide-in-left'>
          {/* Header */}
          <WorkoutModalHeader
            editingWOD={editingWOD}
            notesPanelOpen={hook.notesPanelOpen}
            sessionTime={hook.sessionTime}
            editingTime={hook.editingTime}
            tempTime={hook.tempTime}
            newSessionTime={hook.newSessionTime}
            onNotesToggle={(open) => {
              hook.setNotesPanelOpen(open);
              onNotesToggle?.(open);
            }}
            onTimeEditToggle={hook.setEditingTime}
            onTimeChange={(time, isNew) => {
              isNew ? hook.setNewSessionTime(time) : hook.setTempTime(time);
            }}
            onTimeSave={hook.handleTimeUpdate}
            onTempTimeChange={hook.setTempTime}
            onUnpublish={hook.handleUnpublish}
            onPublishClick={() => hook.setPublishModalOpen(true)}
            onSave={async () => {
              if (hook.validate()) {
                // Save any pending time changes first
                if (editingWOD && hook.sessionTime && hook.tempTime !== hook.sessionTime.substring(0, 5)) {
                  await hook.handleTimeUpdate();
                }
                const dataToSave = {
                  ...hook.formData,
                  selectedSessionIds: Array.from(hook.selectedSessionIds),
                  classTimes: (!editingWOD && hook.selectedSessionIds.size === 0)
                    ? [hook.newSessionTime]
                    : hook.formData.classTimes,
                };
                onSave(dataToSave);
                onClose();
              }
            }}
            onClose={onClose}
          />

          {/* Content Area - Form Only */}
          <form
            onSubmit={hook.handleSubmit}
            className='flex-1 overflow-y-auto p-6 space-y-6'
            onDragOver={hook.handlePanelDragOver}
            onDragLeave={hook.handlePanelDragLeave}
            onDrop={hook.handlePanelDrop}
          >
            {/* Drop Zone Indicator */}
            {hook.isDragOver && (
              <div className='sticky top-0 z-10 mb-4 border-2 border-dashed border-[#208479] rounded-lg p-4 text-center text-sm bg-teal-50 animate-pulse'>
                <p className='font-semibold text-[#208479]'>Drop Here</p>
                <p className='text-xs text-gray-600'>Drop WOD or section to add to this workout</p>
              </div>
            )}

            <WorkoutFormFields
              date={date}
              formData={hook.formData}
              errors={hook.errors}
              workoutTitles={hook.workoutTitles}
              tracks={hook.tracks}
              otherSessions={hook.otherSessions}
              selectedSessionIds={hook.selectedSessionIds}
              applySessionsOpen={hook.applySessionsOpen}
              loadingTracks={hook.loadingTracks}
              onFieldChange={hook.handleChange}
              onSessionSelectionToggle={hook.handleSessionSelectionToggle}
              onApplySessionsToggle={() => hook.setApplySessionsOpen(!hook.applySessionsOpen)}
            />

            {/* Sections */}
            <div>
              <div className='flex justify-between items-center mb-3'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900'>
                    Workout Sections <span className='text-red-500'>*</span>
                  </label>
                  <p className='text-xs text-gray-600 mt-1'>
                    Total Duration:{' '}
                    <span className='font-semibold text-[#208479]'>{totalDuration} mins</span>
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={hook.openLibrary}
                    className='px-4 py-2 bg-white hover:bg-gray-50 border-2 border-[#208479] text-[#208479] text-sm font-medium rounded-lg flex items-center gap-2 transition'
                    title='Open Exercise Library'
                  >
                    <Library size={16} />
                    Library
                  </button>
                  <button
                    type='button'
                    onClick={hook.addSection}
                    className='px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition'
                  >
                    <Plus size={16} />
                    Add Section
                  </button>
                </div>
              </div>

              {hook.errors.sections && <p className='text-red-500 text-sm mb-2'>{hook.errors.sections}</p>}

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
                    <p>No sections yet. Click &quot;Add Section&quot; to get started.</p>
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
        />
      </>
    );
  }

  // Modal mode
  return (
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
            onNotesToggle={(open) => {
              hook.setNotesPanelOpen(open);
              onNotesToggle?.(open);
            }}
            onTimeEditToggle={hook.setEditingTime}
            onTimeChange={(time, isNew) => {
              isNew ? hook.setNewSessionTime(time) : hook.setTempTime(time);
            }}
            onTimeSave={hook.handleTimeUpdate}
            onTempTimeChange={hook.setTempTime}
            onUnpublish={hook.handleUnpublish}
            onPublishClick={() => hook.setPublishModalOpen(true)}
            onSave={async () => {
              if (hook.validate()) {
                // Save any pending time changes first
                if (editingWOD && hook.sessionTime && hook.tempTime !== hook.sessionTime.substring(0, 5)) {
                  await hook.handleTimeUpdate();
                }
                const dataToSave = {
                  ...hook.formData,
                  selectedSessionIds: Array.from(hook.selectedSessionIds),
                  classTimes: (!editingWOD && hook.selectedSessionIds.size === 0)
                    ? [hook.newSessionTime]
                    : hook.formData.classTimes,
                };
                onSave(dataToSave);
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 ${
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
                <label className='block text-sm font-semibold mb-2 text-gray-900'>Track</label>
                <select
                  value={hook.formData.track_id || ''}
                  onChange={e => hook.handleChange('track_id', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 bg-white'
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

              {/* Max Capacity & Apply to Sessions */}
              <div>
                <div className='flex justify-between items-start gap-4'>
                  <div className='flex-1'>
                    <label className='block text-sm font-semibold mb-2 text-gray-900'>
                      Max Capacity <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='number'
                      value={hook.formData.maxCapacity}
                      onChange={e => hook.handleChange('maxCapacity', parseInt(e.target.value) || 0)}
                      min='1'
                      max='30'
                      className={`w-32 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 ${
                        hook.errors.maxCapacity ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {hook.errors.maxCapacity && (
                      <p className='text-red-500 text-sm mt-1'>{hook.errors.maxCapacity}</p>
                    )}
                    <p className='text-xs text-gray-500 mt-1'>Session times are managed via schedule templates</p>
                  </div>

                  {/* Apply to Sessions */}
                  {hook.otherSessions.length > 0 && (
                    <div className='relative'>
                      <button
                        type='button'
                        onClick={() => hook.setApplySessionsOpen(!hook.applySessionsOpen)}
                        className='mt-6 px-3 py-1.5 text-sm bg-white border-2 border-[#208479] text-[#208479] hover:bg-gray-50 rounded-lg flex items-center gap-2 transition'
                        title='Apply this workout to other sessions'
                      >
                        <span>Apply to Sessions</span>
                        {hook.selectedSessionIds.size > 0 && (
                          <span className='bg-[#208479] text-white text-xs px-1.5 py-0.5 rounded-full'>
                            {hook.selectedSessionIds.size}
                          </span>
                        )}
                        <ChevronDown size={16} className={`transition-transform ${hook.applySessionsOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {hook.applySessionsOpen && (
                        <div className='absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50'>
                          <div className='p-3'>
                            <p className='text-xs text-gray-600 mb-3'>
                              Select existing sessions to apply this workout to:
                            </p>
                            <div className='space-y-2 max-h-48 overflow-y-auto'>
                              {hook.otherSessions.map(session => (
                                <label key={session.id} className='flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded'>
                                  <input
                                    type='checkbox'
                                    checked={hook.selectedSessionIds.has(session.id)}
                                    onChange={(e) => {
                                      const newSelected = new Set(hook.selectedSessionIds);
                                      if (e.target.checked) {
                                        newSelected.add(session.id);
                                      } else {
                                        newSelected.delete(session.id);
                                      }
                                      hook.selectedSessionIds = newSelected;
                                    }}
                                    className='w-4 h-4 text-[#208479] focus:ring-[#208479] rounded'
                                  />
                                  <span className='text-sm text-gray-700'>
                                    {session.time}
                                    {session.workout_id && <span className='text-gray-500 ml-2'>(has workout)</span>}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className='flex justify-between items-center mb-3'>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900'>
                      Workout Sections <span className='text-red-500'>*</span>
                    </label>
                    <p className='text-xs text-gray-600 mt-1'>
                      Total Duration:{' '}
                      <span className='font-semibold text-[#208479]'>{totalDuration} mins</span>
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={hook.openLibrary}
                      className='px-4 py-2 bg-white hover:bg-gray-50 border-2 border-[#208479] text-[#208479] text-sm font-medium rounded-lg flex items-center gap-2 transition'
                      title='Open Exercise Library'
                    >
                      <Library size={16} />
                      Library
                    </button>
                    <button
                      type='button'
                      onClick={hook.addSection}
                      className='px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition'
                    >
                      <Plus size={16} />
                      Add Section
                    </button>
                  </div>
                </div>

                {hook.errors.sections && <p className='text-red-500 text-sm mb-2'>{hook.errors.sections}</p>}

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
                      <p>No sections yet. Click &quot;Add Section&quot; to get started.</p>
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
      />
    </>
  );
}
