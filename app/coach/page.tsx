'use client';

import WorkoutModal, { WODFormData } from '@/components/coach/WorkoutModal';
import SessionManagementModal from '@/components/coach/SessionManagementModal';
import DeleteWorkoutModal from '@/components/coach/DeleteWorkoutModal';
import { CoachHeader } from '@/components/coach/CoachHeader';
import { CalendarNav } from '@/components/coach/CalendarNav';
import CalendarGrid from '@/components/coach/CalendarGrid';
import SearchPanel from '@/components/coach/SearchPanel';
import QuickEditPanel from '@/components/coach/QuickEditPanel';
// import NotesModal from '@/components/coach/NotesModal'; // ARCHIVED: Dead code - never triggered
import { getCurrentUser, signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  useCoachData,
  useWODOperations,
  useDragDrop,
  useQuickEdit,
  useNotesPanel,
} from '@/hooks/coach';
import { getWeekDates, getMonthDates } from '@/utils/date-utils';
import { highlightText } from '@/utils/search-utils';

type ViewMode = 'weekly' | 'monthly';

export default function CoachDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);

  // View and navigation state
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coachCalendarDate');
      if (saved) {
        return new Date(saved);
      }
    }
    return new Date();
  });
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [editingWOD, setEditingWOD] = useState<WODFormData | null>(null);

  // Hover state
  const [hoveredWOD, setHoveredWOD] = useState<string | null>(null);
  const [dragHandleHovered, setDragHandleHovered] = useState<string | null>(null);

  // UI panels
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);
  const [selectedWorkoutTypes, setSelectedWorkoutTypes] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [includedSectionTypes, setIncludedSectionTypes] = useState<string[]>([]);
  const [selectedSearchWOD, setSelectedSearchWOD] = useState<WODFormData | null>(null);
  const [hoveredSearchWOD, setHoveredSearchWOD] = useState<WODFormData | null>(null);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);

  // Session management
  const [sessionManagementModal, setSessionManagementModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    workoutDate: string | null;
  }>({ isOpen: false, sessionId: null, workoutDate: null });

  // Custom hooks
  const {
    wods,
    tracks,
    trackCounts,
    workoutTypes,
    workoutTypeCounts,
    sectionTypes,
    searchResults,
    movements,
    loading,
    fetchWODs,
    fetchTracksAndCounts,
  } = useCoachData({
    searchQuery,
    selectedMovements,
    selectedWorkoutTypes,
    selectedTracks,
    includedSectionTypes,
  });

  const { handleSaveWOD, handleDeleteWOD, handleDeleteWODToEmpty, handleDeleteWODPermanently, handleDeleteSession, handleCopyWOD } = useWODOperations({
    fetchWODs,
    fetchTracksAndCounts,
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingWODId, setDeletingWODId] = useState<string | null>(null);

  const {
    draggedWOD,
    copiedWOD,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleCopyToClipboard,
    handlePasteFromClipboard,
  } = useDragDrop();

  const {
    quickEditMode,
    quickEditWOD,
    setQuickEditMode,
    setQuickEditWOD,
    handleSectionDragStart,
    handleQuickEditDrop,
    saveQuickEdit,
  } = useQuickEdit({ fetchWODs, fetchTracksAndCounts });

  const {
    notesPanel,
    notesDraft,
    modalSize,
    setNotesDraft,
    setModalSize,
    closeNotesPanel,
    handleSaveNotes,
  } = useNotesPanel({ fetchWODs, fetchTracksAndCounts});

  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isResizingModal, setIsResizingModal] = useState(false);

  // Persist selectedDate to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('coachCalendarDate', selectedDate.toISOString());
    }
  }, [selectedDate]);

  // Auth check
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      const role = currentUser.user_metadata?.role || 'athlete';
      if (role !== 'coach') {
        router.push('/athlete');
        return;
      }

      if (cancelled) return;

      setUser({
        role,
        name: currentUser.user_metadata?.full_name || currentUser.email || 'Coach',
      });

      fetchWODs();
      fetchTracksAndCounts();
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const openCreateModal = (date: Date) => {
    setModalDate(date);
    setEditingWOD(null);
    setIsModalOpen(true);
  };

  const openEditModal = (wod: WODFormData) => {
    setEditingWOD(wod);
    setModalDate(new Date(wod.date));
    setIsModalOpen(true);
  };

  const openEditModalWithNotes = (wod: WODFormData) => {
    setEditingWOD(wod);
    setModalDate(new Date(wod.date));
    setNotesPanelOpen(true);
    setIsModalOpen(true);
  };

  // Wrapper functions for drag/drop that curry handleCopyWOD
  const handleDropWrapper = (e: React.DragEvent, date: Date) => {
    handleDrop(e, date, handleCopyWOD);
  };

  const handlePasteWrapper = (date: Date) => {
    handlePasteFromClipboard(date, handleCopyWOD);
  };

  // Delete workout wrapper - opens modal
  const handleDeleteWODWrapper = async (dateKey: string, wodId: string) => {
    const result = await handleDeleteWOD(dateKey, wodId);
    if (result) {
      setDeletingWODId(result);
      setDeleteModalOpen(true);
    }
  };

  const previousPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  if (loading || !user) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#208479] mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  const displayDates = viewMode === 'weekly' ? getWeekDates(selectedDate) : getMonthDates(selectedDate);
  const weekDates = getWeekDates(selectedDate);

  return (
    <div className='min-h-screen bg-gray-200 relative'>
      {/* Header */}
      <CoachHeader
        userName={user.name}
        searchPanelOpen={searchPanelOpen}
        onSearchPanelToggle={() => setSearchPanelOpen(!searchPanelOpen)}
        onLogout={handleLogout}
      />

      {/* Calendar Content - hidden on mobile when modal open, pushed on desktop */}
      <div
        className={`flex flex-col transition-all duration-300 ${
          isModalOpen ? 'hidden lg:flex' : ''
        } ${
          isModalOpen && searchPanelOpen
            ? ''
            : isModalOpen && quickEditMode && searchPanelOpen
            ? 'lg:ml-[800px] lg:mr-[1200px]'
            : isModalOpen && quickEditMode
            ? 'lg:ml-[800px] lg:mr-[400px]'
            : quickEditMode && searchPanelOpen
            ? 'lg:mr-[1200px]'
            : quickEditMode
            ? 'lg:mr-[800px]'
            : isModalOpen
            ? 'lg:ml-[800px]'
            : searchPanelOpen
            ? 'lg:mr-[800px]'
            : ''
        }`}
      >
        {/* Main Content */}
        <div className='flex-1 flex flex-col'>
          {!(isModalOpen && searchPanelOpen) && (
            <>
              {/* Calendar Navigation */}
              <CalendarNav
                viewMode={viewMode}
                selectedDate={selectedDate}
                weekDates={weekDates}
                focusedDate={focusedDate}
                copiedWOD={copiedWOD}
                onViewModeChange={setViewMode}
                onPreviousPeriod={previousPeriod}
                onNextPeriod={nextPeriod}
                onTodayClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setFocusedDate(today);
                }}
                onAddWorkout={() => openCreateModal(focusedDate || new Date())}
                onCancelCopy={() => {
                if (copiedWOD) handleCopyToClipboard(null);
              }}
              />

              {/* Calendar Grid */}
              <CalendarGrid
                viewMode={viewMode}
                displayDates={displayDates}
                wods={wods}
                tracks={tracks}
                selectedDate={selectedDate}
                focusedDate={focusedDate}
                copiedWOD={copiedWOD}
                hoveredWOD={hoveredWOD}
                dragHandleHovered={dragHandleHovered}
                draggedWOD={draggedWOD}
                onDateSelect={setSelectedDate}
                onDateFocus={setFocusedDate}
                onDayClick={(date) => {
                  setFocusedDate(date);
                  setSelectedDate(date);
                  setViewMode('weekly');
                }}
                onDragOver={handleDragOver}
                onDrop={handleDropWrapper}
                onDragStart={handleDragStart}
                onWODHover={setHoveredWOD}
                onDragHandleHover={setDragHandleHovered}
                onCopyWOD={handleCopyToClipboard}
                onDeleteWOD={handleDeleteWODWrapper}
                onDeleteSession={handleDeleteSession}
                onOpenEditModal={openEditModal}
                onOpenEditModalWithNotes={openEditModalWithNotes}
                onPasteFromClipboard={handlePasteWrapper}
                onCopyWODToDate={handleCopyWOD}
                onSessionManagementClick={(sessionId, workoutDate) => {
                  setSessionManagementModal({
                    isOpen: true,
                    sessionId,
                    workoutDate,
                  });
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Workout Modal */}
      {isModalOpen && (
        <WorkoutModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setNotesPanelOpen(false);
          }}
          date={modalDate}
          editingWOD={editingWOD}
          onSave={(wodData) => handleSaveWOD(wodData, editingWOD, modalDate)}
          initialNotesOpen={notesPanelOpen}
          onNotesToggle={setNotesPanelOpen}
          onTimeUpdated={fetchWODs}
          isPanel={true}
          panelOffset={searchPanelOpen ? 800 : quickEditMode ? 400 : 0}
        />
      )}

      {/* Search Panel */}
      {searchPanelOpen && (
        <SearchPanel
          isOpen={searchPanelOpen}
          onClose={() => setSearchPanelOpen(false)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchResults={searchResults}
          selectedMovements={selectedMovements}
          onSelectedMovementsChange={setSelectedMovements}
          selectedWorkoutTypes={selectedWorkoutTypes}
          onSelectedWorkoutTypesChange={setSelectedWorkoutTypes}
          selectedTracks={selectedTracks}
          onSelectedTracksChange={setSelectedTracks}
          includedSectionTypes={includedSectionTypes}
          onIncludedSectionTypesChange={setIncludedSectionTypes}
          movements={movements}
          workoutTypes={workoutTypes}
          tracks={tracks}
          sectionTypes={sectionTypes}
          trackCounts={trackCounts}
          workoutTypeCounts={workoutTypeCounts}
          selectedSearchWOD={selectedSearchWOD}
          onSelectedSearchWODChange={setSelectedSearchWOD}
          hoveredWOD={hoveredSearchWOD}
          onHoveredWODChange={setHoveredSearchWOD}
          onDragStart={handleDragStart}
          onSectionDragStart={handleSectionDragStart}
          onEditWOD={(wod) => {
            setEditingWOD(wod);
            setModalDate(new Date(wod.date));
            setIsModalOpen(true);
          }}
          onCreateWorkout={(date) => {
            setModalDate(date);
            setEditingWOD(null);
            setIsModalOpen(true);
            setNotesPanelOpen(false);
          }}
          highlightText={highlightText}
        />
      )}

      {/* Quick Edit Panel */}
      <QuickEditPanel
        isOpen={quickEditMode}
        quickEditWOD={quickEditWOD}
        onWODChange={setQuickEditWOD}
        onDrop={(e) => handleQuickEditDrop(draggedWOD, e)}
        onDragOver={handleDragOver}
        onSave={saveQuickEdit}
        searchPanelOpen={searchPanelOpen}
        onClose={() => {
          setQuickEditMode(false);
          setQuickEditWOD(null);
        }}
      />

      {/* Notes Modal - ARCHIVED: Dead code, never triggered */}
      {/* {notesPanel.isOpen && notesPanel.wod && (
        <NotesModal
          isOpen={notesPanel.isOpen}
          wod={notesPanel.wod}
          notesDraft={notesDraft}
          onNotesDraftChange={setNotesDraft}
          modalSize={modalSize}
          onModalSizeChange={setModalSize}
          isResizing={isResizingModal}
          onResizingChange={setIsResizingModal}
          resizeStart={resizeStart}
          onResizeStartChange={setResizeStart}
          onSave={handleSaveNotes}
          onClose={closeNotesPanel}
        />
      )} */}

      {/* Session Management Modal */}
      <SessionManagementModal
        isOpen={sessionManagementModal.isOpen}
        onClose={() => setSessionManagementModal({ isOpen: false, sessionId: null, workoutDate: null })}
        sessionId={sessionManagementModal.sessionId || ''}
        workoutDate={sessionManagementModal.workoutDate || ''}
        onSessionUpdated={() => {
          fetchWODs();
        }}
      />

      {/* Delete Workout Modal */}
      <DeleteWorkoutModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingWODId(null);
        }}
        onReturnToEmpty={async () => {
          if (deletingWODId) {
            await handleDeleteWODToEmpty(deletingWODId);
            setDeleteModalOpen(false);
            setDeletingWODId(null);
          }
        }}
        onPermanentDelete={async () => {
          if (deletingWODId) {
            await handleDeleteWODPermanently(deletingWODId);
            setDeleteModalOpen(false);
            setDeletingWODId(null);
          }
        }}
      />
    </div>
  );
}
