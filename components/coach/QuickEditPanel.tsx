'use client';

import { WODFormData } from './WODModal';
import { X } from 'lucide-react';

interface QuickEditPanelProps {
  isOpen: boolean;
  quickEditWOD: WODFormData | null;
  onClose: () => void;
  onWODChange: (wod: WODFormData) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onSave: () => void;
  searchPanelOpen: boolean;
}

export default function QuickEditPanel({
  isOpen,
  quickEditWOD,
  onClose,
  onWODChange,
  onDragOver,
  onDrop,
  onSave,
  searchPanelOpen,
}: QuickEditPanelProps) {
  if (!isOpen || !quickEditWOD) return null;

  return (
    <div
      className='fixed right-0 top-[72px] h-[calc(100vh-72px)] w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l-2 border-[#208479] border-t border-gray-400 animate-slide-in-right'
      style={{ right: searchPanelOpen ? '800px' : '0' }}
    >
      {/* Header */}
      <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
        <h2 className='text-xl font-bold'>Quick Edit WOD</h2>
        <button
          onClick={onClose}
          className='hover:bg-[#1a6b62] p-1 rounded transition'
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div
        className='flex-1 overflow-y-auto p-4 space-y-4'
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* Drop Zone Indicator */}
        <div className='border-2 border-dashed border-[#208479] rounded-lg p-4 text-center text-sm text-gray-600 bg-teal-50'>
          <p className='font-semibold text-[#208479]'>Drop Zone</p>
          <p className='text-xs'>Drag entire WODs or individual sections here</p>
        </div>

        {/* Title Input */}
        <div>
          <label className='block text-sm font-semibold mb-2 text-gray-900'>WOD Title</label>
          <input
            type='text'
            value={quickEditWOD.title}
            onChange={e => onWODChange({ ...quickEditWOD, title: e.target.value })}
            placeholder='Enter workout title...'
            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400'
          />
        </div>

        {/* Sections */}
        <div className='space-y-3'>
          {quickEditWOD.sections.map((section, idx) => (
            <div key={idx} className='bg-white rounded-lg border border-gray-200 p-3'>
              <div className='flex items-center justify-between mb-2'>
                <div className='font-semibold text-sm text-gray-900'>{section.type}</div>
                <button
                  onClick={() => {
                    const newSections = quickEditWOD.sections.filter((_, i) => i !== idx);
                    onWODChange({ ...quickEditWOD, sections: newSections });
                  }}
                  className='text-red-600 hover:text-red-800 text-xs'
                >
                  Remove
                </button>
              </div>
              <div className='text-xs text-gray-500 mb-2'>{section.duration}</div>
              <textarea
                value={section.content}
                onChange={e => {
                  const newSections = [...quickEditWOD.sections];
                  newSections[idx] = { ...newSections[idx], content: e.target.value };
                  onWODChange({ ...quickEditWOD, sections: newSections });
                }}
                placeholder='Enter section content...'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 text-sm min-h-[100px] resize-y'
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className='border-t p-4 bg-gray-50 flex gap-3'>
        <button
          onClick={onClose}
          className='flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition'
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition'
        >
          Save WOD
        </button>
      </div>
    </div>
  );
}
