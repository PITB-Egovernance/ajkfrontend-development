/**
 * Shared MUI DataGrid styles and configuration constants.
 *
 * Usage:
 *   import { GRID_SX, GRID_INITIAL_STATE, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';
 */

/** Common DataGrid sx prop — removes borders, adds subtle header, emerald selection highlight. */
export const GRID_SX = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders':     { backgroundColor: '#f8fafc' },
  '& .MuiDataGrid-columnHeaderTitle':  { fontWeight: 'bold' },
  '& .MuiDataGrid-row':                { minHeight: '52px !important' },
  '& .MuiDataGrid-row.Mui-selected':  { backgroundColor: '#ecfdf5' },
  '& .MuiDataGrid-row.Mui-selected:hover': { backgroundColor: '#d1fae5' },
};

/** Default initial pagination state (page 1, 15 rows per page). */
export const GRID_INITIAL_STATE = {
  pagination: { paginationModel: { pageSize: 15, page: 0 } },
};

/** Page-size options shown in the DataGrid footer. */
export const GRID_PAGE_SIZE_OPTIONS = [15, 25, 50, 100];
