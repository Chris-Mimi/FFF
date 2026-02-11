'use client';

import { Clock, Edit2 } from 'lucide-react';

interface SessionTimeEditorProps {
  sessionTime: string | null;
  editingTime: boolean;
  tempTime: string;
  newSessionTime: string;
  isNewWorkout: boolean;
  onEditToggle: (editing: boolean) => void;
  onTimeChange: (time: string, isNew: boolean) => void;
  onSave: () => Promise<void>;
  onTempTimeChange: (time: string) => void;
}

export default function SessionTimeEditor({
  sessionTime,
  editingTime,
  tempTime,
  newSessionTime,
  isNewWorkout,
  onEditToggle,
  onTimeChange,
  onSave,
  onTempTimeChange,
}: SessionTimeEditorProps) {
  // Don't render if no session time and editing existing workout
  if (!sessionTime && !isNewWorkout) {
    return null;
  }

  const currentTime = sessionTime ? tempTime : newSessionTime;
  const isEditing = editingTime || (isNewWorkout && !sessionTime);

  const handleHourChange = (hour: string) => {
    const newTime = `${hour}:${currentTime.substring(3, 5)}`;
    onTimeChange(newTime, !sessionTime);
  };

  const handleMinuteChange = (minute: string) => {
    const newTime = `${currentTime.substring(0, 2)}:${minute}`;
    onTimeChange(newTime, !sessionTime);
  };

  const handleCancel = () => {
    onEditToggle(false);
    onTempTimeChange(tempTime.padStart(5, '0'));
  };

  const handleEditClick = () => {
    onTempTimeChange((sessionTime || '12:00').substring(0, 5));
    onEditToggle(true);
  };

  return (
    <div className="flex items-center gap-2 border-l border-white/30 pl-4">
      <Clock size={18} />
      {isEditing ? (
        <div className="flex items-center gap-2">
          <select
            value={currentTime.substring(0, 2)}
            onChange={(e) => handleHourChange(e.target.value)}
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
            value={currentTime.substring(3, 5)}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="px-2 py-1 border rounded bg-white text-gray-900 text-sm"
          >
            {['00', '15', '30', '45'].map(minute => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
          {sessionTime && (
            <>
              <button
                onClick={onSave}
                className="px-3 py-1 bg-white text-[#208479] rounded hover:bg-gray-100 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <span className="font-medium">{sessionTime?.substring(0, 5)}</span>
          <button
            onClick={handleEditClick}
            className="p-1 hover:bg-[#1a6b62] rounded transition"
            title="Edit time"
            aria-label="Edit time"
          >
            <Edit2 size={16} />
          </button>
        </>
      )}
    </div>
  );
}
