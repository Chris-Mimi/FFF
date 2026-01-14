'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bold, Italic, List, ListOrdered, Plus, Save, Trash2, Type, Underline as UnderlineIcon, Eye, Edit2, Folder, FolderPlus, ChevronDown, ChevronRight, MoreVertical, Search, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';

interface ProgrammingNote {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface NoteFolder {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function ProgrammingNotesTab() {
  const [notes, setNotes] = useState<ProgrammingNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<ProgrammingNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Start in preview mode
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Folder state
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null);

  // Drag and drop state
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notes
  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('programming_notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch folders
  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('note_folders')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, []);

  // Create new note
  const createNote = async () => {
    try {
      setSaving(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('programming_notes')
        .insert({
          user_id: user.id,
          title: 'New Note',
          content: '',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      setNotes([data, ...notes]);
      setSelectedNote(data);
      setTitle(data.title);
      setContent(data.content);
      setIsEditing(true);
    } catch (error) {
      console.error('Error creating note:', error);
      alert(`Error creating note: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setSaving(false);
    }
  };

  // Save note
  const saveNote = async () => {
    if (!selectedNote) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('programming_notes')
        .update({
          title,
          content,
        })
        .eq('id', selectedNote.id);

      if (error) throw error;

      // Update local state
      const updatedNote = { ...selectedNote, title, content, updated_at: new Date().toISOString() };
      setNotes(notes.map(n => n.id === selectedNote.id ? updatedNote : n));
      setSelectedNote(updatedNote);
    } catch (error) {
      console.error('Error saving note:', error);
      alert(`Error saving note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete note
  const deleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('programming_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setTitle('');
        setContent('');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert(`Error deleting note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Select note
  const selectNote = (note: ProgrammingNote) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(false);
  };

  // Folder operations
  const createFolder = async () => {
    if (!folderName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.display_order)) : 0;

      const { data, error } = await supabase
        .from('note_folders')
        .insert({
          user_id: user.id,
          name: folderName,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setFolders([...folders, data]);
      setShowFolderModal(false);
      setFolderName('');
    } catch (error) {
      console.error('Error creating folder:', error);
      alert(`Error creating folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .update({ name: newName })
        .eq('id', folderId);

      if (error) throw error;

      setFolders(folders.map(f => f.id === folderId ? { ...f, name: newName } : f));
    } catch (error) {
      console.error('Error renaming folder:', error);
      alert(`Error renaming folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder? Notes in it will be moved to "Unfiled".')) return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      setFolders(folders.filter(f => f.id !== folderId));
      setShowFolderMenu(null);
      fetchNotes(); // Refresh notes to show updated folder_id (set to null)
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert(`Error deleting folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const moveNoteToFolder = async (noteId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('programming_notes')
        .update({ folder_id: folderId })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.map(n => n.id === noteId ? { ...n, folder_id: folderId } : n));
      if (selectedNote?.id === noteId) {
        setSelectedNote({ ...selectedNote, folder_id: folderId });
      }
    } catch (error) {
      console.error('Error moving note:', error);
      alert(`Error moving note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragEndEvent) => {
    setActiveNoteId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNoteId(null);

    if (!over) return;

    const noteId = active.id as string;
    const targetId = over.id as string;

    // Check if dropping on a folder or unfiled
    if (targetId === 'unfiled') {
      moveNoteToFolder(noteId, null);
    } else if (targetId.startsWith('folder-')) {
      const folderId = targetId.replace('folder-', '');
      moveNoteToFolder(noteId, folderId);
    }
  };

  const handleDragCancel = () => {
    setActiveNoteId(null);
  };

  // Apply formatting to selected text
  const applyFormatting = (format: 'bold' | 'italic' | 'underline' | 'bullet' | 'numbered' | 'h1' | 'h2' | 'h3') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = `${beforeText}**${selectedText}**${afterText}`;
        cursorOffset = 2;
        break;
      case 'italic':
        newText = `${beforeText}_${selectedText}_${afterText}`;
        cursorOffset = 1;
        break;
      case 'underline':
        newText = `${beforeText}<u>${selectedText}</u>${afterText}`;
        cursorOffset = 3;
        break;
      case 'bullet':
        if (start === 0 || content[start - 1] === '\n') {
          newText = `${beforeText}- ${selectedText}${afterText}`;
          cursorOffset = 2;
        } else {
          newText = `${beforeText}\n- ${selectedText}${afterText}`;
          cursorOffset = 3;
        }
        break;
      case 'numbered':
        if (start === 0 || content[start - 1] === '\n') {
          newText = `${beforeText}1. ${selectedText}${afterText}`;
          cursorOffset = 3;
        } else {
          newText = `${beforeText}\n1. ${selectedText}${afterText}`;
          cursorOffset = 4;
        }
        break;
      case 'h1':
        if (start === 0 || content[start - 1] === '\n') {
          newText = `${beforeText}# ${selectedText}${afterText}`;
          cursorOffset = 2;
        } else {
          newText = `${beforeText}\n# ${selectedText}${afterText}`;
          cursorOffset = 3;
        }
        break;
      case 'h2':
        if (start === 0 || content[start - 1] === '\n') {
          newText = `${beforeText}## ${selectedText}${afterText}`;
          cursorOffset = 3;
        } else {
          newText = `${beforeText}\n## ${selectedText}${afterText}`;
          cursorOffset = 4;
        }
        break;
      case 'h3':
        if (start === 0 || content[start - 1] === '\n') {
          newText = `${beforeText}### ${selectedText}${afterText}`;
          cursorOffset = 4;
        } else {
          newText = `${beforeText}\n### ${selectedText}${afterText}`;
          cursorOffset = 5;
        }
        break;
    }

    setContent(newText);

    // Restore cursor position
    setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + cursorOffset, end + cursorOffset);
      } else {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      }
      textarea.focus();
    }, 0);
  };

  // Draggable Note Component
  function DraggableNote({ note }: { note: ProgrammingNote }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: note.id,
    });

    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          opacity: isDragging ? 0.5 : 1,
        }
      : undefined;

    return (
      <button
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => selectNote(note)}
        onContextMenu={(e) => {
          e.preventDefault();
          const folderId = prompt('Move to folder (enter folder name or leave empty for unfiled):');
          if (folderId !== null) {
            const targetFolder = folders.find(f => f.name.toLowerCase() === folderId.toLowerCase());
            moveNoteToFolder(note.id, targetFolder?.id || null);
          }
        }}
        className={`w-full text-left p-2 rounded-lg text-sm transition cursor-move ${
          selectedNote?.id === note.id
            ? 'bg-teal-50 text-teal-900'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        title='Drag to move or right-click'
      >
        <div className='font-medium truncate'>{note.title}</div>
        <div className='text-xs text-gray-500 mt-0.5'>
          {new Date(note.updated_at).toLocaleDateString()}
        </div>
      </button>
    );
  }

  // Droppable Folder Component
  function DroppableFolder({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
    const { setNodeRef, isOver } = useDroppable({
      id,
    });

    return (
      <div
        ref={setNodeRef}
        className={`${className} ${isOver ? 'bg-orange-50 ring-2 ring-orange-300' : ''}`}
      >
        {children}
      </div>
    );
  }

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='text-center py-8 text-gray-500'>Loading notes...</div>
      </div>
    );
  }

  const activeNote = notes.find(n => n.id === activeNoteId);

  // Filter notes based on search query
  const filteredNotes = searchQuery.trim()
    ? notes.filter(note => {
        const query = searchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
        );
      })
    : notes;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
    <div className='bg-white rounded-lg shadow'>
      <div className='grid grid-cols-12 gap-4 h-[calc(100vh-240px)]'>
        {/* Notes List - Left Sidebar */}
        <div className='col-span-3 border-r border-gray-200 p-4 overflow-y-auto'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-gray-900'>My Notes</h3>
            <div className='flex gap-2'>
              <button
                onClick={() => setShowFolderModal(true)}
                className='p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition'
                title='New Folder'
              >
                <FolderPlus size={20} />
              </button>
              <button
                onClick={createNote}
                disabled={saving}
                className='p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50'
                title='New Note'
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className='relative mb-4'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={18} />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm'
              placeholder='Search notes...'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className='space-y-1'>
            {/* Unfiled Notes */}
            {filteredNotes.filter(n => !n.folder_id).length > 0 && (
              <DroppableFolder id='unfiled' className='mb-2'>
                <button
                  onClick={() => setCollapsedFolders({ ...collapsedFolders, unfiled: !collapsedFolders.unfiled })}
                  className='w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-gray-700'
                >
                  {collapsedFolders.unfiled ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <Folder size={16} className='text-gray-500' />
                  <span className='text-sm font-medium'>Unfiled</span>
                  <span className='text-xs text-gray-500 ml-auto'>{filteredNotes.filter(n => !n.folder_id).length}</span>
                </button>
                {!collapsedFolders.unfiled && (
                  <div className='ml-6 mt-1 space-y-1'>
                    {filteredNotes.filter(n => !n.folder_id).map(note => (
                      <DraggableNote key={note.id} note={note} />
                    ))}
                  </div>
                )}
              </DroppableFolder>
            )}

            {/* Folders */}
            {folders.map(folder => {
              const folderNotes = filteredNotes.filter(n => n.folder_id === folder.id);
              if (searchQuery && folderNotes.length === 0) return null; // Hide empty folders when searching

              return (
              <DroppableFolder key={folder.id} id={`folder-${folder.id}`} className='mb-2'>
                <div className='w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-gray-700 group'>
                  <button
                    onClick={() => setCollapsedFolders({ ...collapsedFolders, [folder.id]: !collapsedFolders[folder.id] })}
                    className='flex items-center gap-2 flex-1'
                  >
                    {collapsedFolders[folder.id] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    <Folder size={16} className='text-orange-500' />
                    <span className='text-sm font-medium'>{folder.name}</span>
                    <span className='text-xs text-gray-500 ml-auto'>{folderNotes.length}</span>
                  </button>
                  <div className='relative'>
                    <button
                      onClick={() => setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id)}
                      className='p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition'
                    >
                      <MoreVertical size={14} />
                    </button>
                    {showFolderMenu === folder.id && (
                      <div className='absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]'>
                        <button
                          onClick={() => {
                            const newName = prompt('Rename folder:', folder.name);
                            if (newName) renameFolder(folder.id, newName);
                            setShowFolderMenu(null);
                          }}
                          className='w-full px-3 py-2 text-left text-sm hover:bg-gray-100'
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => deleteFolder(folder.id)}
                          className='w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {!collapsedFolders[folder.id] && (
                  <div className='ml-6 mt-1 space-y-1'>
                    {filteredNotes.filter(n => n.folder_id === folder.id).map(note => (
                      <DraggableNote key={note.id} note={note} />
                    ))}
                  </div>
                )}
              </DroppableFolder>
              );
            })}

            {/* Empty States */}
            {searchQuery && filteredNotes.length === 0 && (
              <p className='text-sm text-gray-500 text-center py-8'>
                No notes found matching &quot;{searchQuery}&quot;
              </p>
            )}

            {!searchQuery && notes.length === 0 && folders.length === 0 && (
              <p className='text-sm text-gray-500 text-center py-8'>No notes or folders yet!</p>
            )}
          </div>
        </div>

        {/* Editor - Right Panel */}
        <div className='col-span-9 p-4 flex flex-col min-h-0'>
          {selectedNote ? (
            <>
              {/* Title and Actions */}
              <div className='flex items-center gap-4 mb-4 flex-shrink-0'>
                <input
                  type='text'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className='flex-1 text-2xl font-bold border-b-2 border-gray-200 focus:border-teal-500 outline-none px-2 py-1'
                  placeholder='Note Title'
                />
                <div className='flex gap-2'>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2'
                  >
                    {isEditing ? (
                      <>
                        <Eye size={16} />
                        Preview
                      </>
                    ) : (
                      <>
                        <Edit2 size={16} />
                        Edit
                      </>
                    )}
                  </button>
                  <button
                    onClick={saveNote}
                    disabled={saving}
                    className='px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50 flex items-center gap-2'
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => deleteNote(selectedNote.id)}
                    className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2'
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              {/* Edit Mode */}
              {isEditing && (
                <>
                  {/* Formatting Toolbar */}
                  <div className='flex gap-1 mb-3 p-2 bg-gray-100 rounded-lg border border-gray-300 flex-shrink-0'>
                    <button type='button' onClick={() => applyFormatting('bold')} className='p-2 hover:bg-white rounded transition text-gray-700' title='Bold'>
                      <Bold size={16} />
                    </button>
                    <button type='button' onClick={() => applyFormatting('italic')} className='p-2 hover:bg-white rounded transition text-gray-700' title='Italic'>
                      <Italic size={16} />
                    </button>
                    <button type='button' onClick={() => applyFormatting('underline')} className='p-2 hover:bg-white rounded transition text-gray-700' title='Underline'>
                      <UnderlineIcon size={16} />
                    </button>
                    <div className='w-px bg-gray-300 mx-1'></div>
                    <button type='button' onClick={() => applyFormatting('h1')} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 1'>
                      <Type size={16} className='font-bold' />
                    </button>
                    <button type='button' onClick={() => applyFormatting('h2')} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 2'>
                      <Type size={14} />
                    </button>
                    <button type='button' onClick={() => applyFormatting('h3')} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 3'>
                      <Type size={12} />
                    </button>
                    <div className='w-px bg-gray-300 mx-1'></div>
                    <button type='button' onClick={() => applyFormatting('bullet')} className='p-2 hover:bg-white rounded transition text-gray-700' title='Bullet List'>
                      <List size={16} />
                    </button>
                    <button type='button' onClick={() => applyFormatting('numbered')} className='p-2 hover:bg-white rounded transition text-gray-700' title='Numbered List'>
                      <ListOrdered size={16} />
                    </button>
                  </div>

                  {/* Text Editor */}
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className='flex-1 min-h-0 border border-gray-300 rounded-lg p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                    placeholder='Start typing your notes here... (supports Markdown)'
                  />
                </>
              )}

              {/* Preview Mode */}
              {!isEditing && (
                <div className='flex-1 min-h-0 border border-gray-300 rounded-lg p-4 overflow-y-auto prose prose-sm max-w-none whitespace-pre-wrap'>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {content || '*No content yet*'}
                  </ReactMarkdown>
                </div>
              )}
            </>
          ) : (
            <div className='flex-1 flex items-center justify-center text-gray-500'>
              <div className='text-center'>
                <p className='text-lg mb-2'>No note selected</p>
                <p className='text-sm'>Select a note from the list or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Folder Modal */}
      {showFolderModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <h3 className='text-xl font-bold mb-4'>Create Folder</h3>
            <input
              type='text'
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFolder();
                if (e.key === 'Escape') {
                  setShowFolderModal(false);
                  setFolderName('');
                }
              }}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              placeholder='Folder name...'
              autoFocus
            />
            <div className='flex gap-3 mt-6'>
              <button
                onClick={createFolder}
                disabled={!folderName.trim()}
                className='flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderName('');
                }}
                className='flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      <DragOverlay>
        {activeNote && (
          <div className='p-2 bg-white border-2 border-teal-500 rounded-lg shadow-lg cursor-grabbing opacity-90'>
            <div className='font-medium text-sm'>{activeNote.title}</div>
            <div className='text-xs text-gray-500 mt-0.5'>
              {new Date(activeNote.updated_at).toLocaleDateString()}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
