import React, { useState, useEffect } from "react";
import { Checkbox } from "@mui/material";
import toast from "react-hot-toast";
import { ACTION_LABELS } from "config/permissionModules";

/**
 * Tabbed permission matrix (module tabs + action checkboxes).
 * Controlled: pass `permissions` + `setPermissions`. Used by the Role form and
 * the Employee form's Roles & Permissions section.
 */
const PermissionMatrix = ({ modules, permissions, setPermissions, readOnly = false }) => {
  const MODULE_KEYS = Object.keys(modules);
  const [activeTab, setActiveTab] = useState(MODULE_KEYS[0]);

  // Keep the active tab valid if the module set changes.
  useEffect(() => {
    if (!modules[activeTab]) setActiveTab(Object.keys(modules)[0]);
    // eslint-disable-next-line
  }, [modules]);

  const toggleAction = (moduleKey, subKey, action) => {
    if (readOnly) return;
    setPermissions((prev) => {
      const current = prev[moduleKey]?.[subKey] || {};
      const updated = { ...current, [action]: !current[action] };
      const hasView = "view" in updated;

      if (hasView && (action === "add" || action === "edit")) {
        if (updated.add && updated.edit) updated.view = true;
        else if (updated.add || updated.edit) updated.view = false;
      } else if (hasView && action === "view") {
        const onlyOne = ((updated.add ? 1 : 0) + (updated.edit ? 1 : 0)) === 1;
        if (updated.view && onlyOne) {
          updated.view = false;
          toast.error("Select both Add & Edit (View auto-applies), or choose View alone.");
        }
      }

      return { ...prev, [moduleKey]: { ...prev[moduleKey], [subKey]: updated } };
    });
  };

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

  const tabModule = modules[activeTab];
  if (!tabModule) return null;
  const tabSubModules = Object.entries(tabModule.modules);
  const tabActions = [...new Set(tabSubModules.flatMap(([, sub]) => sub.actions))];

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
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
                  ? "bg-white text-emerald-800 border border-slate-200 border-b-white -mb-px shadow-sm"
                  : "text-slate-600 hover:bg-white/60"
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
                      <button
                        type="button"
                        onClick={() => {
                          const all = tabSubModules.every(([sk, sub]) => !sub.actions.includes(action) || permissions[activeTab]?.[sk]?.[action]);
                          toggleColumn(activeTab, action, !all);
                        }}
                        className="text-[10px] text-emerald-600 hover:underline font-normal"
                      >
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
                          sx={{ p: 0.5, color: "#10b981", "&.Mui-checked": { color: "#059669" }, "&.MuiCheckbox-indeterminate": { color: "#059669" } }}
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
                          sx={{ p: 0.5, color: "#94a3b8", "&.Mui-checked": { color: "#064e3b" } }}
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
    </div>
  );
};

export default PermissionMatrix;
