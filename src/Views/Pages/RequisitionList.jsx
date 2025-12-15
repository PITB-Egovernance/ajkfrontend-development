import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

const RequisitionList = () => {
  const rows = [
    { id: 1, ref: 'R-100', title: 'Sample Requisition', status: 'Pending' },
    { id: 2, ref: 'R-101', title: 'Teaching Posts', status: 'Approved' },
  ];

  const columns = [
    { field: 'ref', headerName: 'Ref', width: 120 },
    { field: 'title', headerName: 'Title', flex: 1 },
    { field: 'status', headerName: 'Status', width: 140 },
    { field: 'actions', headerName: 'Actions', width: 140, sortable: false, renderCell: () => (<button className="px-3 py-1 bg-emerald-600 text-white rounded">View</button>) },
  ];

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold">List of Requisitions</h3>
      <p className="text-slate-500">All requisitions are shown below.</p>
      <div className="mt-4 h-72">
        <DataGrid rows={rows} columns={columns} pageSize={5} rowsPerPageOptions={[5]} disableSelectionOnClick />
      </div>
    </div>
  );
};

export default RequisitionList;
