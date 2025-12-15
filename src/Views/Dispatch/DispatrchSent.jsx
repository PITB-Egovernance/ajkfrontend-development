import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';

export default function DispatrchSent() {
  const sample = [
    { id: 'S-101', to: 'Officer X', subject: 'Appointment', date: '2025-11-12' },
    { id: 'S-102', to: 'Officer Y', subject: 'Memo', date: '2025-11-20' },
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-3">ID</th>
                <th className="py-3">To</th>
                <th className="py-3">Subject</th>
                <th className="py-3">Sent</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sample.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-3 font-medium">{row.id}</td>
                  <td className="py-3">{row.to}</td>
                  <td className="py-3">{row.subject}</td>
                  <td className="py-3">{row.date}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="secondary" size="sm">Resend</Button>
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
