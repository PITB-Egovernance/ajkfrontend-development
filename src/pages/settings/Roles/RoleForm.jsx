import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { TextField, Checkbox } from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import Button from "components/ui/Button";
import { ArrowLeft, Save, ShieldCheck, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import { InlineLoader } from "components/ui/Loader";
import RolesApi from "api/rolesApi";
import { PERMISSION_MODULES, ACTION_LABELS, buildEmptyPermissionsFrom, normalizeModules } from "config/permissionModules";

const RoleForm = () => {
  const { hashId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // /create → add, /:hashId → view, /:hashId/edit → edit
  const isView = !!hashId && !location.pathname.endsWith('/edit');
  const isEdit = !!hashId && location.pathname.endsWith('/edit');
  const isCreate = !hashId;
  const readOnly = isView;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [status, setStatus] = useState("active");
  const [modules, setModules] = useState(PERMISSION_MODULES);
  const [permissions, setPermissions] = useState(buildEmptyPermissionsFrom(PERMISSION_MODULES));
  const [activeTab, setActiveTab] = useState(Object.keys(PERMISSION_MODULES)[0]);
  const [errors, setErrors] = useState({});

  const MODULE_KEYS = Object.keys(modules);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

      // 1) Canonical module structure from the backend (fall back to local config).
      let mods = PERMISSION_MODULES;
      try {
        const res = await RolesApi.getModules();
        const norm = normalizeModules(res.data ?? res);
        if (norm) {
          // Use the backend structure, but make sure every module we know about
          // locally (e.g. Candidates) is present even if the backend hasn't
          // started returning it yet — otherwise those tabs would be missing.
          mods = { ...norm };
          Object.entries(PERMISSION_MODULES).forEach(([key, mod]) => {
            if (!mods[key]) mods[key] = mod;
          });
        }
      } catch (_) {
        // backend unavailable → keep local fallback structure
      }
      if (!active) return;
      setModules(mods);
      setActiveTab(Object.keys(mods)[0]);

      // 2) Create → empty matrix; View/Edit → load + merge saved permissions.
      if (!hashId) {
        setPermissions(buildEmptyPermissionsFrom(mods));
        setLoading(false);
        return;
      }

      try {
        const result = await RolesApi.getById(hashId);
        if (!active) return;
        const data = result.data ?? result;
        setRoleName(data.role_name ?? data.name ?? "");
        setStatus(data.status ?? "active");

        const base = buildEmptyPermissionsFrom(mods);
        const saved = (data.permissions && typeof data.permissions === 'object' && !Array.isArray(data.permissions)) ? data.permissions : {};
        Object.entries(saved).forEach(([m, subs]) => {
          if (!base[m]) return;
          Object.entries(subs || {}).forEach(([s, acts]) => {
            if (!base[m][s]) return;
            Object.entries(acts || {}).forEach(([a, v]) => {
              if (a in base[m][s]) base[m][s][a] = v === true;
            });
          });
        });
        setPermissions(base);
      } catch (err) {
        if (!active) return;
        toast.error(err.message || "Failed to load role");
        navigate("/dashboard/settings/roles");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [hashId, navigate]);

  const toggleAction = (moduleKey, subKey, action) => {
    if (readOnly) return;
    setPermissions((prev) => {
      const current = prev[moduleKey]?.[subKey] || {};
      const updated = { ...current, [action]: !current[action] };
      const hasView = 'view' in updated;

      if (hasView && (action === 'add' || action === 'edit')) {
        // Both Add & Edit → auto-enable View. Only one of them → View not allowed.
        if (updated.add && updated.edit) updated.view = true;
        else if (updated.add || updated.edit) updated.view = false;
      } else if (hasView && action === 'view') {
        // View alone is fine, but Add+View (no Edit) or Edit+View (no Add) is blocked.
        const onlyOne = ((updated.add ? 1 : 0) + (updated.edit ? 1 : 0)) === 1;
        if (updated.view && onlyOne) {
          updated.view = false;
          toast.error('Select both Add & Edit (View auto-applies), or choose View alone.');
        }
      }

      return {
        ...prev,
        [moduleKey]: { ...prev[moduleKey], [subKey]: updated },
      };
    });
  };

  // Toggle an entire action column for the active tab (select-all per column)
  const toggleColumn = (moduleKey, action, value) => {
    if (readOnly) return;
    setPermissions((prev) => {
      const next = { ...prev, [moduleKey]: { ...prev[moduleKey] } };
      Object.keys(modules[moduleKey].modules).forEach((subKey) => {
        if (action in (next[moduleKey][subKey] || {})) {
          next[moduleKey][subKey] = { ...next[moduleKey][subKey], [action]: value };
        }
      });
      return next;
    });
  };

  // Toggle an entire sub-module row (all its actions)
  const toggleRow = (moduleKey, subKey, value) => {
    if (readOnly) return;
    setPermissions((prev) => {
      const updated = { ...(prev[moduleKey]?.[subKey] || {}) };
      (modules[moduleKey]?.modules[subKey]?.actions || Object.keys(updated)).forEach((a) => { updated[a] = value; });
      return { ...prev, [moduleKey]: { ...prev[moduleKey], [subKey]: updated } };
    });
  };

  const moduleSelectedCount = (moduleKey) => {
    let count = 0;
    Object.values(permissions[moduleKey] || {}).forEach((acts) => {
      Object.values(acts).forEach((v) => { if (v) count++; });
    });
    return count;
  };

  const handleSubmit = async () => {
    const errs = {};
    if (!roleName.trim()) errs.roleName = "Role name is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const confirmed = await confirmDelete({
      title: isEdit ? "Update Role" : "Create Role",
      message: `Are you sure you want to ${isEdit ? "update" : "create"} this role?`,
      warning: "",
      confirmLabel: isEdit ? "Yes, Update" : "Yes, Create",
      confirmColor: "bg-emerald-600 hover:bg-emerald-700",
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const payload = { role_name: roleName.trim(), status, permissions };
      if (isEdit) {
        await RolesApi.update(hashId, payload);
        toast.success("Role updated successfully");
      } else {
        await RolesApi.create(payload);
        toast.success("Role created successfully");
      }
      navigate("/dashboard/settings/roles");
    } catch (error) {
      if (error.errors?.role_name) setErrors({ roleName: error.errors.role_name[0] });
      toast.error(error.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <InlineLoader text="Loading role..." variant="ring" size="lg" />;

  const tabModule = modules[activeTab];
  if (!tabModule) return <InlineLoader text="Loading permissions..." variant="ring" size="lg" />;
  const tabSubModules = Object.entries(tabModule.modules);
  // All distinct actions across this tab's sub-modules (column headers)
  const tabActions = [...new Set(tabSubModules.flatMap(([, sub]) => sub.actions))];

  const title = isCreate ? "Add New Role" : isEdit ? "Edit Role" : "Role Details";

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto space-y-6" style={{ minWidth: "-webkit-fill-available" }}>

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <button onClick={() => navigate("/dashboard/settings/roles")} className="text-sm text-gray-600 flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Roles
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            </div>
          </div>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : isEdit ? "Update Role" : "Create Role"}
            </Button>
          )}
        </div>

        {/* ROLE NAME */}
        <Card className="border border-slate-200">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Role Name"
                required
                value={roleName}
                onChange={(e) => { setRoleName(e.target.value); if (e.target.value.trim()) setErrors({}); }}
                error={!!errors.roleName}
                helperText={errors.roleName}
                InputProps={{ readOnly }}
              />
              {(isEdit || isView) && (
                <TextField
                  select fullWidth label="Status" value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  SelectProps={{ native: true }}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ readOnly }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </TextField>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PERMISSION TABS */}
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            {/* Tab Bar */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 pt-3">
              {MODULE_KEYS.map((key) => {
                const selected = moduleSelectedCount(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                      activeTab === key
                        ? 'bg-white text-emerald-800 border border-slate-200 border-b-white -mb-px shadow-sm'
                        : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    {modules[key].label}
                    {selected > 0 && (
                      <span className="text-[10px] bg-emerald-600 text-white rounded-full px-1.5 py-0.5 font-bold">{selected}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Permission Matrix Table */}
            <div className="overflow-x-auto p-5">
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Module</th>
                    {tabActions.map((action) => (
                      <th key={action} className="px-4 py-3 font-semibold text-slate-700 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span>{ACTION_LABELS[action] || action}</span>
                          {!readOnly && (
                            <button type="button"
                              onClick={() => {
                                const all = tabSubModules.every(([sk, sub]) => !sub.actions.includes(action) || permissions[activeTab]?.[sk]?.[action]);
                                toggleColumn(activeTab, action, !all);
                              }}
                              className="text-[10px] text-emerald-600 hover:underline font-normal">
                              All
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabSubModules.map(([subKey, sub]) => {
                    const cell = permissions[activeTab]?.[subKey] || {};
                    const rowAll = sub.actions.every((a) => cell[a]);
                    return (
                      <tr key={subKey} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            {!readOnly && (
                              <Checkbox
                                size="small"
                                checked={rowAll}
                                indeterminate={!rowAll && sub.actions.some((a) => cell[a])}
                                onChange={() => toggleRow(activeTab, subKey, !rowAll)}
                                sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
                              />
                            )}
                            {sub.label}
                          </div>
                        </td>
                        {tabActions.map((action) => (
                          <td key={action} className="px-4 py-3 text-center">
                            {sub.actions.includes(action) ? (
                              <Checkbox
                                size="small"
                                checked={!!cell[action]}
                                onChange={() => toggleAction(activeTab, subKey, action)}
                                disabled={readOnly}
                                sx={{ p: 0.5, color: '#94a3b8', '&.Mui-checked': { color: '#064e3b' } }}
                              />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom actions */}
        {!readOnly && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard/settings/roles")}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : isEdit ? "Update Role" : "Create Role"}
            </Button>
          </div>
        )}
        {readOnly && (
          <div className="flex justify-end">
            <Button onClick={() => navigate(`/dashboard/settings/roles/${hashId}/edit`)}>
              <Pencil size={16} className="mr-2" /> Edit Role
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleForm;
