'use client';

import SessionTimeEditor from '@/components/coach/SessionTimeEditor';
import { Check, FileText, RefreshCw, Send, X } from 'lucide-react';
import { WODFormData } from '@/hooks/coach/useWorkoutModal';

interface WorkoutModalHeaderProps {
  editingWOD?: WODFormData | null;
  notesPanelOpen: boolean;
  sessionTime: string | null;
  editingTime: boolean;
  tempTime: string;
  newSessionTime: string;
  hasNotes?: boolean;
  // Callbacks
  onNotesToggle: (open: boolean) => void;
  onTimeEditToggle: (editing: boolean) => void;
  onTimeChange: (time: string, isNew: boolean) => void;
  onTimeSave: () => Promise<void>;
  onTempTimeChange: (time: string) => void;
  onUnpublish: () => void;
  onPublishClick: () => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export default function WorkoutModalHeader({
  editingWOD,
  notesPanelOpen,
  sessionTime,
  editingTime,
  tempTime,
  newSessionTime,
  hasNotes = false,
  onNotesToggle,
  onTimeEditToggle,
  onTimeChange,
  onTimeSave,
  onTempTimeChange,
  onUnpublish,
  onPublishClick,
  onSave,
  onClose,
}: WorkoutModalHeaderProps) {
  return (
    <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
      <h2 className='text-xl font-bold'>{editingWOD ? 'Edit Workout' : 'Create New Workout'}</h2>
      <div className='flex items-center gap-2'>
        <button
          onClick={e => {
            e.preventDefault();
            onNotesToggle(!notesPanelOpen);
          }}
          className={`hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2 ${notesPanelOpen ? 'bg-[#1a6b62]' : ''} ${hasNotes && !notesPanelOpen ? 'bg-teal-500 hover:bg-teal-800' : ''}`}
          title={hasNotes ? 'Coach Notes (Has content)' : 'Coach Notes (Empty)'}
        >
          <FileText size={20} className={hasNotes && !notesPanelOpen ? 'text-white' : ''} />
          <span className='text-sm'>Notes</span>
        </button>
        {/* Session Time Display/Edit */}
        <SessionTimeEditor
          sessionTime={sessionTime}
          editingTime={editingTime}
          tempTime={tempTime}
          newSessionTime={newSessionTime}
          isNewWorkout={!editingWOD}
          onEditToggle={onTimeEditToggle}
          onTimeChange={onTimeChange}
          onSave={onTimeSave}
          onTempTimeChange={onTempTimeChange}
        />
        {editingWOD?.id && (
          editingWOD.is_published ? (
            <>
              <button
                onClick={e => {
                  e.preventDefault();
                  onPublishClick();
                }}
                className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
                title='Re-publish to Google Calendar'
              >
                <RefreshCw size={20} />
                <span className='text-sm'>Re-publish</span>
              </button>
              <button
                onClick={e => {
                  e.preventDefault();
                  onUnpublish();
                }}
                className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
                title='Unpublish Workout'
              >
                <X size={20} />
                <span className='text-sm'>Unpublish</span>
              </button>
            </>
          ) : (
            <button
              onClick={e => {
                e.preventDefault();
                onPublishClick();
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
          onClick={async e => {
            e.preventDefault();
            await onSave();
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
  );
}
