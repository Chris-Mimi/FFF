'use client';

import { useState } from 'react';
import SessionTimeEditor from '@/components/coach/SessionTimeEditor';
import { Check, FileText, Loader2, RefreshCw, Send, X } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className='bg-[#178da6] text-white p-2 md:p-4 flex justify-between items-center gap-2'>
      <h2 className='text-sm md:text-xl font-bold whitespace-nowrap'>{editingWOD ? 'Edit' : 'New'}<span className='hidden md:inline'> Workout</span></h2>
      <div className='flex items-center gap-1 md:gap-2 flex-wrap justify-end'>
        <button
          onClick={e => {
            e.preventDefault();
            onNotesToggle(!notesPanelOpen);
          }}
          className={`hover:bg-[#14758c] p-1.5 md:p-2 rounded transition flex items-center gap-1 md:gap-2 ${notesPanelOpen ? 'bg-[#14758c]' : ''} ${hasNotes && !notesPanelOpen ? 'bg-teal-500 hover:bg-teal-800' : ''}`}
          title={hasNotes ? 'Coach Notes (Has content)' : 'Coach Notes (Empty)'}
        >
          <FileText size={18} className={hasNotes && !notesPanelOpen ? 'text-white' : ''} />
          <span className='hidden md:inline text-sm'>Notes</span>
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
                className='hover:bg-[#14758c] p-1.5 md:p-2 rounded transition flex items-center gap-1 md:gap-2'
                title='Re-publish to Google Calendar'
              >
                <RefreshCw size={18} />
                <span className='hidden md:inline text-sm'>Re-publish</span>
              </button>
              <button
                onClick={e => {
                  e.preventDefault();
                  onUnpublish();
                }}
                className='hover:bg-[#14758c] p-1.5 md:p-2 rounded transition flex items-center gap-1 md:gap-2'
                title='Unpublish Workout'
              >
                <X size={18} />
                <span className='hidden md:inline text-sm'>Unpublish</span>
              </button>
            </>
          ) : (
            <button
              onClick={e => {
                e.preventDefault();
                onPublishClick();
              }}
              className='hover:bg-[#14758c] p-1.5 md:p-2 rounded transition flex items-center gap-1 md:gap-2'
              title='Publish Workout'
            >
              <Send size={18} />
              <span className='hidden md:inline text-sm'>Publish</span>
            </button>
          )
        )}
        <button
          onClick={async e => {
            e.preventDefault();
            if (isSaving) return;
            setIsSaving(true);
            try {
              await onSave();
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
          className={`p-1 rounded transition ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#14758c]'}`}
          title='Save'
          aria-label='Save'
        >
          {isSaving ? <Loader2 size={22} className='animate-spin' /> : <Check size={22} />}
        </button>
        <button onClick={onClose} className='hover:bg-[#14758c] p-1 rounded transition' title='Close' aria-label='Close'>
          <X size={22} />
        </button>
      </div>
    </div>
  );
}
