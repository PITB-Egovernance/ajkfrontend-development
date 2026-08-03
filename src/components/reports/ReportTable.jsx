import React from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { GRID_SX, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';
import SearchToolbar from './SearchToolbar';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

// Reusable report data table: wraps the shared MUI-backed TooltipDataGrid
// (sorting + pagination built in) with a quick-search toolbar plus standard
// loading / empty states.
const ReportTable = ({
  rows,
  columns,
  getRowId = (r) => r.id,
  loading = false,
  searchTerm,
  onSearchTermChange,
  searchPlaceholder = 'Search records...',
  paginationModel,
  onPaginationModelChange,
  pageSizeOptions = GRID_PAGE_SIZE_OPTIONS,
  emptyTitle,
  emptyDescription,
  resultsLabel = 'records',
  getRowClassName,
  rowSx,
}) => {
  const showInitialSkeleton = loading && rows.length === 0;
  const showEmpty = !loading && rows.length === 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-100">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{rows.length}</span> {resultsLabel} found
        </p>
        {onSearchTermChange && (
          <SearchToolbar value={searchTerm} onChange={onSearchTermChange} placeholder={searchPlaceholder} />
        )}
      </div>

      <div className="p-2">
        {showInitialSkeleton ? (
          <LoadingSkeleton rows={6} />
        ) : showEmpty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <TooltipDataGrid
            rows={rows}
            columns={columns}
            getRowId={getRowId}
            paginationModel={paginationModel}
            onPaginationModelChange={onPaginationModelChange}
            pageSizeOptions={pageSizeOptions}
            autoHeight
            disableRowSelectionOnClick
            loading={loading}
            getRowClassName={getRowClassName}
            sx={rowSx ? { ...GRID_SX, ...rowSx } : GRID_SX}
          />
        )}
      </div>
    </div>
  );
};

export default ReportTable;
