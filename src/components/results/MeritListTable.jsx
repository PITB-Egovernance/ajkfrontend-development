import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import StatusBadge from './StatusBadge';
import { RotateCw, AlertTriangle, TrendingUp } from 'lucide-react';
import Button from 'components/ui/Button';
import { DataGridLoader } from 'components/ui/Loader';

/**
 * MeritListTable Component
 * Specialized DataGrid for displaying ranked candidates with rotation actions
 */

const MeritListTable = ({ rows, loading, onRotate, isAdmin }) => {
  const columns = [
    { 
      field: 'merit_rank', 
      headerName: 'Rank', 
      width: 80, 
      headerClassName: 'bg-slate-50 font-black',
      renderCell: (params) => (
        <span className="font-black text-slate-900">#{params.value}</span>
      )
    },
    { 
      field: 'roll_number', 
      headerName: 'Roll No', 
      width: 110, 
      headerClassName: 'bg-slate-50 font-black' 
    },
    { 
      field: 'candidate_name', 
      headerName: 'Candidate Name', 
      flex: 1, 
      headerClassName: 'bg-slate-50 font-black',
      renderCell: (params) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">{params.value}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{params.row.cnic}</span>
        </div>
      )
    },
    { 
      field: 'academic_total', 
      headerName: 'Part-A', 
      width: 100, 
      headerClassName: 'bg-slate-50 font-black' 
    },
    { 
      field: 'interview_total', 
      headerName: 'Part-B', 
      width: 100, 
      headerClassName: 'bg-slate-50 font-black' 
    },
    { 
      field: 'grand_total', 
      headerName: 'Total', 
      width: 100, 
      headerClassName: 'bg-slate-50 font-black',
      renderCell: (params) => (
        <span className="font-black text-emerald-600">{params.value}</span>
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130, 
      headerClassName: 'bg-slate-50 font-black',
      renderCell: (params) => <StatusBadge status={params.value} />
    },
    {
      field: 'actions',
      headerName: 'Rotate',
      width: 100,
      sortable: false,
      headerClassName: 'bg-slate-50 font-black',
      renderCell: (params) => {
        const isRecommended = params.row.status?.toLowerCase() === 'selected' || params.row.status?.toLowerCase() === 'recommended';
        if (!isRecommended || !isAdmin) return null;

        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRotate(params.row)}
            className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0 rounded-full"
            title="Rotate Merit (Replacement)"
          >
            <RotateCw size={16} />
          </Button>
        );
      }
    }
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        pageSizeOptions={[25, 50, 100]}
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: '900 !important',
            textTransform: 'uppercase',
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: '#64748b'
          },
          '& .MuiDataGrid-cell': {
            borderColor: '#f1f5f9',
            fontSize: '13px',
            fontWeight: '500'
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f8fafc',
          },
          '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: '#f0fdf4 !important',
          }
        }}
        slots={{
          loadingOverlay: DataGridLoader,
          noRowsOverlay: () => (
            <div className="flex flex-col items-center justify-center h-[300px] gap-4 text-slate-400">
              <TrendingUp size={48} strokeWidth={1} />
              <p className="text-sm font-black uppercase tracking-[0.2em]">Merit list is currently empty or pending computation</p>
            </div>
          )
        }}
      />
    </div>
  );
};

export default MeritListTable;
