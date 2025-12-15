import React from 'react';

const AddNotes = () => {
  return (
    <div className="card p-4">
      <h3>Add Notes</h3>
      <p className="text-muted">Attach notes to requisitions or records.</p>
      <div className="mt-3">
        <textarea className="form-control" rows={5} placeholder="Write a note..."></textarea>
        <button className="btn btn-primary mt-3">Save Note</button>
      </div>
    </div>
  );
};

export default AddNotes;
