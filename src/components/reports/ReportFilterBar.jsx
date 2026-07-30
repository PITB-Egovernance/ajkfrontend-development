import React from 'react';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import Button from 'components/ui/Button';
import { Search as SearchIcon, RotateCcw } from 'lucide-react';
import ExportButtons from './ExportButtons';

// Reusable filter panel for report pages: wraps the shared AdvancedFilter with
// a standardized Search / Reset / Export action row.
const ReportFilterBar = ({
  filters,
  onFilterChange,
  onClearFilters,
  filterConfig,
  title = 'Filters',
  onSearch,
  searching = false,
  showPdfExport = false,
  onExportExcel,
  onExportPdf,
}) => {
  return (
    <div className="space-y-3 mb-6">
      <AdvancedFilter
        filters={filters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        filterConfig={filterConfig}
        title={title}
      />

      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" className="gap-1.5" disabled={searching} onClick={onSearch}>
            <SearchIcon size={15} /> {searching ? 'Searching…' : 'Search'}
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onClearFilters}>
            <RotateCcw size={15} /> Reset
          </Button>
        </div>
        <ExportButtons showPdf={showPdfExport} onExportExcel={onExportExcel} onExportPdf={onExportPdf} />
      </div>
    </div>
  );
};

export default ReportFilterBar;
