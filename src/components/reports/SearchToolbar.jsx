import React from 'react';
import { Search, X } from 'lucide-react';

// Reusable quick-search input used inside report tables.
const SearchToolbar = ({ value, onChange, placeholder = 'Search records...', className = '' }) => (
  <div className={`relative w-full sm:w-72 ${className}`}>
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        aria-label="Clear search"
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export default SearchToolbar;
