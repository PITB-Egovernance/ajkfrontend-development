import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TextField, MenuItem, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import {
  ArrowLeft, ChevronDown, ChevronRight, CheckCircle2,
  AlertCircle, RotateCcw, Save, GitBranch, User,
  ArrowRight, Info, Layers, GripVertical, Loader2,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import EmployeeService from 'services/EmployeeService';
import { hasPermission } from 'utils/permissions';

const PERM = 'requisitions.admin_requisition'; // permission scope for the approval flow

const PROCESS_TYPES = [
  { value: 'requisition', label: 'Requisition' },
];

// Designations are hardcoded (same under every wing), in descending hierarchy.
const HARDCODED_DESIGNATIONS = [
  { hash_id: 'assistant_director', name: 'Assistant Director' },
  { hash_id: 'deputy_director', name: 'Deputy Director' },
  { hash_id: 'director', name: 'Director' },
];

const HARDCODED_SECRETARY = { hash_id: 'secretary', name: 'Secretary' };

// Safely turn any value (string, array, or relation object {name, hash_id})
// into a comma-separated display string — matches the Employees list page.
const asText = (v) => {
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(', ');
  if (typeof v === 'object') return v.name || v.role_name || v.title || '';
  return String(v);
};

// Split a comma-separated value into trimmed, lower-cased tokens for exact matching.
const toTokens = (v) => asText(v).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const STEP_COLORS = [
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-600', ring: 'ring-emerald-300' },
  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-700', ring: 'ring-emerald-400' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-800', ring: 'ring-emerald-400' },
  { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-600', ring: 'ring-teal-300' },
  { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-800', dot: 'bg-teal-700', ring: 'ring-teal-400' },
];

const SECRETARY_COLORS = { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900', dot: 'bg-emerald-900', ring: 'ring-emerald-500' };

const getStepColors = (index) => STEP_COLORS[index % STEP_COLORS.length];

const RequisitionApprovalFlow = () => {
  const navigate = useNavigate();

  // Action-level permission for the current role (configuring the flow = edit).
  const canEdit = hasPermission(`${PERM}.edit`);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'x-api-key': Config.apiKey,
  };

  const [processType, setProcessType] = useState('requisition');
  const [wings, setWings] = useState([]);
  const [allDesignations, setAllDesignations] = useState([]);
  const [selectedWings, setSelectedWings] = useState({});
  const [designationMap, setDesignationMap] = useState({});
  const [expandedWings, setExpandedWings] = useState({});
  const [saved, setSaved] = useState(false);
  const [showFlowDialog, setShowFlowDialog] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState({});
  const [flowOrder, setFlowOrder] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [employeesMap, setEmployeesMap] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // hash_id of the currently saved flow. Null = nothing saved yet (Save creates),
  // set = a flow exists (Save updates, Reset deletes).
  const [flowId, setFlowId] = useState(null);
  const [flowType, setFlowType] = useState('online');
  const [secretarySelected, setSecretarySelected] = useState(false);
  const [secretaryEmployees, setSecretaryEmployees] = useState({});
  const [sortDir, setSortDir] = useState('asc');

  // Designations are hardcoded (Assistant Director, Deputy Director, Director)
  // and shown identically under every dynamic wing. Wings come from the API,
  // designations are fixed.
  const getDesignationsForWing = useCallback(() => {
    return sortDir === 'desc' ? [...HARDCODED_DESIGNATIONS].reverse() : HARDCODED_DESIGNATIONS;
  }, [sortDir]);

  const secretaryDesignation = HARDCODED_SECRETARY;

  const [allEmployees, setAllEmployees] = useState([]);

  /* ── Fetch all employees once ── */
  const fetchAllEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/users?per_page=500`, { headers });
      const result = await res.json();
      const list = result?.data?.data ?? result?.data ?? [];
      const mapped = (Array.isArray(list) ? list : []).map((e) => ({
        id: e.hash_id || e.id,
        name: e.username || e.name || e.full_name || '',
        designation: e.designation || '',
        wing: e.wing || '',
      }));
      setAllEmployees(mapped);
      return mapped;
    } catch (err) {
      console.warn('Failed to fetch employees:', err);
      return [];
    }
  };

  /* ── Get employees matching a designation + wing ── */
  const getEmployeesForDesignation = useCallback((designationName, wingName) => {
    return allEmployees.filter((e) => {
      const desigMatch = e.designation?.toLowerCase().includes(designationName.toLowerCase());
      if (!desigMatch) return false;
      if (wingName && e.wing) {
        return e.wing.toLowerCase().includes(wingName.toLowerCase());
      }
      return true;
    });
  }, [allEmployees]);

  /* ── Build employeesMap from allEmployees whenever data changes ── */
  // An employee is listed under a wing→designation node when their designation
  // spelling matches the hardcoded designation AND their wing matches, so each
  // wing only lists its own staff. Keyed by `${wingId}_${designationHashId}`;
  // the wing-independent Secretary is keyed by its hash_id alone.
  const buildEmployeesMap = useCallback((empList, wingsList) => {
    const empMap = {};
    wingsList.forEach((wing) => {
      const wingName = (wing.name || '').toLowerCase();
      HARDCODED_DESIGNATIONS.forEach((desig) => {
        empMap[`${wing.id}_${desig.hash_id}`] = empList.filter((e) =>
          e.designationTokens.includes(desig.name.toLowerCase()) &&
          e.wingTokens.includes(wingName)
        );
      });
    });
    empMap[HARDCODED_SECRETARY.hash_id] = empList.filter((e) =>
      e.designationTokens.includes(HARDCODED_SECRETARY.name.toLowerCase())
    );
    return empMap;
  }, []);

  /* ── Load wings, designations, employees, and saved flow ── */
  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      try {
        const [wingsRes, desigRes, usersResult] = await Promise.all([
          fetch(`${API_BASE}/settings/wings?per_page=200`, { headers }),
          fetch(`${API_BASE}/settings/designations?per_page=200`, { headers }),
          // Same source as the Employees list (/employee/list) so we get all
          // employees with their designation, wings and role_permission.
          EmployeeService.getUsers({ per_page: 1000 }),
        ]);

        const wingsResult = await wingsRes.json();
        const desigResult = await desigRes.json();

        let wingsList = [];
        if (wingsResult.success) {
          const data = wingsResult.data?.data ?? wingsResult.data ?? [];
          wingsList = data
            .filter((w) => w.status === 'active' || !w.status)
            .map((w) => ({ id: w.hash_id || String(w.id), name: w.name }));
          setWings(wingsList);
        }

        let desigList = [];
        if (desigResult.success === true || desigResult.status === 200) {
          const data = desigResult.data?.data ?? desigResult.data ?? [];
          desigList = data
            .filter((d) => d.status === 'active')
            .map((d) => ({
              hash_id: d.hash_id,
              name: d.name,
              wings: d.wings || null,
            }));
          setAllDesignations(desigList);
        }

        // Parse all employees. Designation, wing and role can each arrive as a
        // string, array, or relation object — normalise to display text + tokens.
        const usersList = usersResult?.data ?? [];
        const empList = (Array.isArray(usersList) ? usersList : [])
          // Approval flow uses active employees only.
          .filter((e) => String(e.status || '').toLowerCase() === 'active')
          .map((e) => ({
          id: e.hash_id || e.id,
          name: e.username || e.name || e.full_name || '',
          designation: asText(e.designation),
          wing: asText(e.wings ?? e.wing),
          // Match the employee's designation spelling against the hardcoded
          // approval designations — role is intentionally ignored.
          designationTokens: toTokens(e.designation),
          wingTokens: toTokens(e.wings ?? e.wing),
        }));
        setAllEmployees(empList);

        // Build employees map keyed by `${wingId}_${designationHashId}`
        const empMap = buildEmployeesMap(empList, wingsList);
        setEmployeesMap(empMap);

        // Fetch saved approval flow
        try {
          const flowRes = await fetch(`${API_BASE}/settings/approval-flow?process_type=requisition`, { headers });
          const flowResult = await flowRes.json();

          // The API returns the saved flow either as a mapped `assignments` array
          // or as the raw `steps` relation. Normalise both into a uniform shape:
          //   { step, wing, designation: '<string>', employee: '<names>' }
          // designation may arrive as a plain string, an array, or a JSON-encoded
          // array string ("[\"Director\"]"); employee may be `employee` or `employee_name`.
          const rawList = flowResult.data?.assignments ?? flowResult.data?.steps ?? [];
          const assignments = (Array.isArray(rawList) ? rawList : []).map((a) => {
            let designation = a.designation;
            if (typeof designation === 'string' && designation.trim().startsWith('[')) {
              try {
                const parsed = JSON.parse(designation);
                if (Array.isArray(parsed)) designation = parsed[0] ?? '';
              } catch { /* leave as-is */ }
            }
            if (Array.isArray(designation)) designation = designation[0] ?? '';
            return {
              step: a.step,
              wing: a.wing,
              designation: designation ?? '',
              employee: a.employee ?? a.employee_name ?? '',
            };
          });

          // Remember the saved flow's id so Save updates it (instead of creating a
          // duplicate) and Reset can delete it.
          if (flowResult.success && flowResult.data) {
            setFlowId(flowResult.data.hash_id || flowResult.data.id || null);
          }

          if (flowResult.success && assignments.length > 0) {
            const restoredWings = {};
            const restoredDesigMap = {};
            const restoredExpanded = {};
            const restoredEmps = {};

            const restoredSecEmps = {};
            let restoredSecSelected = false;

            assignments.forEach((a) => {
              if (a.designation.toLowerCase() === 'secretary') {
                restoredSecSelected = true;
                const emps = empMap[HARDCODED_SECRETARY.hash_id] || [];
                String(a.employee || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => {
                  const matched = emps.find((e) => e.name === name);
                  if (matched) restoredSecEmps[matched.id] = true;
                });
                return;
              }
              const wing = wingsList.find((w) => w.name === a.wing);
              if (!wing) return;
              const desig = HARDCODED_DESIGNATIONS.find((d) => d.name.toLowerCase() === a.designation.toLowerCase());
              if (!desig) return;

              restoredWings[wing.id] = true;
              if (!Array.isArray(restoredDesigMap[wing.id])) restoredDesigMap[wing.id] = [];
              if (!restoredDesigMap[wing.id].includes(desig.hash_id)) restoredDesigMap[wing.id].push(desig.hash_id);
              restoredExpanded[wing.id] = true;

              const emps = empMap[`${wing.id}_${desig.hash_id}`] || [];
              // Support comma-separated employee names (multiple per designation)
              const empNames = String(a.employee || '').split(',').map((s) => s.trim()).filter(Boolean);
              const empSel = restoredEmps[`${wing.id}_${desig.hash_id}`] || {};
              empNames.forEach((name) => {
                const matchedEmp = emps.find((e) => e.name === name);
                if (matchedEmp) empSel[matchedEmp.id] = true;
              });
              if (Object.keys(empSel).length > 0) {
                restoredEmps[`${wing.id}_${desig.hash_id}`] = empSel;
              }
            });

            setSelectedWings(restoredWings);
            setDesignationMap(restoredDesigMap);
            setExpandedWings(restoredExpanded);
            setSelectedEmployees(restoredEmps);
            setSecretarySelected(restoredSecSelected);
            setSecretaryEmployees(restoredSecEmps);
            setSaved(true);
          }
        } catch (err) {
          console.warn('Failed to fetch saved approval flow:', err);
        }
      } catch (err) {
        console.warn('Failed to initialize:', err);
      } finally {
        setPageLoading(false);
      }
    };
    init();
    // eslint-disable-next-line
  }, []);

  const assignedCount = Object.keys(designationMap).length;

  const completeCount = useMemo(() => {
    let count = 0;
    Object.entries(designationMap).forEach(([wingId, desigList]) => {
      (desigList || []).forEach((desigHashId) => {
        const empMap = selectedEmployees[`${wingId}_${desigHashId}`] || {};
        if (Object.values(empMap).some(Boolean)) count++;
      });
    });
    return count;
  }, [designationMap, selectedEmployees]);

  // Valid when: at least one wing selected, every selected wing has at least
  // one designation, and every selected designation has at least one employee.
  // Valid as soon as there is at least one fully-configured step
  // (wing → designation → employee). Half-selected wings without an employee are
  // ignored — they're never sent in the payload — so they no longer keep Save
  // disabled. Any number of steps and repeated employees are allowed.
  const isValid = useMemo(() => {
    let completeSteps = 0;
    Object.entries(designationMap).forEach(([wingId, desigList]) => {
      (desigList || []).forEach((desigHashId) => {
        const empMap = selectedEmployees[`${wingId}_${desigHashId}`] || {};
        if (Object.values(empMap).some(Boolean)) completeSteps += 1;
      });
    });
    return completeSteps > 0;
  }, [designationMap, selectedEmployees]);

  const toggleWing = (wingId) => {
    setSelectedWings((prev) => {
      const next = { ...prev };
      if (next[wingId]) {
        delete next[wingId];
        setDesignationMap((dm) => { const c = { ...dm }; delete c[wingId]; return c; });
        setExpandedWings((ew) => { const c = { ...ew }; delete c[wingId]; return c; });
        setSelectedEmployees((se) => {
          const c = { ...se };
          Object.keys(c).forEach((k) => { if (k.startsWith(`${wingId}_`)) delete c[k]; });
          return c;
        });
      } else {
        next[wingId] = true;
        setExpandedWings((ew) => ({ ...ew, [wingId]: true }));
      }
      return next;
    });
    setSaved(false);
    setFlowOrder(null);
  };

  const toggleExpand = (wingId) => {
    setExpandedWings((prev) => ({ ...prev, [wingId]: !prev[wingId] }));
  };

  // Multiple designations can be selected per wing. Toggles the designation
  // in the wing's array; removing it also clears its selected employees.
  const selectDesignation = (wingId, desigHashId) => {
    setDesignationMap((prev) => {
      const copy = { ...prev };
      const current = Array.isArray(copy[wingId]) ? [...copy[wingId]] : [];
      if (current.includes(desigHashId)) {
        const next = current.filter((id) => id !== desigHashId);
        if (next.length === 0) delete copy[wingId]; else copy[wingId] = next;
        setSelectedEmployees((se) => { const c = { ...se }; delete c[`${wingId}_${desigHashId}`]; return c; });
      } else {
        copy[wingId] = [...current, desigHashId];
      }
      return copy;
    });
    setSaved(false);
    setFlowOrder(null);
  };

  // Multiple employees can be selected per designation (standard checkbox).
  const toggleEmployee = (wingId, desigHashId, empId) => {
    const mapKey = `${wingId}_${desigHashId}`;
    setSelectedEmployees((prev) => {
      const current = { ...(prev[mapKey] || {}) };
      if (current[empId]) delete current[empId];
      else current[empId] = true;
      return { ...prev, [mapKey]: current };
    });
    setSaved(false);
    setFlowOrder(null);
  };

  const clearForm = () => {
    setSelectedWings({});
    setDesignationMap({});
    setExpandedWings({});
    setSelectedEmployees({});
    setSecretarySelected(false);
    setSecretaryEmployees({});
    setFlowOrder(null);
    setSaved(false);
    setProcessType('requisition');
  };

  // Reset removes the saved flow: if one exists in the DB it is deleted via the
  // API, then the form is cleared. With nothing saved yet, it just clears the form.
  const handleReset = async () => {
    if (!flowId) {
      clearForm();
      return;
    }

    const confirmed = await confirmDelete({
      title: 'Delete Approval Flow',
      message: 'This permanently deletes the saved approval flow. Are you sure?',
      warning: '',
      confirmLabel: 'Yes, Delete',
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/approval-flow/delete/${flowId}`, {
        method: 'DELETE',
        headers,
      });
      const result = await res.json();
      if (result.success) {
        setFlowId(null);
        clearForm();
        toast.success('Approval flow deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete approval flow');
      }
    } catch (err) {
      console.error('Delete approval flow error:', err);
      toast.error(err.message || 'Network error while deleting');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedEmpNames = useCallback((wingId, desigHashId) => {
    const mapKey = `${wingId}_${desigHashId}`;
    const empMap = selectedEmployees[mapKey] || {};
    const selectedIds = Object.keys(empMap).filter((id) => empMap[id]);
    if (selectedIds.length === 0) return [];
    return (employeesMap[mapKey] || []).filter((e) => selectedIds.includes(String(e.id)));
  }, [selectedEmployees, employeesMap]);

  const hasEmployeeSelected = useCallback((wingId, desigHashId) => {
    return getSelectedEmpNames(wingId, desigHashId).length > 0;
  }, [getSelectedEmpNames]);

  const baseSummary = useMemo(() => {
    const items = [];
    Object.entries(designationMap).forEach(([wingId, desigList]) => {
      (desigList || []).forEach((desigHashId) => {
        const employees = getSelectedEmpNames(wingId, desigHashId);
        // A wing→designation only enters the flow once an employee is selected.
        if (employees.length === 0) return;
        const wing = wings.find((w) => w.id === wingId);
        const desig = HARDCODED_DESIGNATIONS.find((d) => d.hash_id === desigHashId);
        items.push({
          key: `${wingId}_${desigHashId}`,
          wingId,
          wingName: wing?.name || 'Unknown',
          designation: desig?.name || 'Unknown',
          designationHashId: desigHashId,
          employees,
          isSecretary: false,
        });
      });
    });
    // Secretary is added to the flow as soon as it's ticked — it does not
    // depend on selecting an employee (approver is optional).
    if (secretarySelected) {
      const secEmps = (employeesMap[HARDCODED_SECRETARY.hash_id] || []).filter((e) => secretaryEmployees[e.id]);
      items.push({
        key: 'secretary',
        wingId: 'secretary',
        wingName: 'Final Approval',
        designation: 'Secretary',
        designationHashId: HARDCODED_SECRETARY.hash_id,
        employees: secEmps,
        isSecretary: true,
      });
    }
    return items;
  }, [designationMap, getSelectedEmpNames, wings, secretarySelected, secretaryEmployees, employeesMap]);

  const summary = useMemo(() => {
    if (!flowOrder) return baseSummary;
    const byKey = {};
    baseSummary.forEach((item) => { byKey[item.key] = item; });
    return flowOrder.filter((k) => byKey[k]).map((k) => byKey[k]);
  }, [baseSummary, flowOrder]);

  // Sort the final flow by designation hierarchy rank (ascending/descending).
  const applySort = (dir) => {
    setSortDir(dir);
    const rankOf = (item) => {
      if (item.isSecretary) return HARDCODED_DESIGNATIONS.length;
      const idx = HARDCODED_DESIGNATIONS.findIndex((d) => d.hash_id === item.designationHashId);
      return idx === -1 ? HARDCODED_DESIGNATIONS.length : idx;
    };
    const ordered = [...baseSummary].sort((a, b) =>
      dir === 'asc' ? rankOf(a) - rankOf(b) : rankOf(b) - rankOf(a)
    );
    setFlowOrder(ordered.map((s) => s.key));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Select at least one wing with a designation and an employee before saving');
      return;
    }

    const confirmed = await confirmDelete({
      title: 'Save Approval Flow',
      message: 'Are you sure you want to save this approval flow?',
      warning: '',
      confirmLabel: 'Yes, Save',
      confirmColor: 'bg-emerald-600 hover:bg-emerald-700',
    });
    if (!confirmed) return;

    const orderedSummary = flowOrder
      ? flowOrder.map((k) => baseSummary.find((s) => s.key === k)).filter(Boolean)
      : baseSummary;

    const assignments = orderedSummary.map((item, i) => ({
      step: i + 1,
      wing: item.wingName,
      designation: item.designation,
      employee: (item.employees || []).map((e) => e.name).join(', ') || null,
    }));

    const payload = { process_type: processType, flow_type: flowType, assignments };

    // Existing flow → PUT update/{id}; first save → POST save.
    const isUpdate = Boolean(flowId);
    const url = isUpdate
      ? `${API_BASE}/settings/approval-flow/update/${flowId}`
      : `${API_BASE}/settings/approval-flow/save`;

    setSaving(true);
    try {
      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        // Capture the id so the next save updates instead of creating a duplicate.
        setFlowId(result.data?.hash_id || result.data?.id || flowId);
        setSaved(true);
        setShowFlowDialog(true);
        toast.success(isUpdate ? 'Approval flow updated successfully' : 'Approval flow saved successfully');
      } else {
        toast.error(result.message || 'Failed to save approval flow');
      }
    } catch (err) {
      console.error('Save approval flow error:', err);
      toast.error(err.message || 'Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const onDragStart = (idx) => { setDragIdx(idx); };
  const onDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const onDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      const ids = summary.map((s) => s.key);
      const [moved] = ids.splice(dragIdx, 1);
      ids.splice(dragOverIdx, 0, moved);
      setFlowOrder(ids);
      setSaved(false);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto" style={{ minWidth: "-webkit-fill-available" }}>

        {pageLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-emerald-700" />
            <span className="ml-3 text-slate-600 font-medium">Loading approval flow...</span>
          </div>
        )}

        {!pageLoading && (
          <>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <button onClick={() => navigate('/dashboard/requisitions')}
              className="text-sm text-gray-600 flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Requisitions
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <GitBranch size={22} className="text-emerald-800" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Requisition Approval Flow</h1>
                <p className="text-sm text-slate-500">Configure wing-based approval hierarchy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wing Selection — Tree View */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Approval Flow</h2>
          <p className="text-sm text-slate-500 mb-4">
            Select Below
            {assignedCount > 0 && (
              <span className="ml-2 text-emerald-700 font-medium">
                ({assignedCount} wing{assignedCount !== 1 ? 's' : ''} assigned)
              </span>
            )}
          </p>

          {/* Flow Type — Online / Hardcopy */}
          <div className="flex items-center gap-6 mb-3">
            <span className="text-sm font-semibold text-slate-700">Flow Type:</span>
            {['online', 'hardcopy'].map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="flow_type"
                  value={type}
                  checked={flowType === type}
                  onChange={(e) => setFlowType(e.target.value)}
                  className="w-4 h-4 accent-emerald-700 cursor-pointer"
                />
                <span className={`text-sm ${flowType === type ? 'font-semibold text-emerald-800' : 'text-slate-600'}`}>
                  {type === 'online' ? 'Online' : 'Hardcopy'}
                </span>
              </label>
            ))}
          </div>

          {/* Designation Order — Ascending / Descending */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-semibold text-slate-700">Order:</span>
            <button type="button" onClick={() => applySort('asc')}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${
                sortDir === 'asc' ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>
              <ArrowUp size={14} /> Ascending
            </button>
            <button type="button" onClick={() => applySort('desc')}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${
                sortDir === 'desc' ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>
              <ArrowDown size={14} /> Descending
            </button>
          </div>

          <Card className="border border-slate-200">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
                <Layers size={18} className="text-emerald-700" />
                <span className="text-base font-semibold text-slate-800">Organizational Wings</span>
              </div>

              <div className="bg-white select-none">
                {wings.map((wing, wingIdx) => {
                  const isSelected = !!selectedWings[wing.id];
                  const isExpanded = !!expandedWings[wing.id];
                  const assignedDesigList = designationMap[wing.id] || [];
                  const isLastWing = wingIdx === wings.length - 1;
                  const wingDesignations = getDesignationsForWing();
                  const hasChildren = isSelected && isExpanded;

                  return (
                    <div key={wing.id}>
                      <div className={`flex items-center gap-0 border-b border-slate-100 transition-colors duration-100 ${isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                        <div className="w-8 flex-shrink-0 flex justify-center relative h-10">
                          <div className={`absolute left-1/2 w-px bg-slate-300 ${wingIdx === 0 ? 'top-1/2 h-1/2' : hasChildren || !isLastWing ? 'top-0 h-full' : 'top-0 h-1/2'}`} />
                          <div className="absolute top-1/2 left-1/2 w-3 h-px bg-slate-300" />
                        </div>
                        <button type="button" onClick={() => { if (!isSelected) toggleWing(wing.id); else toggleExpand(wing.id); }}
                          className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-slate-400 hover:text-slate-600">
                          {isSelected && isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <Checkbox checked={isSelected} onChange={() => toggleWing(wing.id)} size="small"
                          sx={{ p: '4px', color: '#94a3b8', '&.Mui-checked': { color: '#064e3b' } }} />
                        <Layers size={17} className={`flex-shrink-0 mr-1.5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span className={`text-base py-2 cursor-pointer flex-1 ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                          onClick={() => { if (!isSelected) toggleWing(wing.id); else toggleExpand(wing.id); }}>
                          {wing.name}
                        </span>
                        {assignedDesigList.length > 0 && (
                          <span className="mr-3 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            {assignedDesigList.length} selected
                          </span>
                        )}
                      </div>

                      {isSelected && isExpanded && (
                        <div>
                          {wingDesignations.length === 0 ? (
                            <div className="flex items-center gap-2 px-12 py-3 text-base text-slate-400 italic border-b border-slate-50">
                              <AlertCircle size={16} />
                              No designations assigned to this wing
                            </div>
                          ) : (
                            wingDesignations.map((desig, desigIdx) => {
                              const isAssigned = assignedDesigList.includes(desig.hash_id);
                              const isLastDesig = desigIdx === wingDesignations.length - 1;
                              const empMapKey = `${wing.id}_${desig.hash_id}`;
                              const employees = employeesMap[empMapKey] || [];
                              const hasEmps = isAssigned && employees.length > 0;

                              return (
                                <React.Fragment key={desig.hash_id}>
                                  <div className={`flex items-center gap-0 border-b border-slate-50 transition-colors duration-100 ${isAssigned ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}`}>
                                    <div className="w-8 flex-shrink-0 flex justify-center relative h-9">
                                      {!isLastWing && <div className="absolute top-0 left-1/2 w-px bg-slate-300 h-full" />}
                                    </div>
                                    <div className="w-6 flex-shrink-0 relative flex justify-center h-9">
                                      <div className={`absolute top-0 left-1/2 w-px bg-slate-200 ${isLastDesig && !hasEmps ? 'h-1/2' : 'h-full'}`} />
                                      <div className="absolute top-1/2 left-1/2 w-3 h-px bg-slate-200" />
                                    </div>
                                    {employees.length > 0 ? (
                                      <span className="w-4 flex-shrink-0 flex items-center justify-center text-slate-300">
                                        {isAssigned ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                      </span>
                                    ) : <span className="w-4 flex-shrink-0" />}
                                    <Checkbox checked={isAssigned} onChange={() => selectDesignation(wing.id, desig.hash_id)}
                                      size="small"
                                      sx={{ p: '4px', color: '#94a3b8', '&.Mui-checked': { color: '#064e3b' } }} />
                                    <span className={`text-base py-2 flex-1 cursor-pointer ${isAssigned ? 'font-semibold text-emerald-800' : 'text-slate-600 hover:text-slate-800'}`}
                                      onClick={() => selectDesignation(wing.id, desig.hash_id)}>
                                      {desig.name}
                                    </span>
                                  </div>

                                  {hasEmps && employees.map((emp, empIdx) => {
                                    const isLastEmp = empIdx === employees.length - 1;
                                    const isEmpSelected = !!(selectedEmployees[empMapKey] || {})[emp.id];
                                    return (
                                      <div key={emp.id} className={`flex items-center gap-0 border-b border-slate-50 transition-colors duration-100 ${isEmpSelected ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                                        <div className="w-8 flex-shrink-0 flex justify-center relative h-8">
                                          {!isLastWing && <div className="absolute top-0 left-1/2 w-px bg-slate-300 h-full" />}
                                        </div>
                                        <div className="w-6 flex-shrink-0 relative flex justify-center h-8">
                                          {(!isLastDesig || !isLastEmp) && <div className={`absolute top-0 left-1/2 w-px bg-slate-200 ${isLastDesig && isLastEmp ? 'h-0' : 'h-full'}`} />}
                                        </div>
                                        <span className="w-4 flex-shrink-0" />
                                        <div className="w-6 flex-shrink-0 relative flex justify-center h-8">
                                          <div className={`absolute top-0 left-1/2 w-px bg-slate-200 ${isLastEmp ? 'h-1/2' : 'h-full'}`} />
                                          <div className="absolute top-1/2 left-1/2 w-3 h-px bg-slate-200" />
                                        </div>
                                        <Checkbox checked={isEmpSelected} onChange={() => toggleEmployee(wing.id, desig.hash_id, emp.id)} size="small"
                                          sx={{ p: '3px', color: '#94a3b8', '&.Mui-checked': { color: '#064e3b' } }} />
                                        <User size={15} className="text-slate-400 flex-shrink-0 mr-1.5" />
                                        <span className={`text-sm py-1.5 flex-1 cursor-pointer ${isEmpSelected ? 'font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                          onClick={() => toggleEmployee(wing.id, desig.hash_id, emp.id)}>
                                          {emp.name}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Secretary — optional, not belonging to any wing (final step) */}
                {secretaryDesignation && (() => {
                  const secEmps = employeesMap[secretaryDesignation.hash_id] || [];
                  return (
                    <div>
                      <div className={`flex items-center gap-0 border-b border-slate-100 transition-colors duration-100 ${secretarySelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                        <div className="w-8 flex-shrink-0 flex justify-center relative h-10">
                          <div className="absolute left-1/2 w-px bg-slate-300 top-0 h-1/2" />
                          <div className="absolute top-1/2 left-1/2 w-3 h-px bg-slate-300" />
                        </div>
                        <span className="w-5 h-5 flex-shrink-0" />
                        <Checkbox checked={secretarySelected} onChange={() => { setSecretarySelected((v) => !v); setSaved(false); }} size="small"
                          sx={{ p: '4px', color: '#94a3b8', '&.Mui-checked': { color: '#064e3b' } }} />
                        <Layers size={17} className={`flex-shrink-0 mr-1.5 ${secretarySelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span className={`text-base py-2 cursor-pointer flex-1 ${secretarySelected ? 'font-semibold text-emerald-800' : 'text-slate-600'}`}
                          onClick={() => { setSecretarySelected((v) => !v); setSaved(false); }}>
                          Secretary <span className="text-xs text-slate-400 font-normal">(optional — final approval)</span>
                        </span>
                      </div>

                      {secretarySelected && secEmps.map((emp, empIdx) => {
                        const isLastEmp = empIdx === secEmps.length - 1;
                        const isEmpSelected = !!secretaryEmployees[emp.id];
                        return (
                          <div key={emp.id} className={`flex items-center gap-0 border-b border-slate-50 transition-colors duration-100 ${isEmpSelected ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                            <div className="w-8 flex-shrink-0 flex justify-center relative h-8" />
                            <div className="w-6 flex-shrink-0 relative flex justify-center h-8">
                              <div className={`absolute top-0 left-1/2 w-px bg-slate-200 ${isLastEmp ? 'h-1/2' : 'h-full'}`} />
                              <div className="absolute top-1/2 left-1/2 w-3 h-px bg-slate-200" />
                            </div>
                            <Checkbox checked={isEmpSelected} size="small"
                              onChange={() => {
                                setSecretaryEmployees((prev) => {
                                  const c = { ...prev };
                                  if (c[emp.id]) delete c[emp.id]; else c[emp.id] = true;
                                  return c;
                                });
                                setSaved(false);
                              }}
                              sx={{ p: '3px', color: '#94a3b8', '&.Mui-checked': { color: '#064e3b' } }} />
                            <User size={15} className="text-slate-400 flex-shrink-0 mr-1.5" />
                            <span className={`text-sm py-1.5 flex-1 cursor-pointer ${isEmpSelected ? 'font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                              onClick={() => {
                                setSecretaryEmployees((prev) => {
                                  const c = { ...prev };
                                  if (c[emp.id]) delete c[emp.id]; else c[emp.id] = true;
                                  return c;
                                });
                                setSaved(false);
                              }}>
                              {emp.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Combined: Approval Hierarchy + Assignment Summary (draggable) */}
        <Card className="mb-6 border border-slate-200">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Approval Hierarchy & Assignment Summary
              </h3>
              {summary.length > 1 && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <GripVertical size={13} />
                  Drag items to rearrange the approval flow before submitting
                </span>
              )}
            </div>

            {/* Hierarchy preview row */}
            {summary.length > 0 && (
                <div className="flex items-center gap-0 mb-6 pb-5 border-b border-slate-200 w-full">
                  {summary.map((step, i) => {
                    const colors = step.isSecretary ? SECRETARY_COLORS : getStepColors(i);
                    const emp = (step.employees || [])[0];
                    return (
                      <React.Fragment key={step.key}>
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border flex-1 min-w-0 ${colors.bg} ${colors.border}`}>
                          <div className={`w-7 h-7 rounded-full ${colors.dot} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-sm font-semibold ${colors.text} block truncate`}>{step.designation}</span>
                            <div className="mt-0.5">
                              {emp ? (
                                <span className="text-xs text-slate-500 flex items-center gap-0.5 truncate">
                                  <User size={10} className="text-slate-400 flex-shrink-0" /> {emp.name}
                                </span>
                              ) : (
                                <span className="text-xs text-amber-500 italic">Not selected</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {i < summary.length - 1 && (
                          <ArrowRight size={18} className="text-slate-400 flex-shrink-0 mx-1" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
            )}

            {/* Draggable assignment summary */}
            {summary.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No designations assigned yet</p>
                <p className="text-xs text-slate-400 mt-1">Select wings, assign designations, and pick employees above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {summary.map((item, i) => {
                  const colors = item.isSecretary ? SECRETARY_COLORS : getStepColors(i);
                  const isDragging = dragIdx === i;
                  const isDragOver = dragOverIdx === i;
                  return (
                    <React.Fragment key={item.key}>
                      <div
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={(e) => onDragOver(e, i)}
                        onDragEnd={onDragEnd}
                        className={`p-3 rounded-lg border flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all duration-150 ${colors.bg} ${colors.border} ${
                          isDragging ? 'opacity-40 scale-95' : ''
                        } ${isDragOver ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                      >
                        <GripVertical size={16} className="text-slate-400 flex-shrink-0" />
                        <div className={`w-7 h-7 rounded-full ${colors.dot} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.wingName}</p>
                          <p className={`text-xs font-medium ${colors.text}`}>{item.designation}</p>
                        </div>
                        {(item.employees || []).length > 0 && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <User size={10} /> {item.employees.map((e) => e.name).join(', ')}
                          </span>
                        )}
                      </div>
                      {i < summary.length - 1 && (
                        <div className="flex justify-center">
                          <div className="w-0.5 h-3 bg-slate-300 rounded" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {saved && summary.length > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowFlowDialog(true)} type="button"
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 hover:from-emerald-900">
                  <GitBranch size={15} /> View Approval Flow
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Action Buttons */}
        <div className="flex justify-end gap-3 mb-6">
          <button onClick={handleReset} disabled={saving}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <RotateCcw size={15} /> {flowId ? 'Delete Flow' : 'Reset'}
          </button>
          {canEdit && (
            <button onClick={handleSave} disabled={!isValid || saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : (flowId ? 'Update Flow' : 'Save Flow')}
            </button>
          )}
        </div>

        {/* Flow Hierarchy Dialog */}
        <Dialog open={showFlowDialog} onClose={() => setShowFlowDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle className="font-bold flex items-center gap-2">
            <GitBranch size={20} className="text-emerald-700" />
            Requisition Approval Flow Hierarchy
          </DialogTitle>
          <DialogContent>
            {summary.length === 0 ? (
              <p className="text-slate-500 py-4">No flow configured yet.</p>
            ) : (
              <div className="py-4">
                <div className="mb-6 flex items-center gap-2">
                  <span className="text-sm text-slate-600 font-medium">Process Type:</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                    {PROCESS_TYPES.find((p) => p.value === processType)?.label}
                  </span>
                </div>

                {/* Horizontal Flow Track */}
                <div className="pb-2" style={{ width: '-webkit-fill-available' }}>
                  <div className="flex items-start w-full">
                    {summary.map((item, i) => {
                      const colors = item.isSecretary ? SECRETARY_COLORS : getStepColors(i);
                      const emp = (item.employees || [])[0];
                      return (
                        <React.Fragment key={item.key}>
                          <div className="flex flex-col items-center flex-1 min-w-0">
                            <div className={`w-12 h-12 rounded-full ${colors.dot} text-white flex items-center justify-center text-lg font-bold shadow-md`}>
                              {i + 1}
                            </div>
                            <div className="mt-2 text-center w-full px-1">
                              <p className={`text-xs font-bold ${colors.text} truncate`}>{item.designation}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{item.wingName}</p>
                              {emp && (
                                <span className="text-xs text-slate-600 flex items-center justify-center gap-1 mt-1 truncate">
                                  <User size={10} className="text-slate-400 flex-shrink-0" /> {emp.name}
                                </span>
                              )}
                            </div>
                          </div>
                          {i < summary.length - 1 && (
                            <div className="flex items-center self-center mt-1 flex-shrink-0 w-10">
                              <div className="flex-1 h-0.5 bg-emerald-300" />
                              <ArrowRight size={16} className="text-emerald-500 -ml-1" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Table */}
                <div className="mt-8 border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">Step</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">Wing</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">Designation</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">Approver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((item, i) => {
                        const colors = item.isSecretary ? SECRETARY_COLORS : getStepColors(i);
                        return (
                          <tr key={item.key} className="border-t border-slate-100">
                            <td className="px-4 py-3">
                              <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold text-white ${colors.dot}`}>{i + 1}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{item.wingName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>{item.designation}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{(item.employees || []).map((e) => e.name).join(', ')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <button onClick={() => setShowFlowDialog(false)} type="button"
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Close
            </button>
          </DialogActions>
        </Dialog>

          </>
        )}
      </div>
    </div>
  );
};

export default RequisitionApprovalFlow;
