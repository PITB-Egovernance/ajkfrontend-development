import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import EmployeeService from 'services/EmployeeService';

const STATUS_OPTIONS = ['active', 'inactive'];

const FIELD_LABELS = {
  username: 'Username',
  cnic: 'CNIC',
  email: 'Email',
  father_husband_name: 'Father/Husband Name',
  gender: 'Gender',
  date_of_birth: 'Date of Birth',
  domicile: 'Domicile',
  mobile: 'Mobile',
  designation: 'Designation',
  grade: 'Grade',
  role: 'Role',
  status: 'Account Status',
  status_job: 'Job Status',
};

const EDITABLE_FIELDS = ['email', 'father_husband_name', 'mobile', 'domicile', 'designation', 'grade', 'status'];

const EmployeeDetailsModal = ({ open, hashId, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!open || !hashId) return;

    setLoading(true);
    setEditing(false);
    EmployeeService.getUserDetails(hashId)
      .then((data) => {
        setUser(data);
        setForm({
          email: data?.email || '',
          father_husband_name: data?.father_husband_name || '',
          mobile: data?.mobile || '',
          domicile: data?.domicile || '',
          designation: data?.designation || '',
          grade: data?.grade || '',
          status: data?.status || 'active',
        });
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to load user details');
      })
      .finally(() => setLoading(false));
  }, [open, hashId]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await EmployeeService.updateUser(hashId, form);
      toast.success('Employee updated successfully');
      setUser((prev) => ({ ...prev, ...updated }));
      setEditing(false);
      onUpdated?.({ ...user, ...updated, hash_id: hashId });
    } catch (error) {
      toast.error(error.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const renderViewRow = (key) => (
    <div key={key} className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-500 uppercase">{FIELD_LABELS[key] || key}</span>
      <span className="text-sm text-slate-900">{String(user?.[key] ?? '-')}</span>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <span>Employee Details</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X size={18} />
        </button>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <CircularProgress size={28} />
          </div>
        ) : !user ? (
          <p className="text-sm text-slate-500 py-6 text-center">No details available.</p>
        ) : editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {EDITABLE_FIELDS.map((field) =>
              field === 'status' ? (
                <TextField
                  key={field}
                  select
                  fullWidth
                  label={FIELD_LABELS[field]}
                  value={form[field]}
                  onChange={handleChange(field)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  key={field}
                  fullWidth
                  label={FIELD_LABELS[field]}
                  value={form[field]}
                  onChange={handleChange(field)}
                />
              )
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {Object.keys(FIELD_LABELS)
              .filter((key) => key in (user || {}))
              .map(renderViewRow)}
          </div>
        )}
      </DialogContent>

      <DialogActions className="px-6 pb-4">
        {!loading && user && (
          editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Pencil size={14} className="mr-2" />
              Edit Employee
            </Button>
          )
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeDetailsModal;
