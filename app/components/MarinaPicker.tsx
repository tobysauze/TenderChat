'use client';

// Searchable marina picker — typeahead combobox over the full MARINAS list.
// Used everywhere a user picks a marina (directory, marina chat, profile setup,
// settings, and the deck filter sheet) so the list of ~140 ports is usable.

import { useEffect, useRef, useState } from 'react';
import { MARINAS } from '../../lib/yachting';

interface MarinaPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show an "Any marina" / clear row at the top of the dropdown. */
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  id?: string;
}

const MAX_RESULTS = 30;

export default function MarinaPicker({
  value,
  onChange,
  placeholder = 'Search marinas…',
  allowEmpty = false,
  emptyLabel = 'Any marina',
  className = '',
  id,
}: MarinaPickerProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync the displayed text whenever the parent's value changes externally.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on click/tap outside; restore the current value if no selection was made.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open, value]);

  // Filter — case-insensitive substring match. With no query, show the whole list.
  const q = query.trim().toLowerCase();
  const matches = q
    ? MARINAS.filter(m => m.toLowerCase().includes(q)).slice(0, MAX_RESULTS)
    : MARINAS.slice(0, MAX_RESULTS);

  const select = (m: string) => {
    onChange(m);
    setQuery(m);
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    onChange('');
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {allowEmpty && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={clear}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-500 border-b"
            >
              {emptyLabel}
            </button>
          )}
          {matches.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500 text-center">No marinas match &ldquo;{query}&rdquo;</p>
          ) : (
            matches.map(m => (
              <button
                key={m}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => select(m)}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                  m === value
                    ? 'bg-[var(--tender-blue)]/10 font-semibold text-[var(--tender-navy)]'
                    : 'text-[var(--tender-navy)]'
                }`}
              >
                {m}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
