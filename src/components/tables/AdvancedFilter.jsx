import React from 'react';
import {
  TextField,
  Button,
  Chip
} from '@mui/material';
import SearchableSelect from 'components/ui/SearchableSelect';
import {
  Filter,
  X
} from 'lucide-react';

const AdvancedFilter = ({
  filters,
  onFilterChange,
  onClearFilters,
  filterConfig,
  title = "Advanced Filters",
  extraFilters
}) => {
  const handleFilterChange = (name, value) => {
    onFilterChange({ target: { name, value } });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== undefined && value !== null
  );

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {hasActiveFilters && (
          <Button
            size="small"
            onClick={onClearFilters}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-800"
            startIcon={<X size={14} />}
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {extraFilters && extraFilters}
        {filterConfig.map((config) => {
          switch (config.type) {
            case 'text':
              return (
                <TextField
                  key={config.name}
                  label={config.label}
                  variant="outlined"
                  size="small"
                  name={config.name}
                  value={filters[config.name] || ''}
                  onChange={(e) => handleFilterChange(config.name, e.target.value)}
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
                  value={filters[config.name] || ''}
                  onChange={(e) => handleFilterChange(config.name, e.target.value)}
                  options={config.options || []}
                  placeholder={`All ${config.label}`}
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
                  value={filters[config.name] || ''}
                  onChange={(e) => handleFilterChange(config.name, e.target.value)}
                  fullWidth
                />
              );

            default:
              return null;
          }
        })}
      </div>

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
                onDelete={() => handleFilterChange(config.name, '')}
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