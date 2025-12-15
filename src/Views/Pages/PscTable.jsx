import React from 'react';

const PscTable = () => {
  return (
    <div className="card p-4">
      <h3>PSC Table</h3>
      <p className="text-muted">Administrative table and quick stats.</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded">Total Requisitions: <strong>123</strong></div>
        <div className="p-3 bg-gray-50 rounded">Approved: <strong>45</strong></div>
      </div>
    </div>
  );
};

export default PscTable;
