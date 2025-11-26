'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select...',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle selection
  const toggleSelection = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
    setSearchTerm('');
  };

  // Display text
  const displayText =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
      ? selectedValues[0]
      : `${selectedValues.length} selected`;

  return (
    <div className='relative' ref={dropdownRef}>
      {/* Label with count badge */}
      <label className='block text-sm font-medium text-gray-700 mb-1'>
        {label}
        {selectedValues.length > 0 && (
          <span className='ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold'>
            {selectedValues.length}
          </span>
        )}
      </label>

      {/* Dropdown button */}
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent flex items-center justify-between'
      >
        <span className={`truncate ${selectedValues.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
          {displayText}
        </span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className='absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg'>
          {/* Search input */}
          <div className='p-2 border-b border-gray-200'>
            <div className='relative'>
              <Search size={16} className='absolute left-2 top-2.5 text-gray-400' />
              <input
                ref={searchInputRef}
                type='text'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className='w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
              />
            </div>
          </div>

          {/* Checkbox list */}
          <div className='max-h-64 overflow-y-auto p-2'>
            {filteredOptions.length === 0 ? (
              <div className='text-sm text-gray-500 text-center py-4'>No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option}
                  className='flex items-center px-2 py-2 hover:bg-gray-100 rounded cursor-pointer'
                >
                  <input
                    type='checkbox'
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleSelection(option)}
                    className='w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500'
                  />
                  <span className='ml-2 text-sm text-gray-900'>{option}</span>
                </label>
              ))
            )}
          </div>

          {/* Footer with Clear All button */}
          {selectedValues.length > 0 && (
            <div className='p-2 border-t border-gray-200'>
              <button
                type='button'
                onClick={clearAll}
                className='w-full px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition flex items-center justify-center gap-1'
              >
                <X size={14} />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
