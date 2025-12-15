import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import { DataGrid } from '@mui/x-data-grid';

export default function DispatchRecieved() {
  const rows = [
    { id: 1, ref: 'D-001', from: 'Department A', subject: 'Request Documents', date: '2025-12-01' },
    { id: 2, ref: 'D-002', from: 'Department B', subject: 'Official Notice', date: '2025-12-05' },
  ];

  const columns = [
    { field: 'ref', headerName: 'ID', width: 110 },
    { field: 'from', headerName: 'From', flex: 1 },
    { field: 'subject', headerName: 'Subject', flex: 1 },
    { field: 'date', headerName: 'Received', width: 140 },
    { field: 'actions', headerName: 'Actions', width: 180, sortable: false, renderCell: () => (
      <div className="flex gap-2">
        <Button variant="outline" size="sm">Open</Button>
        <Button variant="secondary" size="sm">Download</Button>
      </div>
    ) },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Dispatch Received</h2>
        <div className="flex items-center gap-3">
          <Link to="/dispatch/sent">
            <Button variant="outline">View Sent</Button>
          </Link>
          <Button variant="primary">New Dispatch</Button>
        </div>
      </div>

      <Card>
        <div className="h-72">
          <DataGrid rows={rows} columns={columns} pageSize={5} rowsPerPageOptions={[5]} disableSelectionOnClick />
        </div>
      </Card>
    </div>
  );
}
