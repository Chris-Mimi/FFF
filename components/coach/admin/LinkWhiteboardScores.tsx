'use client';

import { useEffect, useState, useRef } from 'react';
import { Link2, Check, X } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';
import { supabase } from '@/lib/supabase';

interface WhiteboardEntry {
  whiteboardName: string;
  scoreCount: number;
}

interface Member {
  id: string;
  name: string;
}

interface LinkResult {
  linked: number;
  duplicatesRemoved: number;
}

export default function LinkWhiteboardScores() {
  const [entries, setEntries] = useState<WhiteboardEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [linkingName, setLinkingName] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, LinkResult>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [wbRes, { data: membersData }] = await Promise.all([
          authFetch('/api/admin/whiteboard-scores'),
          supabase.from('members').select('id, name').eq('status', 'active').order('name'),
        ]);
        if (wbRes.ok) {
          setEntries(await wbRes.json());
        }
        if (membersData) {
          setMembers(membersData);
        }
      } catch (err) {
        console.error('Error loading whiteboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLink = async (whiteboardName: string) => {
    const memberId = selectedMember[whiteboardName];
    if (!memberId) return;

    setLinkingName(whiteboardName);
    try {
      const res = await authFetch('/api/admin/whiteboard-scores/link', {
        method: 'POST',
        body: JSON.stringify({ whiteboardName, memberId }),
      });
      if (res.ok) {
        const result: LinkResult = await res.json();
        setResults(prev => ({ ...prev, [whiteboardName]: result }));
        // Remove from list after brief delay so coach can see the result
        setTimeout(() => {
          setEntries(prev => prev.filter(e => e.whiteboardName !== whiteboardName));
          setResults(prev => {
            const next = { ...prev };
            delete next[whiteboardName];
            return next;
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Error linking:', err);
    } finally {
      setLinkingName(null);
    }
  };

  const getFilteredMembers = (wbName: string) => {
    const search = (searchText[wbName] || '').toLowerCase();
    if (!search) return members;
    return members.filter(m => m.name.toLowerCase().includes(search));
  };

  const getSelectedMemberName = (wbName: string) => {
    const id = selectedMember[wbName];
    if (!id) return '';
    return members.find(m => m.id === id)?.name || '';
  };

  return (
    <div className='bg-white rounded-lg shadow-md p-6 mb-8'>
      <div className='flex items-center gap-3 mb-4'>
        <div className='bg-[#178da6]/10 text-[#178da6] p-2 rounded-lg'>
          <Link2 size={20} />
        </div>
        <div>
          <h2 className='text-xl font-semibold text-gray-900'>Link Whiteboard Scores</h2>
          <p className='text-sm text-gray-500'>Link scores entered under whiteboard names to registered members</p>
        </div>
      </div>

      {loading ? (
        <p className='text-gray-500 text-sm'>Loading...</p>
      ) : entries.length === 0 ? (
        <p className='text-gray-500 text-sm'>No unlinked whiteboard scores found.</p>
      ) : (
        <div className='space-y-3'>
          {entries.map(entry => {
            const result = results[entry.whiteboardName];
            const isLinking = linkingName === entry.whiteboardName;
            const hasMember = !!selectedMember[entry.whiteboardName];

            return (
              <div
                key={entry.whiteboardName}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border transition ${
                  result ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                {/* Whiteboard name + count */}
                <div className='flex items-center gap-2 sm:w-48 shrink-0'>
                  <span className='font-medium text-gray-900'>{entry.whiteboardName}</span>
                  <span className='text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full'>
                    {entry.scoreCount} {entry.scoreCount === 1 ? 'score' : 'scores'}
                  </span>
                </div>

                {result ? (
                  <div className='flex items-center gap-2 text-sm text-green-700'>
                    <Check size={16} />
                    {result.linked} linked{result.duplicatesRemoved > 0 ? `, ${result.duplicatesRemoved} duplicates removed` : ''}
                  </div>
                ) : (
                  <>
                    {/* Searchable member dropdown */}
                    <div className='relative flex-1 min-w-0' ref={openDropdown === entry.whiteboardName ? dropdownRef : undefined}>
                      <input
                        type='text'
                        placeholder='Search member...'
                        value={openDropdown === entry.whiteboardName ? (searchText[entry.whiteboardName] || '') : getSelectedMemberName(entry.whiteboardName)}
                        onChange={e => {
                          setSearchText(prev => ({ ...prev, [entry.whiteboardName]: e.target.value }));
                          setOpenDropdown(entry.whiteboardName);
                          // Clear selection when typing
                          setSelectedMember(prev => {
                            const next = { ...prev };
                            delete next[entry.whiteboardName];
                            return next;
                          });
                        }}
                        onFocus={() => setOpenDropdown(entry.whiteboardName)}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent'
                      />
                      {hasMember && openDropdown !== entry.whiteboardName && (
                        <button
                          onClick={() => {
                            setSelectedMember(prev => {
                              const next = { ...prev };
                              delete next[entry.whiteboardName];
                              return next;
                            });
                            setSearchText(prev => {
                              const next = { ...prev };
                              delete next[entry.whiteboardName];
                              return next;
                            });
                          }}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                        >
                          <X size={14} />
                        </button>
                      )}
                      {openDropdown === entry.whiteboardName && (
                        <div className='absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto'>
                          {getFilteredMembers(entry.whiteboardName).map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSelectedMember(prev => ({ ...prev, [entry.whiteboardName]: m.id }));
                                setSearchText(prev => ({ ...prev, [entry.whiteboardName]: '' }));
                                setOpenDropdown(null);
                              }}
                              className='w-full text-left px-3 py-2 text-sm hover:bg-[#178da6]/10 transition'
                            >
                              {m.name}
                            </button>
                          ))}
                          {getFilteredMembers(entry.whiteboardName).length === 0 && (
                            <p className='px-3 py-2 text-sm text-gray-400'>No members found</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Link button */}
                    <button
                      onClick={() => handleLink(entry.whiteboardName)}
                      disabled={!hasMember || isLinking}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition shrink-0 ${
                        hasMember && !isLinking
                          ? 'bg-[#178da6] text-white hover:bg-[#14758c]'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isLinking ? 'Linking...' : 'Link'}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
