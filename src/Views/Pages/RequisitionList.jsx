import React from 'react';

const RequisitionList = () => {
  return (
    <div className="card p-4">
      <h3>List of Requisitions</h3>
      <p className="text-muted">All requisitions are shown below.</p>

      <div className="table-responsive mt-3">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Sample Requisition</td>
              <td>Pending</td>
              <td><button className="btn btn-sm btn-primary">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequisitionList;
