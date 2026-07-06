import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from 'utils';
import { Check, ChevronDown, Search } from 'lucide-react';

// Searchable dropdown — the single standardized select for the whole portal.
//
// Trigger uses .ss-trigger (absolute-pixel CSS class) so it renders at the same
// height as .form-control / MUI TextField size="small" regardless of the root
// 0.7 rem scale set in index.css.
//
// Dropdown panel is rendered via createPortal to document.body with
// position:fixed so it always escapes overflow:hidden / table clipping.

function flattenOptions(options, groups) {
  if (groups) return groups.flatMap((g) => g.options.map((o) => ({ ...o, group: g.label })));
  return options;
}

const SearchableSelect = forwardRef(({
  label,
  error,
  hint,
  required,
  options = [],
  groups,
  placeholder = 'Select an option',
  className,
  ...props
}, ref) => {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [selected, setSelected] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, bottom: 0, left: 0, width: 0 });

  const listboxId = useId();
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const selectRef = useRef(null);
  const panelRef = useRef(null);

  const setRefs = useCallback((el) => {
    selectRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }, [ref]);

  const flatOptions = useMemo(() => flattenOptions(options, groups), [options, groups]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return flatOptions;
    return flatOptions.filter((o) => String(o.label).toLowerCase().includes(term));
  }, [flatOptions, search]);

  const selectedOption = flatOptions.find((o) => String(o.value) === selected);

  // Keep the visible value in sync with the hidden select. Runs after every
  // render on purpose: it picks up programmatic writes the component cannot
  // observe otherwise (react-hook-form reset/setValue, defaultValue).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const value = selectRef.current?.value ?? '';
    if (value !== selected) setSelected(value);
  });

  const close = useCallback(() => {
    setOpen(false);
    setSearch('');
    setHighlighted(0);
  }, []);

  // Close when clicking outside (both the trigger container and the portal panel)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      const inContainer = containerRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inContainer && !inPanel) close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  // Close when the page scrolls (position:fixed panel would drift otherwise).
  // Ignore scroll events that originate inside the panel itself (list scrolling).
  useEffect(() => {
    if (!open) return;
    const handleScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      close();
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open, close]);

  // Focus the search box as soon as the panel opens
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Keep the highlighted row visible while navigating with the keyboard
  useEffect(() => {
    if (!open) return;
    const row = listRef.current?.querySelector(`[data-index="${highlighted}"]`);
    row?.scrollIntoView?.({ block: 'nearest' });
  }, [highlighted, open]);

  const toggle = () => {
    if (props.disabled) return;
    if (open) { close(); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const upward = spaceBelow < 300 && rect.top > spaceBelow;
      setOpenUp(upward);
      setDropdownPos({
        top: rect.bottom + 4,
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    const index = filtered.findIndex((o) => String(o.value) === selected);
    setHighlighted(index >= 0 ? index : 0);
    setOpen(true);
  };

  // Write the value to the hidden select and emit a genuine 'change' event so
  // React/react-hook-form onChange handlers fire exactly as they used to.
  const pick = (value) => {
    const el = selectRef.current;
    if (el && String(el.value) !== String(value)) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setSelected(String(value));
    close();
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (e) => {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      if (!open) toggle();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) pick(filtered[highlighted].value);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      close();
      if (e.key === 'Escape') triggerRef.current?.focus();
    }
  };

  let lastGroup = null;

  const panel = open && (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        left: dropdownPos.left,
        width: dropdownPos.width,
        ...(openUp
          ? { bottom: dropdownPos.bottom }
          : { top: dropdownPos.top }),
      }}
      className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
    >
      <div className={cn('p-2 border-slate-100', openUp ? 'order-last border-t' : 'border-b')}>
        <div style={{ position: 'relative' }}>
          <Search
            size={12}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setHighlighted(0); }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
            className="ss-search"
          />
        </div>
      </div>

      <ul ref={listRef} id={listboxId} role="listbox" style={{ maxHeight: 208, overflowY: 'auto', padding: '4px 0' }}>
        {filtered.length === 0 ? (
          <li style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>No results found</li>
        ) : (
          filtered.map((option, index) => {
            const groupHeader = option.group && option.group !== lastGroup ? option.group : null;
            lastGroup = option.group ?? lastGroup;
            const isSelected = String(option.value) === selected;
            return (
              <li key={`${option.value}-${index}`}>
                {groupHeader && (
                  <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                    {groupHeader}
                  </div>
                )}
                <div
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onClick={() => pick(option.value)}
                  onMouseEnter={() => setHighlighted(index)}
                  style={{
                    padding: '7px 12px',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    backgroundColor: isSelected ? '#ecfdf5' : index === highlighted ? '#f8fafc' : 'transparent',
                    color: isSelected ? '#065f46' : index === highlighted ? '#1e293b' : '#374151',
                    fontWeight: isSelected ? 500 : 400,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</span>
                  {isSelected && <Check size={13} style={{ color: '#059669', flexShrink: 0 }} />}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {selected && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: 6 }}>
          <button
            type="button"
            onClick={() => pick('')}
            style={{ width: '100%', padding: '5px 12px', fontSize: 11, color: '#dc2626', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <div ref={containerRef} style={{ position: 'relative' }}>
        {/* Hidden native select — value holder for forms */}
        <select
          ref={setRefs}
          tabIndex={-1}
          aria-hidden="true"
          onFocus={() => triggerRef.current?.focus()}
          style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
          {...props}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {groups ? groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          )) : options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Visible trigger — uses .ss-trigger for pixel-exact sizing */}
        <button
          type="button"
          ref={triggerRef}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          disabled={props.disabled}
          onClick={toggle}
          onKeyDown={handleTriggerKeyDown}
          className={cn('ss-trigger', error && 'ss-err', className)}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: selectedOption ? undefined : '#6c757d' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={13}
            style={{ marginLeft: 6, flexShrink: 0, color: '#9ca3af', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
      </div>

      {/* Portal: renders outside the DOM tree so tables / overflow:hidden never clip it */}
      {typeof document !== 'undefined' && createPortal(panel, document.body)}

      {error && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{hint}</p>}
    </div>
  );
});

SearchableSelect.displayName = 'SearchableSelect';
export default SearchableSelect;
