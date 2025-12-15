import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import { DataGrid } from '@mui/x-data-grid';

export default function DispatrchSent() {
  const rows = [
    { id: 1, ref: 'S-101', to: 'Officer X', subject: 'Appointment', date: '2025-11-12' },
    { id: 2, ref: 'S-102', to: 'Officer Y', subject: 'Memo', date: '2025-11-20' },
  ];

  const columns = [
    { field: 'ref', headerName: 'ID', width: 110 },
    { field: 'to', headerName: 'To', flex: 1 },
    { field: 'subject', headerName: 'Subject', flex: 1 },
    { field: 'date', headerName: 'Sent', width: 140 },
    { field: 'actions', headerName: 'Actions', width: 180, sortable: false, renderCell: () => (
      <div className="flex gap-2">
        <Button variant="outline" size="sm">View</Button>
        <Button variant="secondary" size="sm">Resend</Button>
      </div>
    ) },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Dispatch Sent</h2>
        <div className="flex items-center gap-3">
          <Link to="/dispatch/received">
            <Button variant="outline">View Received</Button>
          </Link>
          <Button variant="primary">Create Dispatch</Button>
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
