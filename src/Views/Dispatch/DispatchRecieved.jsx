import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';

export default function DispatchRecieved() {
  const sample = [
    { id: 'D-001', from: 'Department A', subject: 'Request Documents', date: '2025-12-01' },
    { id: 'D-002', from: 'Department B', subject: 'Official Notice', date: '2025-12-05' },
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-3">ID</th>
                <th className="py-3">From</th>
                <th className="py-3">Subject</th>
                <th className="py-3">Received</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sample.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-3 font-medium">{row.id}</td>
                  <td className="py-3">{row.from}</td>
                  <td className="py-3">{row.subject}</td>
                  <td className="py-3">{row.date}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Open</Button>
                      <Button variant="secondary" size="sm">Download</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
