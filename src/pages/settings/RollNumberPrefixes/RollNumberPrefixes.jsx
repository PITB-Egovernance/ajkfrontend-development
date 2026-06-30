import React, { useEffect, useState } from 'react';
import { TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import { Hash, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { hasPermission } from 'utils/permissions';

const PERM = 'settings.roll_number_exam_type_configs';

const API_BASE = Config.apiUrl;
const API_KEY  = Config.apiKey;

const authHeaders = (json = true) => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'X-API-KEY': API_KEY,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

// Display labels for the exam types this module supports — must mirror
// examTypeMeta in RollNumberExamFlow.jsx so the prefix shown here lines up
// with the page admins actually generate roll numbers from.
const EXAM_TYPE_LABELS = {
  'one-paper-mcqs': 'One Paper MCQs',
  'two-paper-mcqs': 'Two Paper MCQs',
  'written-exams':  'Written Exams',
  'cce-exams':      'CCE Exams',
};

const RollNumberPrefixes = () => {
  const canEdit = hasPermission(`${PERM}.edit`);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ prefix: '', starting_number: 1 });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/roll-number-exam-type-configs`, { headers: authHeaders() });
      const result = await res.json();
      if (res.ok) {
        setRows(result.data ?? []);
      } else {
        toast.error(result.message || 'Failed to load roll number prefixes');
      }
    } catch {
      toast.error('Failed to load roll number prefixes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const openEdit = (row) => {
    setEditing(row);
    setForm({ prefix: row.prefix || '', starting_number: row.starting_number || 1 });
  };

  const handleSave = async () => {
    if (!form.prefix.trim()) {
      toast.error('Prefix is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/roll-number-exam-type-configs/${editing.exam_type}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ prefix: form.prefix.trim(), starting_number: Number(form.starting_number) || 1 }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Roll number prefix updated successfully');
        setEditing(null);
        fetchConfigs();
      } else {
        toast.error(result.message || 'Failed to update prefix');
      }
    } catch {
      toast.error('Failed to update prefix');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-emerald-100 rounded-lg"><Hash size={18} className="text-emerald-800" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Roll Number Prefixes</h1>
          <p className="text-xs text-slate-500">Configure the prefix and starting number used for each exam type's roll numbers.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><InlineLoader text="Loading…" variant="ring" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Exam Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Prefix</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Starting Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Last Issued</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.exam_type} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{EXAM_TYPE_LABELS[row.exam_type] || row.exam_type}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-800">{row.prefix}</td>
                    <td className="px-4 py-3 text-slate-600">{row.starting_number}</td>
                    <td className="px-4 py-3 text-slate-600">{row.last_number > 0 ? `${row.prefix}-${String(row.last_number).padStart(6, '0')}` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <Button variant="outline" size="sm" className="gap-1 bg-white" onClick={() => openEdit(row)}>
                          <Pencil size={13} /> Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Prefix — {editing ? (EXAM_TYPE_LABELS[editing.exam_type] || editing.exam_type) : ''}</DialogTitle>
        <DialogContent className="!pt-4 space-y-4">
          <TextField
            fullWidth size="small" label="Prefix" value={form.prefix}
            onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}
            helperText="Letters/numbers only, e.g. OPM, TPM"
          />
          <TextField
            fullWidth size="small" type="number" label="Starting Number" value={form.starting_number}
            onChange={(e) => setForm((f) => ({ ...f, starting_number: e.target.value }))}
            helperText="Only affects numbers issued after this change — already-issued roll numbers are never renumbered."
          />
        </DialogContent>
        <DialogActions className="!p-4">
          <Button variant="outline" className="bg-white" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RollNumberPrefixes;
