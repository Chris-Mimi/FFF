'use client';

import { X, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2, Heading3 } from 'lucide-react';
import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';

interface CoachNotesPanelProps {
  isOpen: boolean;
  notes: string;
  mode: 'floating' | 'side';
  // Floating mode props
  position?: { bottom: number; left: number };
  size?: { width: number; height: number };
  onDragStart?: (e: React.MouseEvent) => void;
  onResizeStart?: (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => void;
  // Common props
  onClose: () => void;
  onChange: (notes: string) => void;
}

export default function CoachNotesPanel({
  isOpen,
  notes,
  mode,
  position,
  size,
  onDragStart,
  onResizeStart,
  onClose,
  onChange,
}: CoachNotesPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);

  const toggleEditMode = () => {
    const willBeEditing = !isEditing;

    // Save scroll position before toggle
    if (isEditing && textareaRef.current) {
      scrollPosRef.current = textareaRef.current.scrollTop;
    } else if (!isEditing && previewRef.current) {
      scrollPosRef.current = previewRef.current.scrollTop;
    }

    setIsEditing(willBeEditing);

    // Restore scroll position after toggle
    setTimeout(() => {
      if (willBeEditing && textareaRef.current) {
        textareaRef.current.scrollTop = scrollPosRef.current;
      } else if (!willBeEditing && previewRef.current) {
        previewRef.current.scrollTop = scrollPosRef.current;
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = notes.substring(0, cursorPos);
      const textAfterCursor = notes.substring(cursorPos);

      // Find the current line
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      // Check for bullet list (- )
      const bulletMatch = currentLine.match(/^(\s*)- (.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1];
        const content = bulletMatch[2];

        // If line has only marker (empty item), exit list mode
        if (content.trim() === '') {
          e.preventDefault();
          const newText = textBeforeCursor.slice(0, -2) + '\n' + textAfterCursor;
          onChange(newText);
          setTimeout(() => {
            textarea.setSelectionRange(cursorPos - 1, cursorPos - 1);
            textarea.focus();
          }, 0);
          return;
        }

        // Continue bullet list
        e.preventDefault();
        const newText = textBeforeCursor + '\n' + indent + '- ' + textAfterCursor;
        onChange(newText);
        setTimeout(() => {
          const newPos = cursorPos + indent.length + 3;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        }, 0);
        return;
      }

      // Check for numbered list (1. 2. etc.)
      const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        const indent = numberedMatch[1];
        const currentNum = parseInt(numberedMatch[2]);
        const content = numberedMatch[3];

        // If line has only marker (empty item), exit list mode
        if (content.trim() === '') {
          e.preventDefault();
          const newText = textBeforeCursor.slice(0, -(currentNum.toString().length + 2)) + '\n' + textAfterCursor;
          onChange(newText);
          setTimeout(() => {
            textarea.setSelectionRange(cursorPos - currentNum.toString().length - 1, cursorPos - currentNum.toString().length - 1);
            textarea.focus();
          }, 0);
          return;
        }

        // Continue numbered list
        e.preventDefault();
        const nextNum = currentNum + 1;
        const newText = textBeforeCursor + '\n' + indent + nextNum + '. ' + textAfterCursor;
        onChange(newText);
        setTimeout(() => {
          const newPos = cursorPos + indent.length + nextNum.toString().length + 3;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        }, 0);
        return;
      }
    }
  };

  const applyFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    const beforeText = notes.substring(0, start);
    const afterText = notes.substring(end);

    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = `${beforeText}**${selectedText || 'bold text'}**${afterText}`;
        cursorOffset = selectedText ? 2 : 2;
        break;
      case 'italic':
        newText = `${beforeText}_${selectedText || 'italic text'}_${afterText}`;
        cursorOffset = selectedText ? 1 : 1;
        break;
      case 'underline':
        newText = `${beforeText}<u>${selectedText || 'underlined text'}</u>${afterText}`;
        cursorOffset = selectedText ? 3 : 3;
        break;
      case 'bullet':
        newText = selectedText
          ? `${beforeText}\n- ${selectedText}${afterText}`
          : `${beforeText}\n- ${afterText}`;
        cursorOffset = 3;
        break;
      case 'numbered':
        newText = selectedText
          ? `${beforeText}\n1. ${selectedText}${afterText}`
          : `${beforeText}\n1. ${afterText}`;
        cursorOffset = 4;
        break;
      case 'h1':
        newText = `${beforeText}\n# ${selectedText || 'Heading 1'}${afterText}`;
        cursorOffset = 3;
        break;
      case 'h2':
        newText = `${beforeText}\n## ${selectedText || 'Heading 2'}${afterText}`;
        cursorOffset = 4;
        break;
      case 'h3':
        newText = `${beforeText}\n### ${selectedText || 'Heading 3'}${afterText}`;
        cursorOffset = 5;
        break;
      default:
        return;
    }

    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + cursorOffset, end + cursorOffset);
      } else {
        let placeholderLength = 0;
        if (format === 'bold') placeholderLength = 9; // 'bold text'
        else if (format === 'italic') placeholderLength = 11; // 'italic text'
        else if (format === 'underline') placeholderLength = 16; // 'underlined text'
        else if (format === 'h1') placeholderLength = 9; // 'Heading 1'
        else if (format === 'h2') placeholderLength = 10; // 'Heading 2'
        else if (format === 'h3') placeholderLength = 11; // 'Heading 3'
        // bullet and numbered have no placeholder, cursor stays after marker

        const newCursorPos = start + cursorOffset + placeholderLength;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
      textarea.focus();
    }, 0);
  };

  if (!isOpen) return null;

  // Floating modal (panel mode)
  if (mode === 'floating') {
    return (
      <>
        {/* Mobile: Full screen overlay */}
        <div className='lg:hidden fixed inset-0 z-[80] bg-white flex flex-col'>
          {/* Header */}
          <div className='bg-[#208479] text-white p-3 flex justify-between items-center flex-shrink-0'>
            <h2 className='text-lg font-bold'>Coach Notes</h2>
            <div className='flex gap-2 items-center'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEditMode();
                }}
                className='px-2 py-1 bg-white text-[#208479] rounded text-sm font-medium hover:bg-gray-100 transition'
              >
                {isEditing ? 'Preview' : 'Edit'}
              </button>
              <button
                onClick={onClose}
                className='hover:bg-[#1a6b62] p-1 rounded transition'
                aria-label='Close'
              >
                <X size={22} />
              </button>
            </div>
          </div>
          {/* Content */}
          <div className='flex-1 overflow-y-auto p-3 flex flex-col'>
            {isEditing && (
              <div className='flex gap-1 mb-2 p-2 bg-gray-100 rounded-lg border border-gray-300 flex-shrink-0 flex-wrap'>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Bold' aria-label='Bold'>
                  <Bold size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Italic' aria-label='Italic'>
                  <Italic size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('underline'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Underline' aria-label='Underline'>
                  <UnderlineIcon size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('bullet'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Bullet List' aria-label='Bullet List'>
                  <List size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('numbered'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Numbered List' aria-label='Numbered List'>
                  <ListOrdered size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h1'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 1' aria-label='Heading 1'>
                  <Heading1 size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h2'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 2' aria-label='Heading 2'>
                  <Heading2 size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h3'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 3' aria-label='Heading 3'>
                  <Heading3 size={16} />
                </button>
              </div>
            )}
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className='flex-1 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208479] resize-none text-gray-900'
                placeholder='Add notes for this workout...'
              />
            ) : (
              <div
                ref={previewRef}
                className='flex-1 prose prose-sm max-w-none text-gray-900 overflow-y-auto'
              >
                {notes ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]} components={{
                    a: ({...props}) => <a {...props} className='text-blue-500 font-normal hover:font-bold' target='_blank' rel='noopener noreferrer' />,
                  }}>{notes}</ReactMarkdown>
                ) : (
                  <p className='text-gray-400 italic'>No notes yet. Click Edit to add notes.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop: Floating panel */}
        <div
          className='hidden lg:block fixed z-[70]'
          style={{
            bottom: `${position?.bottom || 20}px`,
            left: `${position?.left || 820}px`,
          }}
        >
          <div
            className='bg-white rounded-lg shadow-2xl flex flex-col relative border-4 border-[#208479]'
            style={{
              width: `${size?.width || 600}px`,
              height: `${size?.height || 400}px`,
            }}
          >
          {/* Corner Resize Handles */}
          <div
            className='absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-50'
            onMouseDown={(e) => onResizeStart?.(e, 'se')}
            title='Drag to resize'
          >
            <div className='absolute bottom-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition'></div>
          </div>
          <div
            className='absolute top-0 right-0 w-8 h-8 cursor-ne-resize z-50'
            onMouseDown={(e) => onResizeStart?.(e, 'ne')}
            title='Drag to resize'
          >
            <div className='absolute top-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tr-lg'></div>
          </div>
          <div
            className='absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize z-50'
            onMouseDown={(e) => onResizeStart?.(e, 'sw')}
            title='Drag to resize'
          >
            <div className='absolute bottom-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition rounded-bl-lg'></div>
          </div>
          <div
            className='absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-50'
            onMouseDown={(e) => onResizeStart?.(e, 'nw')}
            title='Drag to resize'
          >
            <div className='absolute top-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tl-lg'></div>
          </div>

          {/* Header - Draggable */}
          <div
            className='bg-[#208479] text-white p-4 rounded-t-lg flex justify-between items-center flex-shrink-0 cursor-move'
            onMouseDown={onDragStart}
          >
            <h2 className='text-xl font-bold'>Coach Notes</h2>
            <div className='flex gap-2 items-center'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEditMode();
                }}
                className='px-3 py-1 bg-white text-[#208479] rounded text-sm font-medium hover:bg-gray-100 transition'
              >
                {isEditing ? 'Preview' : 'Edit'}
              </button>
              <button
                onClick={onClose}
                className='hover:bg-[#1a6b62] p-1 rounded transition'
                aria-label='Close'
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-y-auto p-4 flex flex-col'>
            {isEditing && (
              <div className='flex gap-1 mb-2 p-2 bg-gray-100 rounded-lg border border-gray-300 flex-shrink-0'>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Bold' aria-label='Bold'>
                  <Bold size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Italic' aria-label='Italic'>
                  <Italic size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('underline'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Underline' aria-label='Underline'>
                  <UnderlineIcon size={16} />
                </button>
                <div className='w-px bg-gray-300 mx-1'></div>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('bullet'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Bullet List' aria-label='Bullet List'>
                  <List size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('numbered'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Numbered List' aria-label='Numbered List'>
                  <ListOrdered size={16} />
                </button>
                <div className='w-px bg-gray-300 mx-1'></div>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h1'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 1' aria-label='Heading 1'>
                  <Heading1 size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h2'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 2' aria-label='Heading 2'>
                  <Heading2 size={16} />
                </button>
                <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h3'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 3' aria-label='Heading 3'>
                  <Heading3 size={16} />
                </button>
              </div>
            )}
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder='Add private notes about this workout...'
                className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm'
              />
            ) : (
              <div ref={previewRef} className='flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm overflow-y-auto'>
                {notes ? (
                  <div className='prose prose-sm max-w-none'>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          />
                        ),
                        p: ({ node, ...props }) => <p {...props} className="mb-2" />,
                        ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-4 mb-2" />,
                        ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-4 mb-2" />,
                        li: ({ node, ...props }) => <li {...props} className="mb-1" />,
                        h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold mb-2 mt-4" />,
                        h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold mb-2 mt-3" />,
                        h3: ({ node, ...props }) => <h3 {...props} className="text-base font-bold mb-1 mt-2" />,
                        strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
                        em: ({ node, ...props }) => <em {...props} className="italic" />,
                      }}
                    >
                      {notes}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className='text-gray-400 italic'>No notes yet. Click Edit to add notes.</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='border-t p-4 bg-gray-50 rounded-b-lg flex-shrink-0'>
            <p className='text-xs text-gray-500'>
              Notes are private and searchable. Auto-saved when you save the WOD.
            </p>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Side panel (modal mode)
  return (
    <div className='w-[400px] bg-gray-50 shadow-xl flex flex-col border-l-2 border-[#208479]'>
      <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
        <h3 className='text-lg font-bold'>Coach Notes</h3>
        <div className='flex gap-2 items-center'>
          <button
            onClick={toggleEditMode}
            className='px-3 py-1 bg-white text-[#208479] rounded text-sm font-medium hover:bg-gray-100 transition'
          >
            {isEditing ? 'Preview' : 'Edit'}
          </button>
          <button
            onClick={onClose}
            className='hover:bg-[#1a6b62] p-1 rounded transition'
            aria-label='Close'
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div className='flex-1 overflow-y-auto p-4 flex flex-col'>
        {isEditing && (
          <div className='flex gap-1 mb-2 p-2 bg-gray-100 rounded-lg border border-gray-300 flex-shrink-0'>
            <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Bold' aria-label='Bold'>
              <Bold size={16} />
            </button>
            <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Italic' aria-label='Italic'>
              <Italic size={16} />
            </button>
            <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('underline'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Underline' aria-label='Underline'>
              <UnderlineIcon size={16} />
            </button>
            <div className='w-px bg-gray-300 mx-1'></div>
            <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('bullet'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Bullet List' aria-label='Bullet List'>
              <List size={16} />
            </button>
            <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('numbered'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Numbered List' aria-label='Numbered List'>
              <ListOrdered size={16} />
            </button>
            <div className='w-px bg-gray-300 mx-1'></div>
            <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h1'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 1' aria-label='Heading 1'>
              <Heading1 size={16} />
            </button>
            <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h2'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 2' aria-label='Heading 2'>
              <Heading2 size={16} />
            </button>
            <button type='button' onMouseDown={(e) => { e.preventDefault(); applyFormatting('h3'); }} className='p-2 hover:bg-white rounded transition text-gray-700' title='Heading 3' aria-label='Heading 3'>
              <Heading3 size={16} />
            </button>
          </div>
        )}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder='Add private notes about this workout...'
            className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm'
          />
        ) : (
          <div ref={previewRef} className='flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm overflow-y-auto'>
            {notes ? (
              <div className='prose prose-sm max-w-none'>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      />
                    ),
                    p: ({ node, ...props }) => <p {...props} className="mb-2" />,
                    ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-4 mb-2" />,
                    ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-4 mb-2" />,
                    li: ({ node, ...props }) => <li {...props} className="mb-1" />,
                    h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold mb-2 mt-4" />,
                    h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold mb-2 mt-3" />,
                    h3: ({ node, ...props }) => <h3 {...props} className="text-base font-bold mb-1 mt-2" />,
                    strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
                    em: ({ node, ...props }) => <em {...props} className="italic" />,
                  }}
                >
                  {notes}
                </ReactMarkdown>
              </div>
            ) : (
              <p className='text-gray-400 italic'>No notes yet. Click Edit to add notes.</p>
            )}
          </div>
        )}
      </div>
      <div className='border-t p-3 bg-white'>
        <p className='text-xs text-gray-500'>
          Notes are private and searchable. Auto-saved when you save the WOD.
        </p>
      </div>
    </div>
  );
}
