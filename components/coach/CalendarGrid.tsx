'use client';

import { WODFormData } from './WODModal';
import {
  Copy,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { getCardState, getCardClasses } from '@/utils/card-utils';
import { formatDate, getWeekNumber } from '@/utils/date-utils';

interface CalendarGridProps {
  viewMode: 'weekly' | 'monthly';
  displayDates: Date[];
  wods: Record<string, WODFormData[]>;
  selectedDate: Date;
  focusedDate: Date | null;
  copiedWOD: WODFormData | null;
  hoveredWOD: string | null;
  dragHandleHovered: string | null;
  draggedWOD: { wod: WODFormData; sourceDate: string } | null;

  // Event handlers
  onDateSelect: (date: Date) => void;
  onDateFocus: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, date: Date) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, wod: WODFormData, dateKey: string) => void;
  onWODHover: (id: string | null) => void;
  onDragHandleHover: (id: string | null) => void;
  onCopyWOD: (wod: WODFormData) => void;
  onDeleteWOD: (dateKey: string, wodId: string) => void;
  onOpenEditModal: (wod: WODFormData) => void;
  onPasteFromClipboard: (date: Date) => void;
  onCopyWODToDate: (wod: WODFormData, date: Date, sessionId: string) => void;
  onSessionManagementClick: (sessionId: string, workoutDate: string) => void;
}

/**
 * CalendarGrid component - Renders either monthly or weekly calendar view
 * Handles WOD cards with drag/drop, hover states, and booking badges
 */
export default function CalendarGrid({
  viewMode,
  displayDates,
  wods,
  selectedDate,
  focusedDate,
  copiedWOD,
  hoveredWOD,
  dragHandleHovered,
  draggedWOD,
  onDateSelect,
  onDateFocus,
  onDayClick,
  onDragOver,
  onDrop,
  onDragStart,
  onWODHover,
  onDragHandleHover,
  onCopyWOD,
  onDeleteWOD,
  onOpenEditModal,
  onPasteFromClipboard,
  onCopyWODToDate,
  onSessionManagementClick,
}: CalendarGridProps) {
  /**
   * Renders a WOD card with all interactive elements
   */
  const renderWODCard = (wod: WODFormData, dateKey: string, isMonthlyView: boolean = false) => {
    const cardState = getCardState(wod);
    const cardClasses = getCardClasses(cardState);
    const isEmptySession = cardState === 'empty';
    const isPublished = cardState === 'published';
    const cardId = wod.booking_info?.session_id || wod.id || '';
    const iconSize = isMonthlyView ? 12 : 14;
    const padding = isMonthlyView ? 'p-1' : 'p-3';
    const marginBottom = isMonthlyView ? 'mb-1' : 'mb-3';
    const roundedClass = isMonthlyView ? 'rounded' : 'rounded-lg';
    const textSize = isMonthlyView ? 'text-xs' : 'text-sm';
    const titleSize = isMonthlyView ? '' : 'font-bold';

    return (
      <div
        key={cardId}
        onDragOver={onDragOver}
        onDrop={(e) => {
          e.stopPropagation();
          if (!draggedWOD || !wod.booking_info?.session_id) return;
          onCopyWODToDate(draggedWOD.wod, new Date(dateKey), wod.booking_info.session_id);
        }}
        onMouseEnter={() => !isEmptySession && onWODHover(cardId)}
        onMouseLeave={() => onWODHover(null)}
        className={`workout-card ${marginBottom} ${padding} ${roundedClass} ${textSize} transition group relative ${cardClasses} ${
          isEmptySession ? 'cursor-pointer' : ''
        } ${hoveredWOD === cardId ? 'z-[60]' : 'z-[60]'}`}
        title={isEmptySession ? 'Click to add workout' : 'Hover for details, drag handle to copy'}
        onClick={(e) => {
          if (isEmptySession) {
            e.stopPropagation();
            onOpenEditModal(wod);
          }
        }}
      >
        {/* Drag Handle - Only for workouts with content */}
        {!isEmptySession && (
          <div
            draggable
            onDragStart={(e) => onDragStart(e, wod, dateKey)}
            onMouseEnter={() => onDragHandleHover(cardId)}
            onMouseLeave={() => onDragHandleHover(null)}
            className='absolute top-0 left-0 cursor-move p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10'
            title='Drag to copy'
          >
            <GripVertical size={iconSize} className={isPublished ? 'text-white' : 'text-gray-600'} />
          </div>
        )}

        <div className={isMonthlyView ? 'flex flex-col gap-0.5' : 'pr-8'}>
          {/* Title Row */}
          <div className='flex items-center gap-1'>
            {/* Title */}
            <div
              className={`${titleSize} flex-1 min-w-0 truncate cursor-pointer ${
                isPublished ? 'text-white' : isEmptySession ? 'text-gray-600' : 'text-gray-900'
              }`}
              onClick={() => onOpenEditModal(wod)}
            >
              {wod.title}
            </div>

            {/* Published Icon */}
            {isPublished && (
              <span className='flex-shrink-0 text-xs' title='Published for athlete logging'>
                📊
              </span>
            )}

            {/* Booking Info */}
            {wod.booking_info && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSessionManagementClick(wod.booking_info!.session_id, wod.date);
                }}
                className={`flex-shrink-0 text-[10px] font-bold text-white rounded px-1 py-0.5 hover:opacity-80 transition cursor-pointer ${
                  wod.booking_info.waitlist_count > 0
                    ? 'bg-purple-600'
                    : wod.booking_info.confirmed_count >= wod.booking_info.capacity
                      ? 'bg-red-600'
                      : wod.booking_info.confirmed_count >= wod.booking_info.capacity * 0.8
                        ? 'bg-yellow-600'
                        : 'bg-green-600'
                }`}
                title={`Click to manage session - ${wod.booking_info.confirmed_count} confirmed / ${wod.booking_info.capacity} capacity${
                  wod.booking_info.waitlist_count > 0 ? ` (+${wod.booking_info.waitlist_count} waitlist)` : ''
                }`}
              >
                {wod.booking_info.confirmed_count}/{wod.booking_info.capacity}
                {wod.booking_info.waitlist_count > 0 ? ` +${wod.booking_info.waitlist_count}` : ''}
              </button>
            )}
          </div>

          {/* Time Display */}
          <div className={`${textSize} ${isEmptySession ? 'text-gray-600' : 'text-white'}`}>
            {wod.booking_info?.time}
          </div>
        </div>

        {/* Action Buttons - Only for workouts with content */}
        {!isEmptySession && (
          <div
            className={`absolute flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
              isMonthlyView ? 'top-1 right-1' : 'top-2 right-2 flex-col gap-1'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyWOD(wod);
              }}
              className={`hover:text-[#1a6b62] p-${isMonthlyView ? '0.5' : '1'} transition ${
                isMonthlyView ? 'text-[#208479]' : 'text-[#208479] bg-white rounded shadow-sm'
              }`}
              title='Copy WOD'
            >
              <Copy size={iconSize} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteWOD(dateKey, wod.id!);
              }}
              className={`hover:text-red-600 p-${isMonthlyView ? '0.5' : '1'} transition ${
                isMonthlyView ? 'text-gray-500' : 'text-gray-500 bg-white rounded shadow-sm'
              }`}
              title='Delete WOD'
            >
              <Trash2 size={iconSize} />
            </button>
          </div>
        )}

        {/* Hover Popover - Only for workouts with content */}
        {!isEmptySession && hoveredWOD === cardId && dragHandleHovered !== cardId && (
          <div className='absolute left-0 top-full w-80 bg-white border-2 border-[#208479] rounded-lg shadow-2xl p-4 z-[200] max-h-96 overflow-y-auto'>
            <div className='text-sm font-bold text-gray-900 mb-3'>{wod.title}</div>
            <div className='space-y-3'>
              {wod.sections
                .filter((section) => {
                  const excludedTypes = ['Whiteboard Intro', 'Warm-up', 'WOD preparation', 'Cool Down'];
                  return section.content?.trim() && !excludedTypes.includes(section.type);
                })
                .map((section, idx) => (
                  <div key={idx} className='border-b border-gray-200 pb-2 last:border-b-0'>
                    <div className='text-xs font-semibold text-[#208479] mb-1'>
                      {section.type}
                      {section.duration > 0 && ` (${section.duration} min)`}
                    </div>
                    <div className='text-xs text-gray-700 whitespace-pre-wrap'>{section.content}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders a single day cell with all WODs for that day
   */
  const renderDayCell = (date: Date, isMonthlyView: boolean = false) => {
    const dateKey = formatDate(date);
    const dayWODs = wods[dateKey] || [];
    const isToday = formatDate(new Date()) === dateKey;
    const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
    const isSelected = focusedDate && formatDate(date) === formatDate(focusedDate);
    const minHeight = isMonthlyView ? 'min-h-[120px]' : 'min-h-[300px]';
    const padding = isMonthlyView ? 'p-2' : 'p-4';
    const dayNumberClass = isCurrentMonth ? 'text-[#208479]' : 'text-gray-400';

    if (isMonthlyView) {
      return (
        <div
          key={dateKey}
          className={`bg-white rounded-lg shadow ${padding} ${minHeight} relative cursor-pointer ${
            isToday ? 'ring-2 ring-[#208479]' : ''
          } ${isSelected ? 'ring-4 ring-blue-400' : ''} ${!isCurrentMonth ? 'opacity-40' : ''}`}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, date)}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.workout-card') && !target.closest('button')) {
              const newDate = new Date(date);
              onDateFocus(newDate);
              onDateSelect(newDate);
            }
          }}
        >
          {/* Day Number and Paste Button */}
          <div className='flex items-center justify-between mb-1'>
            <div
              className={`text-sm font-semibold cursor-pointer ${dayNumberClass}`}
              onClick={(e) => {
                e.stopPropagation();
                const newDate = new Date(date);
                onDateSelect(newDate);
                onDateFocus(newDate);
                onDayClick(newDate);
              }}
            >
              {date.getDate()}
            </div>
            {copiedWOD && (
              <button
                onClick={() => onPasteFromClipboard(date)}
                className='text-[10px] px-1 py-0.5 bg-[#208479] text-white rounded hover:bg-[#1a6b62] transition'
                title='Paste WOD'
              >
                Paste
              </button>
            )}
          </div>

          {/* WODs */}
          {dayWODs.map((wod: WODFormData) => renderWODCard(wod, dateKey, true))}
        </div>
      );
    } else {
      // Weekly view
      return (
        <div
          key={dateKey}
          className={`bg-white rounded-lg shadow ${padding} ${minHeight} cursor-pointer flex flex-col ${
            isToday ? 'ring-2 ring-[#208479]' : ''
          } ${isSelected ? 'ring-4 ring-blue-400' : ''}`}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, date)}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.workout-card') && !target.closest('button')) {
              onDateFocus(date);
            }
          }}
        >
          {/* Day Header */}
          <div className='mb-3'>
            <div className='font-bold text-lg text-gray-900'>
              {date.toLocaleDateString('en-GB', { weekday: 'long' })}
            </div>
            <div className='text-sm text-gray-700'>
              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          </div>

          {/* WODs for this day */}
          <div className='flex-1'>{dayWODs.map((wod: WODFormData) => renderWODCard(wod, dateKey, false))}</div>

          {/* Bottom Buttons */}
          <div className='flex gap-1 items-center justify-end mt-3 pt-3 border-t border-gray-200'>
            {copiedWOD && (
              <button
                onClick={() => onPasteFromClipboard(date)}
                className='text-xs px-2 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] transition whitespace-nowrap'
                title='Paste WOD'
              >
                Paste
              </button>
            )}
          </div>
        </div>
      );
    }
  };

  if (viewMode === 'monthly') {
    return (
      /* Month View with Week Numbers */
      <div className='w-full max-w-none px-4'>
        {/* Weekday Headers */}
        <div className='flex gap-2 mb-2'>
          {/* Week number column header */}
          <div className='w-8'></div>
          {/* Day headers */}
          <div className='flex-1 grid grid-cols-7 gap-2'>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className='text-center text-xs font-semibold text-white bg-[#208479] py-2 rounded'
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Month Grid - 6 rows of 7 days */}
        {Array.from({ length: 6 }).map((_, weekIdx) => {
          const weekStart = weekIdx * 7;
          const weekDates = displayDates.slice(weekStart, weekStart + 7);
          const weekNumber = getWeekNumber(weekDates[0]);

          return (
            <div key={weekIdx} className='flex gap-2 mb-2'>
              {/* Week Number - Teal Box */}
              <div className='w-8 flex items-center justify-center text-xs font-semibold text-white bg-[#208479] rounded'>
                {weekNumber}
              </div>

              {/* Days in week */}
              <div className='flex-1 grid grid-cols-7 gap-2'>
                {weekDates.map((date) => renderDayCell(date, true))}
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    // Weekly view - 2 weeks
    return (
      <div className='px-4'>
        {/* First Week */}
        <div className='mb-6'>
          {/* Week Number Banner */}
          <div className='bg-[#208479] text-white px-4 py-2 rounded-t-lg mb-4'>
            <div className='text-sm font-semibold'>Week {getWeekNumber(displayDates[0])}</div>
          </div>

          <div className='grid grid-cols-7 gap-2'>{displayDates.slice(0, 7).map((date) => renderDayCell(date, false))}</div>
        </div>

        {/* Second Week */}
        <div>
          {/* Week Number Banner */}
          <div className='bg-[#208479] text-white px-4 py-2 rounded-t-lg mb-4'>
            <div className='text-sm font-semibold'>
              Week{' '}
              {getWeekNumber(
                (() => {
                  const secondWeekStart = new Date(displayDates[0]);
                  secondWeekStart.setDate(secondWeekStart.getDate() + 7);
                  return secondWeekStart;
                })(),
              )}
            </div>
          </div>

          <div className='grid grid-cols-7 gap-2'>
            {Array.from({ length: 7 }).map((_, dayOffset) => {
              const currentDate = new Date(displayDates[0]);
              currentDate.setDate(currentDate.getDate() + 7 + dayOffset);
              return renderDayCell(currentDate, false);
            })}
          </div>
        </div>
      </div>
    );
  }
}
