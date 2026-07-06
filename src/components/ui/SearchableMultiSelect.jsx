import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from 'utils';
import { Check, ChevronDown, Search, X } from 'lucide-react';

// Searchable multi-select — portal-based, never clipped by overflow:hidden or tables.
// Trigger uses .ss-trigger (absolute-pixel CSS class) for pixel-exact height matching.
// onChange(newValueArray) is called with the full new selection array.

const SearchableMultiSelect = ({
  label,
  error,
  hint,
  required,
  options = [],
  placeholder = 'Select options',
  className,
  value = [],
  onChange,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, bottom: 0, left: 0, width: 0 });

  const listboxId = useId();
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const panelRef = useRef(null);

  const selected = useMemo(() => (Array.isArray(value) ? value.map(String) : []), [value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => String(o.label).toLowerCase().includes(term));
  }, [options, search]);

  const close = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      close();
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open, close]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    if (open) { close(); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 300 && rect.top > spaceBelow);
      setDropdownPos({ top: rect.bottom + 4, bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
  };

  const toggleOption = (val) => {
    const strVal = String(val);
    const next = selected.includes(strVal) ? selected.filter((v) => v !== strVal) : [...selected, strVal];
    onChange?.(next);
  };

  const toggleAll = () => {
    const allVals = filtered.map((o) => String(o.value));
    const allOn = allVals.every((v) => selected.includes(v));
    if (allOn) {
      onChange?.(selected.filter((v) => !allVals.includes(v)));
    } else {
      onChange?.([...new Set([...selected, ...allVals])]);
    }
  };

  const clearAll = () => onChange?.([]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.includes(String(o.value)));
  const someFilteredSelected = filtered.some((o) => selected.includes(String(o.value)));

  const triggerLabel = useMemo(() => {
    if (selected.length === 0) return null;
    if (selected.length === 1) {
      const opt = options.find((o) => String(o.value) === selected[0]);
      return opt?.label ?? selected[0];
    }
    return `${selected.length} selected`;
  }, [selected, options]);

  const panel = open && (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        left: dropdownPos.left,
        width: dropdownPos.width,
        ...(openUp ? { bottom: dropdownPos.bottom } : { top: dropdownPos.top }),
      }}
      className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
    >
      {/* Search */}
      <div style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={12}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
            placeholder="Search..."
            className="ss-search"
          />
        </div>
      </div>

      {/* Select All row */}
      {filtered.length > 0 && (
        <div
          onClick={toggleAll}
          style={{
            padding: '7px 12px',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid #f1f5f9',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <div style={{
            width: 15,
            height: 15,
            borderRadius: 3,
            border: `1.5px solid ${allFilteredSelected ? '#059669' : someFilteredSelected ? '#34d399' : '#d1d5db'}`,
            backgroundColor: allFilteredSelected ? '#059669' : someFilteredSelected ? '#ecfdf5' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.1s',
          }}>
            {allFilteredSelected && <Check size={9} style={{ color: '#fff' }} />}
            {someFilteredSelected && !allFilteredSelected && (
              <div style={{ width: 7, height: 1.5, backgroundColor: '#059669', borderRadius: 1 }} />
            )}
          </div>
          <span style={{ color: '#374151', fontWeight: 500, fontSize: 13 }}>
            {allFilteredSelected ? 'Deselect All' : 'Select All'}
          </span>
        </div>
      )}

      {/* Options */}
      <ul id={listboxId} role="listbox" aria-multiselectable="true" style={{ maxHeight: 208, overflowY: 'auto', padding: '4px 0' }}>
        {filtered.length === 0 ? (
          <li style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>No results found</li>
        ) : (
          filtered.map((option) => {
            const isSelected = selected.includes(String(option.value));
            return (
              <li key={option.value}>
                <div
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleOption(option.value)}
                  style={{
                    padding: '7px 12px',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: isSelected ? '#ecfdf5' : 'transparent',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? '#ecfdf5' : 'transparent'; }}
                >
                  <div style={{
                    width: 15,
                    height: 15,
                    borderRadius: 3,
                    border: `1.5px solid ${isSelected ? '#059669' : '#d1d5db'}`,
                    backgroundColor: isSelected ? '#059669' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.1s',
                  }}>
                    {isSelected && <Check size={9} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isSelected ? '#065f46' : '#374151',
                    fontWeight: isSelected ? 500 : 400,
                  }}>
                    {option.label}
                  </span>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Clear All */}
      {selected.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: 6 }}>
          <button
            type="button"
            onClick={clearAll}
            style={{ width: '100%', padding: '5px 12px', fontSize: 11, color: '#dc2626', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Clear All ({selected.length})
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <div ref={containerRef} style={{ position: 'relative' }}>
        <button
          type="button"
          ref={triggerRef}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-multiselectable="true"
          disabled={disabled}
          onClick={toggle}
          className={cn('ss-trigger', error && 'ss-err', className)}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 6, color: triggerLabel ? undefined : '#6c757d' }}>
            {triggerLabel ?? placeholder}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {selected.length > 0 && (
              <span
                onClick={(e) => { e.stopPropagation(); clearAll(); }}
                role="button"
                aria-label="Clear selection"
                style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: '#e2e8f0', cursor: 'pointer', color: '#64748b' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={9} />
              </span>
            )}
            <ChevronDown
              size={13}
              style={{ color: '#9ca3af', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </div>
        </button>
      </div>

      {typeof document !== 'undefined' && createPortal(panel, document.body)}

      {error && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{hint}</p>}
    </div>
  );
};

SearchableMultiSelect.displayName = 'SearchableMultiSelect';
export default SearchableMultiSelect;
