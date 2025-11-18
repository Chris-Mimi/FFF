'use client';

import ExerciseLibraryPopup from '@/components/coach/ExerciseLibraryPopup';
import PublishModal from '@/components/coach/PublishModal';
import WODSectionComponent from '@/components/coach/WODSectionComponent';
import { useWorkoutModal, WODFormData } from '@/hooks/coach/useWorkoutModal';

// Re-export types for backwards compatibility
export type { WODFormData, WODSection } from '@/hooks/coach/useWorkoutModal';
import {
  Check,
  ChevronDown,
  Clock,
  Edit2,
  FileText,
  Library,
  Plus,
  Send,
  X
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
        {hook.notesPanelOpen && (
          <div
            className='fixed z-[70]'
            style={{
              bottom: `${hook.notesModalPos.bottom}px`,
              left: `${hook.notesModalPos.left}px`,
            }}
          >
            <div
              className='bg-white rounded-lg shadow-2xl flex flex-col relative border-4 border-[#208479]'
              style={{
                width: `${hook.notesModalSize.width}px`,
                height: `${hook.notesModalSize.height}px`,
              }}
            >
              {/* Corner Resize Handles */}
              <div
                className='absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-50'
                onMouseDown={(e) => hook.handleNotesResizeStart(e, 'se')}
                title='Drag to resize'
              >
                <div className='absolute bottom-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition'></div>
              </div>
              <div
                className='absolute top-0 right-0 w-8 h-8 cursor-ne-resize z-50'
                onMouseDown={(e) => hook.handleNotesResizeStart(e, 'ne')}
                title='Drag to resize'
              >
                <div className='absolute top-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tr-lg'></div>
              </div>
              <div
                className='absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize z-50'
                onMouseDown={(e) => hook.handleNotesResizeStart(e, 'sw')}
                title='Drag to resize'
              >
                <div className='absolute bottom-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition rounded-bl-lg'></div>
              </div>
              <div
                className='absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-50'
                onMouseDown={(e) => hook.handleNotesResizeStart(e, 'nw')}
                title='Drag to resize'
              >
                <div className='absolute top-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tl-lg'></div>
              </div>

              {/* Header - Draggable */}
              <div
                className='bg-[#208479] text-white p-4 rounded-t-lg flex justify-between items-center flex-shrink-0 cursor-move'
                onMouseDown={hook.handleNotesDragStart}
              >
                <h2 className='text-xl font-bold'>Coach Notes</h2>
                <button
                    onClick={() => {
                      hook.setNotesPanelOpen(false);
                      onNotesToggle?.(false);
                    }}
                    className='hover:bg-[#1a6b62] p-1 rounded transition'
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className='flex-1 overflow-y-auto p-4'>
                  <textarea
                    value={hook.formData.coach_notes || ''}
                    onChange={e => hook.handleChange('coach_notes', e.target.value)}
                    placeholder='Add private notes about this workout...'
                    className='w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm'
                  />
                </div>

              {/* Footer */}
              <div className='border-t p-4 bg-gray-50 rounded-b-lg flex-shrink-0'>
                <p className='text-xs text-gray-500'>
                  Notes are private and searchable. Auto-saved when you save the WOD.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WOD Panel */}
        <div className='fixed left-0 top-[72px] h-[calc(100vh-72px)] w-[800px] bg-white shadow-2xl z-50 flex flex-col border-r-2 border-[#208479] border-t border-gray-400 animate-slide-in-left'>
          {/* Header */}
          <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
            <h2 className='text-xl font-bold'>{editingWOD ? 'Edit Workout' : 'Create New Workout'}</h2>
            <div className='flex items-center gap-2'>
              <button
                onClick={e => {
                  e.preventDefault();
                  const newValue = !hook.notesPanelOpen;
                  hook.setNotesPanelOpen(newValue);
                  onNotesToggle?.(newValue);
                }}
                className={`hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2 ${hook.notesPanelOpen ? 'bg-[#1a6b62]' : ''}`}
                title='Coach Notes'
              >
                <FileText size={20} />
                <span className='text-sm'>Notes</span>
              </button>
              {/* Session Time Display/Edit */}
              {(hook.sessionTime || !editingWOD) && (
                <div className="flex items-center gap-2 border-l border-white/30 pl-4">
                  <Clock size={18} />
                  {(hook.editingTime || (!editingWOD && !hook.sessionTime)) ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={(hook.sessionTime ? hook.tempTime : hook.newSessionTime).substring(0, 2)}
                        onChange={(e) => {
                          const currentTime = hook.sessionTime ? hook.tempTime : hook.newSessionTime;
                          const newTime = `${e.target.value}:${currentTime.substring(3, 5)}`;
                          hook.sessionTime ? hook.setTempTime(newTime) : hook.setNewSessionTime(newTime);
                        }}
                        className="px-2 py-1 border rounded bg-white text-gray-900 text-sm"
                      >
                        {Array.from({ length: 24 }, (_, hour) => (
                          <option key={hour} value={hour.toString().padStart(2, '0')}>
                            {hour.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <span className="text-white">:</span>
                      <select
                        value={(hook.sessionTime ? hook.tempTime : hook.newSessionTime).substring(3, 5)}
                        onChange={(e) => {
                          const currentTime = hook.sessionTime ? hook.tempTime : hook.newSessionTime;
                          const newTime = `${currentTime.substring(0, 2)}:${e.target.value}`;
                          hook.sessionTime ? hook.setTempTime(newTime) : hook.setNewSessionTime(newTime);
                        }}
                        className="px-2 py-1 border rounded bg-white text-gray-900 text-sm"
                      >
                        {['00', '15', '30', '45'].map(minute => (
                          <option key={minute} value={minute}>
                            {minute}
                          </option>
                        ))}
                      </select>
                      {hook.sessionTime && (
                        <>
                          <button
                            onClick={hook.handleTimeUpdate}
                            className="px-3 py-1 bg-white text-[#208479] rounded hover:bg-gray-100 text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              hook.setEditingTime(false);
                              hook.setTempTime(hook.tempTime.padStart(5, '0'));
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{hook.sessionTime?.substring(0, 5)}</span>
                      <button
                        onClick={() => {
                          hook.setTempTime((hook.sessionTime || '12:00').substring(0, 5));
                          hook.setEditingTime(true);
                        }}
                        className="p-1 hover:bg-[#1a6b62] rounded transition"
                        title="Edit time"
                      >
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              )}
              {editingWOD?.id && (
                editingWOD.is_published ? (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      hook.handleUnpublish();
                    }}
                    className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
                    title='Unpublish Workout'
                  >
                    <X size={20} />
                    <span className='text-sm'>Unpublish</span>
                  </button>
                ) : (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      hook.setPublishModalOpen(true);
                    }}
                    className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
                    title='Publish Workout'
                  >
                    <Send size={20} />
                    <span className='text-sm'>Publish</span>
                  </button>
                )
              )}
              <button
                onClick={e => {
                  e.preventDefault();
                  if (hook.validate()) {
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
                className='hover:bg-[#1a6b62] p-1 rounded transition'
              >
                <Check size={24} />
              </button>
              <button onClick={onClose} className='hover:bg-[#1a6b62] p-1 rounded transition'>
                <X size={24} />
              </button>
            </div>
          </div>

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

                {/* Apply to Other Sessions Dropdown */}
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

                    {/* Dropdown Menu */}
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
                    onSetActive={() => hook.activeSection = index}
                    onDragStart={hook.handleDragStart}
                    onDragOver={hook.handleDragOver}
                    onDrop={hook.handleDrop}
                    workoutTypes={hook.workoutTypes}
                    sectionTypes={hook.sectionTypes}
                    loadingTracks={hook.loadingTracks}
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

        {/* Exercise Library Popup */}
        <ExerciseLibraryPopup
          key={hook.libraryKey}
          isOpen={hook.libraryOpen}
          onClose={hook.closeLibrary}
          onSelectExercise={hook.handleSelectExercise}
        />

        {/* Publish Modal */}
        <PublishModal
          isOpen={hook.publishModalOpen}
          onClose={() => hook.setPublishModalOpen(false)}
          onPublish={hook.handlePublish}
          sections={hook.formData.sections}
          workoutDate={date}
        />
      </>
    );
  }

  // Modal mode
  return (
    <>
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
        <div
          className={`bg-white rounded-lg shadow-2xl w-full ${hook.notesPanelOpen ? 'max-w-7xl' : 'max-w-5xl'} max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300`}
        >
          {/* Header */}
          <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
            <h2 className='text-xl font-bold'>{editingWOD ? 'Edit Workout' : 'Create New Workout'}</h2>
            <div className='flex items-center gap-2'>
              <button
                onClick={e => {
                  e.preventDefault();
                  const newValue = !hook.notesPanelOpen;
                  hook.setNotesPanelOpen(newValue);
                  onNotesToggle?.(newValue);
                }}
                className={`hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2 ${hook.notesPanelOpen ? 'bg-[#1a6b62]' : ''}`}
                title='Coach Notes'
              >
                <FileText size={20} />
                <span className='text-sm'>Notes</span>
              </button>
              {/* Session Time Display/Edit */}
              {(hook.sessionTime || !editingWOD) && (
                <div className="flex items-center gap-2 border-l border-white/30 pl-4">
                  <Clock size={18} />
                  {(hook.editingTime || (!editingWOD && !hook.sessionTime)) ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={(hook.sessionTime ? hook.tempTime : hook.newSessionTime).substring(0, 2)}
                        onChange={(e) => {
                          const currentTime = hook.sessionTime ? hook.tempTime : hook.newSessionTime;
                          const newTime = `${e.target.value}:${currentTime.substring(3, 5)}`;
                          hook.sessionTime ? hook.setTempTime(newTime) : hook.setNewSessionTime(newTime);
                        }}
                        className="px-2 py-1 border rounded bg-white text-gray-900 text-sm"
                      >
                        {Array.from({ length: 24 }, (_, hour) => (
                          <option key={hour} value={hour.toString().padStart(2, '0')}>
                            {hour.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <span className="text-white">:</span>
                      <select
                        value={(hook.sessionTime ? hook.tempTime : hook.newSessionTime).substring(3, 5)}
                        onChange={(e) => {
                          const currentTime = hook.sessionTime ? hook.tempTime : hook.newSessionTime;
                          const newTime = `${currentTime.substring(0, 2)}:${e.target.value}`;
                          hook.sessionTime ? hook.setTempTime(newTime) : hook.setNewSessionTime(newTime);
                        }}
                        className="px-2 py-1 border rounded bg-white text-gray-900 text-sm"
                      >
                        {['00', '15', '30', '45'].map(minute => (
                          <option key={minute} value={minute}>
                            {minute}
                          </option>
                        ))}
                      </select>
                      {hook.sessionTime && (
                        <>
                          <button
                            onClick={hook.handleTimeUpdate}
                            className="px-3 py-1 bg-white text-[#208479] rounded hover:bg-gray-100 text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              hook.setEditingTime(false);
                              hook.setTempTime(hook.tempTime.padStart(5, '0'));
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{hook.sessionTime?.substring(0, 5)}</span>
                      <button
                        onClick={() => {
                          hook.setTempTime((hook.sessionTime || '12:00').substring(0, 5));
                          hook.setEditingTime(true);
                        }}
                        className="p-1 hover:bg-[#1a6b62] rounded transition"
                        title="Edit time"
                      >
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              )}
              {editingWOD?.id && (
                editingWOD.is_published ? (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      hook.handleUnpublish();
                    }}
                    className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
                    title='Unpublish Workout'
                  >
                    <X size={20} />
                    <span className='text-sm'>Unpublish</span>
                  </button>
                ) : (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      hook.setPublishModalOpen(true);
                    }}
                    className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
                    title='Publish Workout'
                  >
                    <Send size={20} />
                    <span className='text-sm'>Publish</span>
                  </button>
                )
              )}
              <button
                onClick={e => {
                  e.preventDefault();
                  if (hook.validate()) {
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
                className='hover:bg-[#1a6b62] p-1 rounded transition'
              >
                <Check size={24} />
              </button>
              <button onClick={onClose} className='hover:bg-[#1a6b62] p-1 rounded transition'>
                <X size={24} />
              </button>
            </div>
          </div>

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
                      onSetActive={() => hook.activeSection = index}
                      onDragStart={hook.handleDragStart}
                      onDragOver={hook.handleDragOver}
                      onDrop={hook.handleDrop}
                      workoutTypes={hook.workoutTypes}
                      sectionTypes={hook.sectionTypes}
                      loadingTracks={hook.loadingTracks}
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
            {hook.notesPanelOpen && (
              <div className='w-[400px] bg-gray-50 shadow-xl flex flex-col border-l-2 border-[#208479]'>
                <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
                  <h3 className='text-lg font-bold'>Coach Notes</h3>
                  <button
                    onClick={() => {
                      hook.setNotesPanelOpen(false);
                      onNotesToggle?.(false);
                    }}
                    className='hover:bg-[#1a6b62] p-1 rounded transition'
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className='flex-1 overflow-y-auto p-4'>
                  <textarea
                    value={hook.formData.coach_notes || ''}
                    onChange={e => hook.handleChange('coach_notes', e.target.value)}
                    placeholder='Add private notes about this workout...'
                    className='w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm'
                  />
                </div>
                <div className='border-t p-3 bg-white'>
                  <p className='text-xs text-gray-500'>
                    Notes are private and searchable. Auto-saved when you save the WOD.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exercise Library Popup */}
      <ExerciseLibraryPopup
        key={hook.libraryKey}
        isOpen={hook.libraryOpen}
        onClose={hook.closeLibrary}
        onSelectExercise={hook.handleSelectExercise}
      />

      {/* Publish Modal */}
      <PublishModal
        isOpen={hook.publishModalOpen}
        onClose={() => hook.setPublishModalOpen(false)}
        onPublish={hook.handlePublish}
        sections={hook.formData.sections}
        workoutDate={date}
        sessionTime={editingWOD?.booking_info?.time}
      />
    </>
  );
}
