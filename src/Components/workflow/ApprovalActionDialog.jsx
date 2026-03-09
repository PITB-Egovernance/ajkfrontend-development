import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'Components/ui/Dialog';
import Button from 'Components/ui/Button';

const ApprovalActionDialog = ({ open, onOpenChange, record, action, onSubmit, submitting }) => {
  const [remarks, setRemarks] = useState('');
  const isAccept = action === 'accept';

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(remarks);
    setRemarks('');
  };

  const handleClose = (next) => {
    if (!submitting) {
      onOpenChange(next);
      if (!next) setRemarks('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAccept ? 'Accept' : 'Reject'} Application</DialogTitle>
          <DialogDescription>
            {record?.referenceNo || record?.application_no || 'Application'} - add remarks to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
              placeholder="Write remarks (required)"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !remarks.trim()}>
              {submitting ? 'Saving...' : isAccept ? 'Confirm Accept' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalActionDialog;
