import React from 'react';

const DispatchSent = () => {
  return (
    <div className="card p-4">
      <h3>Dispatch - Sent</h3>
      <p className="text-muted">List of dispatched items.</p>
      <div className="mt-3 table-responsive">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">ID</th>
              <th>Title</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2">1</td>
              <td>Sample Sent</td>
              <td>2025-12-02</td>
              <td><button className="px-2 py-1 bg-blue-600 text-white rounded">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DispatchSent;
