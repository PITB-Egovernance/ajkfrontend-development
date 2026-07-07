import React, { useEffect, useState } from 'react';
import SearchableSelect from 'components/ui/SearchableSelect';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress,
  Checkbox, ListItemText, Chip, Box,
} from '@mui/material';
import { Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import DepartmentUserService from 'services/DepartmentUserService';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { fetchPaginatedApiList } from 'utils';
import { formFieldSx, formFieldAutoHeightSx } from 'components/ui/formFieldSx';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const STATUS_OPTIONS = ['active', 'inactive'];

const FIELD_LABELS = {
  full_name: 'Full Name', cnic: 'CNIC', email: 'Email', mobile: 'Mobile',
  department: 'Department', father_husband_name: 'Father/Husband Name',
  gender: 'Gender', date_of_birth: 'Date of Birth', domicile: 'Domicile',
  role: 'Role', status: 'Status',
};

const toDisplayDate = (isoStr) => {
  if (!isoStr) return '';
  const [y, m, d] = String(isoStr).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : isoStr;
};

const DepartmentUserDetailsModal = ({ open, hashId, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});

  const [districtOptions, setDistrictOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);

  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);

  useEffect(() => {
    if (!open || !hashId) return;
    setLoading(true);
    DepartmentUserService.getById(hashId)
      .then((data) => {
        const u = data?.user || data;
        setUser(u);
        setForm({
          full_name: u?.full_name || u?.username || '',
          cnic: u?.cnic || '',
          email: u?.email || '',
          mobile: u?.mobile || '',
          father_husband_name: u?.father_husband_name || '',
          date_of_birth: u?.date_of_birth ? String(u.date_of_birth).slice(0, 10) : '',
          gender: u?.gender || '',
          domicile: u?.domicile || '',
          department: u?.department || '',
          status: u?.status || 'inactive',
          role_permission: u?.role_permission || u?.role || '',
        });
      })
      .catch((err) => toast.error(err.message || 'Failed to load details'))
      .finally(() => setLoading(false));
  }, [open, hashId]);

  const loadOptions = async () => {
    if (districtOptions.length && departmentOptions.length) return;
    setOptionsLoading(true);
    const headers = { Authorization: `Bearer ${AuthService.getToken()}`, Accept: 'application/json', 'X-API-KEY': Config.apiKey };
    try {
      const [dRes, departments, rRes] = await Promise.all([
        fetch(`${Config.apiUrl}/settings/districts`, { headers }),
        fetchPaginatedApiList(`${Config.apiUrl}/settings/departments`, {
          headers,
          perPage: 200,
        }),
        fetch(`${Config.apiUrl}/settings/roles`, { headers }),
      ]);
      const [dData, depData, rData] = await Promise.all([dRes.json(), Promise.resolve(departments), rRes.json()]);
      setDistrictOptions((dData.data?.data ?? dData.data ?? []).map((d) => ({ id: d.hash_id, name: d.name })));
      setDepartmentOptions(depData.filter((d) => (d.status ?? 'active') === 'active').map((d) => ({ id: d.hash_id || d.id, name: d.department_name || d.name })));
      setRoleOptions((rData.data?.data ?? rData.data ?? []).filter((r) => !r.deleted_at).map((r) => ({ id: r.hash_id, name: r.role_name })));
    } catch { toast.error('Failed to load options'); }
    finally { setOptionsLoading(false); }
  };

  useEffect(() => {
    if (!editing) return;
    if (form.domicile && districtOptions.length) {
      setSelectedDistrict(districtOptions.find((d) => d.name.toLowerCase() === form.domicile.toLowerCase()) || null);
    }
    if (form.department && departmentOptions.length) {
      setSelectedDepartment(departmentOptions.find((d) => d.name.toLowerCase() === form.department.toLowerCase()) || null);
    }
    if (roleOptions.length) {
      const roleData = form.role_permission;
      if (Array.isArray(roleData)) {
        setSelectedRoles(roleData.map((r) => {
          if (typeof r === 'object') return r.hash_id || r.id;
          const found = roleOptions.find((opt) => opt.id === r || opt.name.toLowerCase() === String(r).toLowerCase());
          return found?.id || r;
        }));
      } else if (roleData) {
        const names = String(roleData).split(',').map((r) => r.trim()).filter(Boolean);
        setSelectedRoles(names.map((n) => { const f = roleOptions.find((o) => o.name.toLowerCase() === n.toLowerCase()); return f?.id || n; }));
      }
    }
  }, [editing, districtOptions, departmentOptions, roleOptions]); // eslint-disable-line

  const startEditing = async () => { await loadOptions(); setEditing(true); };
  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    const payload = {
      username: form.full_name,
      full_name: form.full_name,
      email: form.email,
      mobile: form.mobile,
      father_husband_name: form.father_husband_name,
      date_of_birth: form.date_of_birth,
      gender: form.gender ? form.gender.toLowerCase() : '',
      domicile: selectedDistrict?.name || form.domicile || '',
      department: selectedDepartment?.name || form.department || '',
      role_permission: selectedRoles,
      status: form.status,
    };
    setSaving(true);
    try {
      const updated = await DepartmentUserService.update(hashId, payload);
      const merged = { ...user, ...updated, full_name: form.full_name, department: payload.department, domicile: payload.domicile };
      setUser(merged);
      setEditing(false);
      onUpdated?.({ ...merged, hash_id: hashId });
      setTimeout(() => toast.success('Department user updated'), 50);
    } catch (error) {
      toast.error(error.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const formatValue = (_key, val) => {
    if (val == null || val === '') return '-';
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(s)) return toDisplayDate(s);
    return s;
  };

  const renderViewRow = (key) => (
    <div key={key} className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{FIELD_LABELS[key] || key}</span>
      <span className="text-sm text-slate-900">{formatValue(key, user?.[key])}</span>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <span className="text-lg font-semibold">Department User Details</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <div className="flex justify-center items-center py-10"><CircularProgress size={28} /></div>
        ) : !user ? (
          <p className="text-sm text-slate-500 py-6 text-center">No details available.</p>
        ) : editing ? (
          <div className="pt-2 space-y-4">
            {optionsLoading && <div className="flex items-center gap-2 text-sm text-slate-400 pb-1"><CircularProgress size={14} /><span>Loading options...</span></div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField fullWidth label="Full Name" value={form.full_name} onChange={handleChange('full_name')} sx={formFieldSx} />
              <TextField fullWidth label="CNIC" value={form.cnic} onChange={(e) => setForm((p) => ({ ...p, cnic: e.target.value.replace(/\D/g, '').slice(0, 13) }))} inputProps={{ maxLength: 13 }} sx={formFieldSx} />
              <TextField fullWidth label="Email" type="email" value={form.email} onChange={handleChange('email')} sx={formFieldSx} />
              <TextField fullWidth label="Father/Husband Name" value={form.father_husband_name} onChange={handleChange('father_husband_name')} sx={formFieldSx} />
              <TextField fullWidth label="Date of Birth" type="date" value={form.date_of_birth} onChange={handleChange('date_of_birth')} InputLabelProps={{ shrink: true }} sx={formFieldSx} />
              <SearchableSelect
                label="Gender"
                value={form.gender}
                onChange={handleChange('gender')}
                options={[
                  { value: '', label: '— Select —' },
                  ...GENDER_OPTIONS.map((g) => ({ value: g, label: g })),
                ]}
                placeholder="— Select —"
              />
              <TextField fullWidth label="Mobile" value={form.mobile} onChange={handleChange('mobile')} sx={formFieldSx} />
              <SearchableSelect
                label="Domicile"
                value={selectedDistrict?.id || ''}
                onChange={(e) => {
                  const opt = districtOptions.find((d) => d.id === e.target.value);
                  setSelectedDistrict(opt || null);
                  setForm((p) => ({ ...p, domicile: opt?.name || '' }));
                }}
                options={districtOptions.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="— Select District —"
              />
              <SearchableSelect
                label="Department"
                value={selectedDepartment?.id || ''}
                onChange={(e) => {
                  const opt = departmentOptions.find((d) => d.id === e.target.value);
                  setSelectedDepartment(opt || null);
                  setForm((p) => ({ ...p, department: opt?.name || '' }));
                }}
                options={departmentOptions.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="— Select Department —"
              />
              <SearchableSelect
                label="Status"
                value={form.status}
                onChange={handleChange('status')}
                options={STATUS_OPTIONS.map((o) => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                placeholder="— Select Status —"
              />

              {/* Role */}
              <TextField fullWidth select label="Role" value={selectedRoles}
                SelectProps={{
                  multiple: true, onChange: () => {},
                  renderValue: (selected) => {
                    if (!selected || selected.length === 0) return '';
                    return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                      {selected.map((id) => { const opt = roleOptions.find((r) => r.id === id); return <Chip key={id} label={opt?.name || id} size="small" />; })}
                    </Box>;
                  },
                  MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
                }}
                sx={formFieldAutoHeightSx}>
                <MenuItem dense onClick={(e) => {
                  e.preventDefault();
                  const allIds = roleOptions.map((r) => r.id);
                  setSelectedRoles(allIds.every((id) => selectedRoles.includes(id)) ? [] : allIds);
                }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                  <Checkbox size="small" checked={roleOptions.length > 0 && roleOptions.every((r) => selectedRoles.includes(r.id))}
                    indeterminate={roleOptions.some((r) => selectedRoles.includes(r.id)) && !roleOptions.every((r) => selectedRoles.includes(r.id))}
                    sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }} />
                  <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
                </MenuItem>
                {roleOptions.map((r) => (
                  <MenuItem key={r.id} dense onClick={(e) => { e.preventDefault(); setSelectedRoles((p) => p.includes(r.id) ? p.filter((id) => id !== r.id) : [...p, r.id]); }}>
                    <Checkbox size="small" checked={selectedRoles.includes(r.id)} sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }} />
                    <ListItemText primary={r.name} primaryTypographyProps={{ fontSize: 13 }} />
                  </MenuItem>
                ))}
              </TextField>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {Object.keys(FIELD_LABELS).filter((key) => key in (user || {})).map(renderViewRow)}
          </div>
        )}
      </DialogContent>

      <DialogActions className="px-6 pb-4">
        {!loading && user && (
          editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </>
          ) : (
            <Button onClick={startEditing}><Pencil size={14} className="mr-2" /> Edit</Button>
          )
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DepartmentUserDetailsModal;
