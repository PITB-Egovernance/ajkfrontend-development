import React, { useEffect, useState } from 'react';
import {
  TextField,
  Button as MuiButton,
  Chip
} from '@mui/material';
import SearchableSelect from 'components/ui/SearchableSelect';
import Button from 'components/ui/Button';
import {
  Filter,
  Search as SearchIcon,
  RotateCcw,
  X
} from 'lucide-react';

const AdvancedFilter = ({
  filters,
  onFilterChange,
  onClearFilters,
  filterConfig,
  title = "Advanced Filters",
  extraFilters,
  // When true (default), typing/selecting a filter only updates a local draft —
  // nothing is applied (and no API call/re-filter happens in the parent) until
  // the Search button is clicked. Reset clears the draft and the applied filters.
  // Pass deferApply={false} to restore the old instant-apply-on-change behavior
  // (used by ReportFilterBar, which already implements its own Search/Reset row).
  deferApply = true,
  searching = false,
  searchLabel = 'Search',
  searchingLabel,
  showResetButton = true,
}) => {
  const [draft, setDraft] = useState(filters);

  // Keep the draft in sync whenever the parent's applied filters change —
  // covers Search (draft === filters already), Reset, and any external reset.
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const handleFilterChange = (name, value) => {
    if (deferApply) {
      setDraft((prev) => ({ ...prev, [name]: value }));
    } else {
      onFilterChange({ target: { name, value } });
    }
  };

  const handleSearchClick = () => {
    Object.entries(draft).forEach(([name, value]) => {
      onFilterChange({ target: { name, value } });
    });
  };

  const handleResetClick = () => {
    onClearFilters();
  };

  // Chips/"active filters" always reflect the parent's applied filters, not the draft.
  const hasActiveFilters = Object.values(filters).some(value =>
    value !== '' && value !== undefined && value !== null
  );

  const fieldValue = (name) => (deferApply ? draft[name] : filters[name]) || '';

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {!deferApply && hasActiveFilters && (
          <MuiButton
            size="small"
            onClick={onClearFilters}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-800"
            startIcon={<X size={14} />}
          >
            Clear All
          </MuiButton>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {extraFilters && extraFilters}
        {filterConfig.map((config) => {
          switch (config.type) {
            // Full-width label — no input, no filter key. Used to visually
            // separate a group of filters that depend on each other (e.g.
            // Advertisement -> Department -> Post, where picking one narrows
            // the next) from the independent filters around them.
            case 'section':
              return (
                <p
                  key={config.name}
                  className="col-span-full text-xs font-semibold uppercase tracking-wide text-slate-400 mt-1 first:mt-0"
                >
                  {config.label}
                </p>
              );

            case 'text':
              return (
                <TextField
                  key={config.name}
                  label={config.label}
                  variant="outlined"
                  size="small"
                  name={config.name}
                  value={fieldValue(config.name)}
                  onChange={(e) => handleFilterChange(config.name, e.target.value)}
                  onKeyDown={(e) => {
                    if (deferApply && e.key === 'Enter') handleSearchClick();
                  }}
                  placeholder={config.placeholder}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              );

            case 'select':
              return (
                <SearchableSelect
                  key={config.name}
                  label={config.label}
                  name={config.name}
                  value={fieldValue(config.name)}
                  onChange={(e) => handleFilterChange(config.name, e.target.value)}
                  options={config.options || []}
                  placeholder={config.label}
                />
              );

            case 'date':
              return (
                <TextField
                  key={config.name}
                  type="date"
                  label={config.label}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  size="small"
                  name={config.name}
                  value={fieldValue(config.name)}
                  onChange={(e) => handleFilterChange(config.name, e.target.value)}
                  fullWidth
                />
              );

            default:
              return null;
          }
        })}
      </div>

      {deferApply && (
        <div className="flex items-center justify-end gap-2">
          {showResetButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetClick}
              className="gap-1.5"
            >
              <RotateCcw size={15} /> Reset
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={searching}
            onClick={handleSearchClick}
            className="gap-1.5"
          >
            <SearchIcon size={15} /> {searching ? (searchingLabel || `${searchLabel}…`) : searchLabel}
          </Button>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Active filters:</span>
          {filterConfig.map((config) => {
            const value = filters[config.name];
            if (!value) return null;

            let displayValue = value;
            if (config.type === 'select') {
              const selectedOption = config.options?.find(opt => opt.value === value);
              displayValue = selectedOption?.label || value;
            }

            return (
              <Chip
                key={config.name}
                label={`${config.label}: ${displayValue}`}
                size="small"
                onDelete={() => onFilterChange({ target: { name: config.name, value: '' } })}
                className="text-xs"
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;
