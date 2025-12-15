import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

const PscTable = () => {
  const rows = [
    { id: 1, stat: 'Total Requisitions', value: 123 },
    { id: 2, stat: 'Approved', value: 45 },
    { id: 3, stat: 'Pending', value: 78 },
  ];

  const columns = [
    { field: 'stat', headerName: 'Metric', flex: 1 },
    { field: 'value', headerName: 'Value', width: 140 },
  ];

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold">PSC Table</h3>
      <p className="text-slate-500">Administrative table and quick stats.</p>
      <div className="mt-4 h-56">
        <DataGrid rows={rows} columns={columns} pageSize={5} rowsPerPageOptions={[5]} hideFooter />
      </div>
    </div>
  );
};

export default PscTable;
