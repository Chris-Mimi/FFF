'use client';

import { X } from 'lucide-react';

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  tempStartMonth: Date;
  tempEndMonth: Date;
  onStartMonthChange: (month: Date) => void;
  onEndMonthChange: (month: Date) => void;
  startYearInput: string;
  endYearInput: string;
  onStartYearInputChange: (value: string) => void;
  onEndYearInputChange: (value: string) => void;
  onStartYearBlur: () => void;
  onEndYearBlur: () => void;
  onApply: (monthsDiff: number, daysDiff: number) => void;
  onToday: () => void;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  onDragStart: (e: React.MouseEvent, rect: DOMRect) => void;
  onDragMove: (e: React.MouseEvent) => void;
  onDragEnd: () => void;
}

export default function DateRangePicker({
  isOpen,
  onClose,
  position,
  tempStartMonth,
  tempEndMonth,
  onStartMonthChange,
  onEndMonthChange,
  startYearInput,
  endYearInput,
  onStartYearInputChange,
  onEndYearInputChange,
  onStartYearBlur,
  onEndYearBlur,
  onApply,
  onToday,
  isDragging,
  dragOffset,
  onDragStart,
  onDragMove,
  onDragEnd,
}: DateRangePickerProps) {
  if (!isOpen) return null;

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const pickerContent = (
    <>
      <div
        className='bg-[#208479] text-white px-4 py-2 rounded-t-lg flex justify-between items-center cursor-grab active:cursor-grabbing'
        onMouseDown={(e) => {
          const rect = e.currentTarget.parentElement!.getBoundingClientRect();
          onDragStart(e, rect);
        }}
      >
        <h3 className='text-sm font-bold'>Select Date Range</h3>
        <button
          onClick={onClose}
          className='hover:bg-[#1a6b62] rounded p-1 transition'
          aria-label='Close'
        >
          <X size={16} />
        </button>
      </div>

      <div className='p-4 space-y-3'>
        {/* From Date */}
        <div>
          <label className='block text-xs font-semibold text-gray-700 mb-2'>From</label>
          <div className='flex gap-2'>
            <select
              value={tempStartMonth.getMonth()}
              onChange={(e) => {
                const newStartMonth = new Date(tempStartMonth.getFullYear(), parseInt(e.target.value), 1);
                if (newStartMonth <= tempEndMonth) {
                  onStartMonthChange(newStartMonth);
                }
              }}
              className='flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-sm text-gray-900 bg-white'
            >
              {months.map((month, idx) => (
                <option key={idx} value={idx}>{month}</option>
              ))}
            </select>
            <input
              type='number'
              value={startYearInput}
              onChange={(e) => {
                const value = e.target.value;
                onStartYearInputChange(value);
                const year = parseInt(value);
                if (!isNaN(year) && year >= 2000 && year <= 2099) {
                  const newStartMonth = new Date(year, tempStartMonth.getMonth(), 1);
                  if (newStartMonth <= tempEndMonth) {
                    onStartMonthChange(newStartMonth);
                  }
                }
              }}
              onBlur={onStartYearBlur}
              className='w-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-sm text-gray-900 bg-white'
              placeholder='YYYY'
              min='2000'
              max='2099'
            />
          </div>
        </div>

        {/* To Date */}
        <div>
          <label className='block text-xs font-semibold text-gray-700 mb-2'>To</label>
          <div className='flex gap-2'>
            <select
              value={tempEndMonth.getMonth()}
              onChange={(e) => {
                const newEndMonth = new Date(tempEndMonth.getFullYear(), parseInt(e.target.value), 1);
                if (newEndMonth >= tempStartMonth) {
                  onEndMonthChange(newEndMonth);
                }
              }}
              className='flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-sm text-gray-900 bg-white'
            >
              {months.map((month, idx) => (
                <option key={idx} value={idx}>{month}</option>
              ))}
            </select>
            <input
              type='number'
              value={endYearInput}
              onChange={(e) => {
                const value = e.target.value;
                onEndYearInputChange(value);
                const year = parseInt(value);
                if (!isNaN(year) && year >= 2000 && year <= 2099) {
                  const newEndMonth = new Date(year, tempEndMonth.getMonth(), 1);
                  if (newEndMonth >= tempStartMonth) {
                    onEndMonthChange(newEndMonth);
                  }
                }
              }}
              onBlur={onEndYearBlur}
              className='w-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-sm text-gray-900 bg-white'
              placeholder='YYYY'
              min='2000'
              max='2099'
            />
          </div>
        </div>
      </div>

      <div className='p-3 border-t bg-gray-50 rounded-b-lg space-y-2'>
        <button
          onClick={onToday}
          className='w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded transition'
        >
          Today
        </button>
        <div className='flex gap-2'>
          <button
            onClick={onClose}
            className='flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-white transition'
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const timeDiff = tempEndMonth.getTime() - tempStartMonth.getTime();
              const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;
              const monthsDiff = (tempEndMonth.getFullYear() - tempStartMonth.getFullYear()) * 12 +
                                (tempEndMonth.getMonth() - tempStartMonth.getMonth()) + 1;
              onApply(monthsDiff, daysDiff);
            }}
            className='flex-1 px-3 py-1.5 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm font-semibold rounded transition'
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: centered modal with backdrop */}
      <div
        className='md:hidden fixed inset-0 z-40 flex items-start justify-center pt-20 bg-black/30'
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className='bg-white rounded-lg shadow-2xl w-[calc(100%-2rem)] max-w-80 border-2 border-[#208479]'>
          {pickerContent}
        </div>
      </div>

      {/* Desktop: positioned popup */}
      <div
        className='hidden md:block fixed bg-white rounded-lg shadow-2xl w-80 border-2 border-[#208479] z-50'
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        {pickerContent}
      </div>
    </>
  );
}
