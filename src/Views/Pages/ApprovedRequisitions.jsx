import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

const ApprovedRequisitions = () => {
  const rows = [
    { id: 1, ref: 'R-101', title: 'Teaching Posts', approved_on: '2025-10-01' },
  ];

  const columns = [
    { field: 'ref', headerName: 'Ref', width: 120 },
    { field: 'title', headerName: 'Title', flex: 1 },
    { field: 'approved_on', headerName: 'Approved On', width: 140 },
  ];

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold">Approved Requisitions</h3>
      <p className="text-slate-500">Approved requisitions list.</p>
      <div className="mt-4 h-56">
        <DataGrid rows={rows} columns={columns} pageSize={5} rowsPerPageOptions={[5]} disableSelectionOnClick />
      </div>
    </div>
  );
};

export default ApprovedRequisitions;
