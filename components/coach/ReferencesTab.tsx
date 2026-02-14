'use client';

import { ChevronDown, ChevronRight, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface NamingConvention {
  id?: string;
  abbr: string;
  full_name: string;
  notes?: string | null;
}

interface Resource {
  id?: string;
  name: string;
  description: string;
  url?: string | null;
  category: string;
}

interface References {
  namingConventions: {
    equipment: NamingConvention[];
    movementTypes: NamingConvention[];
    anatomicalTerms: NamingConvention[];
    movementPatterns: NamingConvention[];
  };
  resources: Resource[];
}

interface ReferencesTabProps {
  references: References | null;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onAddReference: (type: 'naming' | 'resource', category?: string) => void;
  onEditReference: (type: 'naming' | 'resource', item: NamingConvention | Resource, index: number, category?: string) => void;
  onDeleteReference: (type: 'naming' | 'resource', item: NamingConvention | Resource) => void;
  // Modal props
  showModal: boolean;
  onCloseModal: () => void;
  editingReference: (NamingConvention | Resource) & { index: number; category?: string } | null;
  referenceType: 'naming' | 'resource';
  form: {
    abbr: string;
    full: string;
    notes: string;
    name: string;
    description: string;
    url: string;
    category: string;
  };
  onFormChange: (field: string, value: string) => void;
  onSave: () => void;
}

export default function ReferencesTab({
  references,
  collapsedSections,
  onToggleSection,
  onAddReference,
  onEditReference,
  onDeleteReference,
  showModal,
  onCloseModal,
  editingReference,
  referenceType,
  form,
  onFormChange,
  onSave,
}: ReferencesTabProps) {
  if (!references) {
    return (
      <div className='bg-gray-600 rounded-lg shadow p-6'>
        <div className='text-center py-8 text-gray-500'>Loading references...</div>
      </div>
    );
  }

  return (
    <>
      <div className='bg-gray-600 rounded-lg shadow p-3 sm:p-4 md:p-6'>
        <h2 className='text-lg sm:text-xl md:text-2xl font-bold text-gray-50 mb-2 sm:mb-4'>Programming References</h2>
        <p className='text-xs sm:text-sm text-gray-100 mb-4 sm:mb-6'>Quick reference for abbreviations and resources (changes persist in session only)</p>

        <div className='space-y-3'>
          {/* Equipment */}
          <div className='border rounded-lg bg-gray-200'>
            <div className='flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-t-lg'>
              <button
                onClick={() => onToggleSection('equipment')}
                className='flex items-center gap-1 sm:gap-2 flex-1 text-gray-800'
              >
                {collapsedSections.equipment ? <ChevronRight size={18} className='sm:w-5 sm:h-5' /> : <ChevronDown size={18} className='sm:w-5 sm:h-5' />}
                <h4 className='font-semibold text-gray-800 text-sm sm:text-base'>Equipment ({references.namingConventions?.equipment?.length || 0})</h4>
              </button>
              <button
                onClick={() => onAddReference('naming', 'equipment')}
                className='p-1 text-gray-600 hover:bg-gray-200 rounded'
                aria-label='Add equipment reference'
              >
                <Plus size={16} />
              </button>
            </div>
            {!collapsedSections.equipment && (
              <div className='px-2 sm:px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4'>
                {references.namingConventions?.equipment?.sort((a, b) => a.abbr.localeCompare(b.abbr)).map((item, idx: number) => (
                  <div key={idx} className='flex items-center justify-between py-1 group hover:bg-gray-50 px-2 rounded'>
                    <span className='text-xs sm:text-sm text-gray-900'>
                      <span className='font-bold'>{item.abbr}</span> = {item.full_name}
                      {item.notes && <span className='text-gray-600 ml-1 sm:ml-2 text-[10px] sm:text-xs'>({item.notes})</span>}
                    </span>
                    <div className='flex gap-1 md:opacity-0 md:group-hover:opacity-100'>
                      <button
                        onClick={() => onEditReference('naming', item, idx, 'equipment')}
                        className='p-1 text-blue-600 hover:bg-blue-50 rounded'
                        aria-label='Edit equipment reference'
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteReference('naming', item)}
                        className='p-1 text-red-600 hover:bg-red-50 rounded'
                        aria-label='Delete equipment reference'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Movement Types */}
          <div className='border rounded-lg bg-gray-200'>
            <div className='flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-t-lg'>
              <button
                onClick={() => onToggleSection('movementTypes')}
                className='flex items-center gap-1 sm:gap-2 flex-1 text-gray-800'
              >
                {collapsedSections.movementTypes ? <ChevronRight size={18} className='sm:w-5 sm:h-5' /> : <ChevronDown size={18} className='sm:w-5 sm:h-5' />}
                <h4 className='font-semibold text-gray-800 text-sm sm:text-base'>Movement Types ({references.namingConventions?.movementTypes?.length || 0})</h4>
              </button>
              <button
                onClick={() => onAddReference('naming', 'movementTypes')}
                className='p-1 text-gray-600 hover:bg-gray-200 rounded'
                aria-label='Add movement type reference'
              >
                <Plus size={16} />
              </button>
            </div>
            {!collapsedSections.movementTypes && (
              <div className='px-2 sm:px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4'>
                {references.namingConventions?.movementTypes?.sort((a, b) => a.abbr.localeCompare(b.abbr)).map((item, idx: number) => (
                  <div key={idx} className='flex items-center justify-between py-1 group hover:bg-gray-50 px-2 rounded'>
                    <span className='text-xs sm:text-sm text-gray-900'>
                      <span className='font-bold'>{item.abbr}</span> = {item.full_name}
                    </span>
                    <div className='flex gap-1 md:opacity-0 md:group-hover:opacity-100'>
                      <button
                        onClick={() => onEditReference('naming', item, idx, 'movementTypes')}
                        className='p-1 text-blue-600 hover:bg-blue-50 rounded'
                        aria-label='Edit movement type reference'
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteReference('naming', item)}
                        className='p-1 text-red-600 hover:bg-red-50 rounded'
                        aria-label='Delete movement type reference'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anatomical Terms */}
          <div className='border rounded-lg bg-gray-200'>
            <div className='flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-t-lg'>
              <button
                onClick={() => onToggleSection('anatomicalTerms')}
                className='flex items-center gap-1 sm:gap-2 flex-1 text-gray-800'
              >
                {collapsedSections.anatomicalTerms ? <ChevronRight size={18} className='sm:w-5 sm:h-5' /> : <ChevronDown size={18} className='sm:w-5 sm:h-5' />}
                <h4 className='font-semibold text-gray-800 text-sm sm:text-base'>Anatomical Terms ({references.namingConventions?.anatomicalTerms?.length || 0})</h4>
              </button>
              <button
                onClick={() => onAddReference('naming', 'anatomicalTerms')}
                className='p-1 text-gray-600 hover:bg-gray-200 rounded'
                aria-label='Add anatomical term reference'
              >
                <Plus size={16} />
              </button>
            </div>
            {!collapsedSections.anatomicalTerms && (
              <div className='px-2 sm:px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4'>
                {references.namingConventions?.anatomicalTerms?.sort((a, b) => a.abbr.localeCompare(b.abbr)).map((item, idx: number) => (
                  <div key={idx} className='flex items-center justify-between py-1 group hover:bg-gray-50 px-2 rounded'>
                    <span className='text-xs sm:text-sm text-gray-900'>
                      <span className='font-bold'>{item.abbr}</span> = {item.full_name}
                    </span>
                    <div className='flex gap-1 md:opacity-0 md:group-hover:opacity-100'>
                      <button
                        onClick={() => onEditReference('naming', item, idx, 'anatomicalTerms')}
                        className='p-1 text-blue-600 hover:bg-blue-50 rounded'
                        aria-label='Edit anatomical term reference'
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteReference('naming', item)}
                        className='p-1 text-red-600 hover:bg-red-50 rounded'
                        aria-label='Delete anatomical term reference'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Movement Patterns */}
          <div className='border rounded-lg bg-gray-200'>
            <div className='flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-t-lg'>
              <button
                onClick={() => onToggleSection('movementPatterns')}
                className='flex items-center gap-1 sm:gap-2 flex-1 text-gray-800'
              >
                {collapsedSections.movementPatterns ? <ChevronRight size={18} className='sm:w-5 sm:h-5' /> : <ChevronDown size={18} className='sm:w-5 sm:h-5' />}
                <h4 className='font-semibold text-gray-800 text-sm sm:text-base'><span className='hidden sm:inline'>Movement Patterns & Methods</span><span className='sm:hidden'>Patterns & Methods</span> ({references.namingConventions?.movementPatterns?.length || 0})</h4>
              </button>
              <button
                onClick={() => onAddReference('naming', 'movementPatterns')}
                className='p-1 text-gray-600 hover:bg-gray-200 rounded'
                aria-label='Add movement pattern reference'
              >
                <Plus size={16} />
              </button>
            </div>
            {!collapsedSections.movementPatterns && (
              <div className='px-2 sm:px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4'>
                {references.namingConventions?.movementPatterns?.sort((a, b) => a.abbr.localeCompare(b.abbr)).map((item, idx: number) => (
                  <div key={idx} className='flex items-center justify-between py-1 group hover:bg-gray-50 px-2 rounded'>
                    <span className='text-xs sm:text-sm text-gray-900'>
                      <span className='font-bold'>{item.abbr}</span> = {item.full_name}
                    </span>
                    <div className='flex gap-1 md:opacity-0 md:group-hover:opacity-100'>
                      <button
                        onClick={() => onEditReference('naming', item, idx, 'movementPatterns')}
                        className='p-1 text-blue-600 hover:bg-blue-50 rounded'
                        aria-label='Edit movement pattern reference'
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteReference('naming', item)}
                        className='p-1 text-red-600 hover:bg-red-50 rounded'
                        aria-label='Delete movement pattern reference'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resources */}
          <div className='border rounded-lg bg-gray-200'>
            <div className='flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-t-lg'>
              <button
                onClick={() => onToggleSection('resources')}
                className='flex items-center gap-1 sm:gap-2 flex-1 text-gray-800'
              >
                {collapsedSections.resources ? <ChevronRight size={18} className='sm:w-5 sm:h-5' /> : <ChevronDown size={18} className='sm:w-5 sm:h-5' />}
                <h4 className='font-semibold text-gray-800 text-sm sm:text-base'><span className='hidden sm:inline'>Programs & Resources</span><span className='sm:hidden'>Resources</span> ({references.resources?.length || 0})</h4>
              </button>
              <button
                onClick={() => onAddReference('resource')}
                className='p-1 text-gray-600 hover:bg-gray-200 rounded'
                aria-label='Add resource'
              >
                <Plus size={16} />
              </button>
            </div>
            {!collapsedSections.resources && (
              <div className='px-2 sm:px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4'>
                {references.resources?.sort((a, b) => a.name.localeCompare(b.name)).map((resource, idx: number) => (
                  <div key={idx} className='flex items-start justify-between py-2 group hover:bg-gray-50 px-2 rounded border-b border-gray-100 last:border-0'>
                    <div className='flex-1 min-w-0'>
                      <div>
                        <span className='font-bold text-xs sm:text-sm text-gray-900'>{resource.name}</span>
                        <span className='text-[10px] sm:text-xs text-gray-600 ml-1 sm:ml-2'>({resource.category})</span>
                      </div>
                      <p className='text-[10px] sm:text-xs text-gray-700 mt-0.5 break-words'>{resource.description}</p>
                      {resource.url && (
                        <a
                          href={resource.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-600 text-[10px] sm:text-xs hover:underline inline-block mt-0.5'
                        >
                          Visit →
                        </a>
                      )}
                    </div>
                    <div className='flex gap-1 md:opacity-0 md:group-hover:opacity-100 ml-1 sm:ml-2 shrink-0'>
                      <button
                        onClick={() => onEditReference('resource', resource, idx)}
                        className='p-1 text-blue-600 hover:bg-blue-50 rounded'
                        aria-label='Edit resource'
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteReference('resource', resource)}
                        className='p-1 text-red-600 hover:bg-red-50 rounded'
                        aria-label='Delete resource'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reference Modal */}
      {showModal && (
        <FocusTrap>
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-2 sm:p-4'>
          <div className='bg-white rounded-lg w-full h-full sm:h-auto sm:max-w-md p-4 sm:p-6 shadow-2xl overflow-y-auto' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg sm:text-xl font-bold text-gray-900'>
                {editingReference ? 'Edit' : 'Add'} {referenceType === 'naming' ? 'Naming Convention' : 'Resource'}
              </h3>
              <button
                onClick={onCloseModal}
                className='p-1 hover:bg-gray-100 rounded'
                aria-label='Close'
              >
                <X size={20} />
              </button>
            </div>

            <div className='space-y-3 sm:space-y-4'>
              {referenceType === 'naming' ? (
                <>
                  <div>
                    <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>Abbreviation</label>
                    <input
                      type='text'
                      value={form.abbr}
                      onChange={(e) => onFormChange('abbr', e.target.value)}
                      className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900'
                      placeholder='e.g., BB, HPC'
                    />
                  </div>
                  <div>
                    <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>Full Name</label>
                    <input
                      type='text'
                      value={form.full}
                      onChange={(e) => onFormChange('full', e.target.value)}
                      className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900'
                      placeholder='e.g., Barbell, Hang Power Clean'
                    />
                  </div>
                  <div>
                    <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>Notes (optional)</label>
                    <input
                      type='text'
                      value={form.notes}
                      onChange={(e) => onFormChange('notes', e.target.value)}
                      className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900'
                      placeholder='Additional context'
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>Name</label>
                    <input
                      type='text'
                      value={form.name}
                      onChange={(e) => onFormChange('name', e.target.value)}
                      className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900'
                      placeholder='e.g., GoWOD'
                    />
                  </div>
                  <div>
                    <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>Description</label>
                    <input
                      type='text'
                      value={form.description}
                      onChange={(e) => onFormChange('description', e.target.value)}
                      className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900'
                      placeholder='Brief description'
                    />
                  </div>
                  <div>
                    <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>URL (optional)</label>
                    <input
                      type='text'
                      value={form.url}
                      onChange={(e) => onFormChange('url', e.target.value)}
                      className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900'
                      placeholder='https://...'
                    />
                  </div>
                  <div>
                    <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>Category</label>
                    <input
                      type='text'
                      value={form.category}
                      onChange={(e) => onFormChange('category', e.target.value)}
                      className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900'
                      placeholder='e.g., Mobility, Olympic Lifting'
                    />
                  </div>
                </>
              )}

              <div className='flex gap-2 sm:gap-3 mt-4 sm:mt-6'>
                <button
                  onClick={onSave}
                  className='flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-600 text-white text-sm sm:text-base rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-1 sm:gap-2'
                >
                  <Save size={16} className='sm:w-[18px] sm:h-[18px]' />
                  {editingReference ? 'Update' : 'Add'}
                </button>
                <button
                  onClick={onCloseModal}
                  className='px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-700 text-sm sm:text-base rounded-lg hover:bg-gray-300 transition'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}
    </>
  );
}
