import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import StatusBadge from './StatusBadge';
import { RotateCw, UserX, AlertCircle, ShieldCheck } from 'lucide-react';
import Button from 'components/ui/Button';
import { DataGridLoader } from 'components/ui/Loader';

const MeritListTable = ({ rows, loading, onRotate, onStatusChange, isAdmin }) => {
  const columns = [
    { 
      field: 'merit_rank', 
      headerName: 'Rank', 
      width: 70, 
      renderCell: (params) => (
        <span className="font-black text-slate-900">#{params.value}</span>
      )
    },
    { 
      field: 'roll_number', 
      headerName: 'Roll No', 
      width: 100,
      renderCell: (params) => <span className="font-bold text-slate-600">{params.value}</span>
    },
    { 
      field: 'candidate_name', 
      headerName: 'Candidate Name', 
      flex: 1,
      renderCell: (params) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 leading-tight">{params.value}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{params.row.cnic}</span>
        </div>
      )
    },
    { field: 'academic_total', headerName: 'Part-A', width: 80 },
    { field: 'interview_total', headerName: 'Part-B', width: 80 },
    { 
      field: 'grand_total', 
      headerName: 'Total', 
      width: 80,
      renderCell: (params) => <span className="font-black text-indigo-600">{params.value}</span>
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 180, 
      renderCell: (params) => (
        <div className="flex flex-col gap-1 py-2">
          <StatusBadge status={params.value} />
          {params.row.replaced_by_roll_no && (
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter italic">
              Replaced by: {params.row.replaced_by_roll_no}
            </span>
          )}
        </div>
      )
    },
    {
      field: 'actions',
      headerName: 'Management',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        if (!isAdmin) return null;
        
        const status = params.row.status?.toLowerCase();
        const isVacated = ['declined', 'absent', 'disqualified'].includes(status);
        const hasBeenReplaced = !!params.row.replaced_by_roll_no;
        
        // Only allow status change if not already vacated or if it's a normal status
        const canChangeStatus = !isVacated && ['selected', 'provisional', 'replacement', 'pending'].includes(status);

        return (
          <div className="flex items-center gap-2">
            {canChangeStatus && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStatusChange(params.row)}
                className="text-slate-400 hover:text-rose-500 h-9 w-9 p-0 rounded-xl hover:bg-rose-50"
                title="Change Status (Mark Vacant)"
              >
                <UserX size={18} />
              </Button>
            )}
            
            {isVacated && !hasBeenReplaced && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRotate(params.row)}
                className="text-indigo-500 hover:bg-indigo-50 h-9 w-9 p-0 rounded-xl"
                title="Promote Next Candidate"
              >
                <RotateCw size={18} className="animate-spin-slow" />
              </Button>
            )}

            {hasBeenReplaced && (
              <div title={`Replaced on ${new Date(params.row.replaced_on).toLocaleDateString()}`} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                <ShieldCheck size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Archived</span>
              </div>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        initialState={{
          pagination: { paginationModel: { pageSize: 50 } },
        }}
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: '900',
            textTransform: 'uppercase',
            fontSize: '9px',
            letterSpacing: '0.1em',
            color: '#64748b'
          },
          '& .MuiDataGrid-cell': {
            borderColor: '#f1f5f9',
            fontSize: '12px',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f8fafc',
          },
        }}
        slots={{
          loadingOverlay: DataGridLoader
        }}
      />
    </div>
  );
};

export default MeritListTable;
