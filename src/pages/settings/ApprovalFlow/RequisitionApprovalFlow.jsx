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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const PROCESS_TYPES = [
  { value: 'requisition', label: 'Requisition' },
];

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

  const getDesignationsForWing = useCallback((wingId) => {
    return allDesignations.filter((d) => d.wings === wingId);
  }, [allDesignations]);

  const secretaryDesignation = useMemo(() => {
    return allDesignations.find((d) => d.name.toLowerCase() === 'secretary');
  }, [allDesignations]);

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
  const buildEmployeesMap = useCallback((empList, desigList, wingsList) => {
    const empMap = {};
    desigList.forEach((desig) => {
      const wing = wingsList.find((w) => w.id === desig.wings);
      const wingName = wing?.name || '';
      empMap[desig.hash_id] = empList.filter((e) => {
        const desigMatch = e.designation?.toLowerCase().includes(desig.name.toLowerCase());
        if (!desigMatch) return false;
        if (wingName && e.wing) {
          return e.wing.toLowerCase().includes(wingName.toLowerCase());
        }
        return true;
      });
    });
    return empMap;
  }, []);

  /* ── Load wings, designations, employees, and saved flow ── */
  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      try {
        const [wingsRes, desigRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/settings/wings?per_page=200`, { headers }),
          fetch(`${API_BASE}/settings/designations?per_page=200`, { headers }),
          fetch(`${API_BASE}/users?per_page=500`, { headers }),
        ]);

        const wingsResult = await wingsRes.json();
        const desigResult = await desigRes.json();
        const usersResult = await usersRes.json();

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

        // Parse all employees
        const usersList = usersResult?.data?.data ?? usersResult?.data ?? [];
        const empList = (Array.isArray(usersList) ? usersList : []).map((e) => ({
          id: e.hash_id || e.id,
          name: e.username || e.name || e.full_name || '',
          designation: e.designation || '',
          wing: e.wing || '',
        }));
        setAllEmployees(empList);

        // Build employees map keyed by designation hash_id, filtered by wing
        const empMap = buildEmployeesMap(empList, desigList, wingsList);
        setEmployeesMap(empMap);

        // Fetch saved approval flow
        try {
          const flowRes = await fetch(`${API_BASE}/settings/approval-flow?process_type=requisition`, { headers });
          const flowResult = await flowRes.json();

          if (flowResult.success && flowResult.data?.assignments?.length > 0) {
            const assignments = flowResult.data.assignments;
            const restoredWings = {};
            const restoredDesigMap = {};
            const restoredExpanded = {};
            const restoredEmps = {};

            assignments.forEach((a) => {
              if (a.designation.toLowerCase() === 'secretary') return;
              const wing = wingsList.find((w) => w.name === a.wing);
              if (!wing) return;
              const desig = desigList.find((d) => d.name === a.designation && d.wings === wing.id);
              if (!desig) return;

              restoredWings[wing.id] = true;
              restoredDesigMap[wing.id] = desig.hash_id;
              restoredExpanded[wing.id] = true;

              const emps = empMap[desig.hash_id] || [];
              const matchedEmp = emps.find((e) => e.name === a.employee);
              if (matchedEmp) {
                restoredEmps[`${wing.id}_${desig.hash_id}`] = { [matchedEmp.id]: true };
              }
            });

            setSelectedWings(restoredWings);
            setDesignationMap(restoredDesigMap);
            setExpandedWings(restoredExpanded);
            setSelectedEmployees(restoredEmps);
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
    return Object.entries(designationMap).filter(([wingId, desigHashId]) => {
      const mapKey = `${wingId}_${desigHashId}`;
      const empMap = selectedEmployees[mapKey] || {};
      return Object.values(empMap).some(Boolean);
    }).length;
  }, [designationMap, selectedEmployees]);

  const isValid = useMemo(() => {
    return completeCount > 0 && !!processType;
  }, [completeCount, processType]);

  const toggleWing = (wingId) => {
    setSelectedWings((prev) => {
      const next = { ...prev };
      if (next[wingId]) {
        delete next[wingId];
        setDesignationMap((dm) => { const c = { ...dm }; delete c[wingId]; return c; });
        setExpandedWings((ew) => { const c = { ...ew }; delete c[wingId]; return c; });
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

  const selectDesignation = (wingId, desigHashId) => {
    setDesignationMap((prev) => {
      const copy = { ...prev };
      if (copy[wingId] === desigHashId) {
        delete copy[wingId];
        setSelectedEmployees((se) => { const c = { ...se }; delete c[`${wingId}_${desigHashId}`]; return c; });
      } else {
        if (copy[wingId]) {
          setSelectedEmployees((se) => { const c = { ...se }; delete c[`${wingId}_${copy[wingId]}`]; return c; });
        }
        copy[wingId] = desigHashId;
      }
      return copy;
    });
    setSaved(false);
    setFlowOrder(null);
  };

  const toggleEmployee = (wingId, desigHashId, empId) => {
    const mapKey = `${wingId}_${desigHashId}`;
    setSelectedEmployees((prev) => {
      const current = prev[mapKey] || {};
      if (current[empId]) return { ...prev, [mapKey]: {} };
      return { ...prev, [mapKey]: { [empId]: true } };
    });
    setSaved(false);
    setFlowOrder(null);
  };

  const handleReset = () => {
    setSelectedWings({});
    setDesignationMap({});
    setExpandedWings({});
    setSelectedEmployees({});
    setFlowOrder(null);
    setSaved(false);
    setProcessType('requisition');
  };

  const getSelectedEmpNames = useCallback((wingId, desigHashId) => {
    const mapKey = `${wingId}_${desigHashId}`;
    const empMap = selectedEmployees[mapKey] || {};
    const selectedIds = Object.keys(empMap).filter((id) => empMap[id]);
    if (selectedIds.length === 0) return [];
    return (employeesMap[desigHashId] || []).filter((e) => selectedIds.includes(String(e.id)));
  }, [selectedEmployees, employeesMap]);

  const hasEmployeeSelected = useCallback((wingId, desigHashId) => {
    return getSelectedEmpNames(wingId, desigHashId).length > 0;
  }, [getSelectedEmpNames]);

  const baseSummary = useMemo(() => {
    return Object.entries(designationMap)
      .map(([wingId, desigHashId]) => {
        const wing = wings.find((w) => w.id === wingId);
        const desig = allDesignations.find((d) => d.hash_id === desigHashId);
        return {
          wingId,
          wingName: wing?.name || 'Unknown',
          designation: desig?.name || 'Unknown',
          designationHashId: desigHashId,
          employees: getSelectedEmpNames(wingId, desigHashId),
        };
      });
  }, [designationMap, getSelectedEmpNames, wings, allDesignations]);

  const summary = useMemo(() => {
    if (!flowOrder) return baseSummary;
    const byWing = {};
    baseSummary.forEach((item) => { byWing[item.wingId] = item; });
    return flowOrder.filter((id) => byWing[id]).map((id) => byWing[id]);
  }, [baseSummary, flowOrder]);

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Please complete at least one wing: select wing, designation, and employee');
      return;
    }

    const orderedSummary = flowOrder
      ? flowOrder.map((id) => baseSummary.find((s) => s.wingId === id)).filter(Boolean)
      : baseSummary;

    const assignments = orderedSummary.map((item, i) => ({
      step: i + 1,
      wing: item.wingName,
      designation: item.designation,
      employee: (item.employees || [])[0]?.name || null,
    }));

    if (secretaryDesignation) {
      const secEmps = employeesMap[secretaryDesignation.hash_id] || [];
      assignments.push({
        step: assignments.length + 1,
        wing: 'Final Approval',
        designation: 'Secretary',
        employee: secEmps[0]?.name || null,
      });
    }

    const payload = { process_type: processType, assignments };

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/approval-flow/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setSaved(true);
        setShowFlowDialog(true);
        toast.success('Approval flow saved successfully');
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
      const ids = summary.map((s) => s.wingId);
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
      <div className="max-w-7xl mx-auto">

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
            <button onClick={() => navigate('/dashboard/settings')}
              className="text-sm text-gray-600 flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
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
          <div className="flex gap-3">
            <button onClick={handleReset}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm">
              <RotateCcw size={15} /> Reset
            </button>
            <button onClick={handleSave} disabled={!isValid || saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Save Flow'}
            </button>
          </div>
        </div>

        {/* Process Type */}
        <Card className="mb-6 border border-slate-200">
          <CardContent className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Process Type</label>
            <TextField
              select size="small" value={processType}
              onChange={(e) => setProcessType(e.target.value)}
              sx={{ width: 320 }}
            >
              {PROCESS_TYPES.map((pt) => (
                <MenuItem key={pt.value} value={pt.value}>{pt.label}</MenuItem>
              ))}
            </TextField>
          </CardContent>
        </Card>

        {/* Wing Selection — Tree View */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Select Wings & Assign Designations</h2>
          <p className="text-sm text-slate-500 mb-4">
            Select wings and assign a designation to each. Only designations linked to a wing are shown.
            {assignedCount > 0 && (
              <span className="ml-2 text-emerald-700 font-medium">
                ({assignedCount} wing{assignedCount !== 1 ? 's' : ''} assigned)
              </span>
            )}
          </p>

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
                  const assignedDesigHashId = designationMap[wing.id];
                  const assignedDesig = assignedDesigHashId ? allDesignations.find((d) => d.hash_id === assignedDesigHashId) : null;
                  const isLastWing = wingIdx === wings.length - 1;
                  const wingDesignations = getDesignationsForWing(wing.id);
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
                        {assignedDesig && (
                          <span className="mr-3 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            {assignedDesig.name}
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
                              const isAssigned = designationMap[wing.id] === desig.hash_id;
                              const isLastDesig = desigIdx === wingDesignations.length - 1;
                              const employees = employeesMap[desig.hash_id] || [];
                              const hasEmps = isAssigned && employees.length > 0;
                              const empMapKey = `${wing.id}_${desig.hash_id}`;

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
            {summary.length > 0 && (() => {
              const allSteps = [
                ...summary.map((item, i) => ({ ...item, stepNum: i + 1, isSecretary: false })),
                ...(secretaryDesignation ? [{ stepNum: summary.length + 1, isSecretary: true, designationHashId: secretaryDesignation.hash_id, designation: 'Secretary' }] : []),
              ];
              const totalSteps = allSteps.length;
              return (
                <div className="flex items-center gap-0 mb-6 pb-5 border-b border-slate-200 w-full">
                  {allSteps.map((step, i) => {
                    const colors = step.isSecretary ? SECRETARY_COLORS : getStepColors(i);
                    const emp = step.isSecretary
                      ? (employeesMap[secretaryDesignation?.hash_id] || [])[0]
                      : (step.employees || [])[0];
                    return (
                      <React.Fragment key={step.isSecretary ? 'secretary' : step.wingId}>
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border flex-1 min-w-0 ${colors.bg} ${colors.border}`}>
                          <div className={`w-7 h-7 rounded-full ${colors.dot} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                            {step.stepNum}
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
                        {i < totalSteps - 1 && (
                          <ArrowRight size={18} className="text-slate-400 flex-shrink-0 mx-1" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })()}

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
                  const colors = getStepColors(i);
                  const isDragging = dragIdx === i;
                  const isDragOver = dragOverIdx === i;
                  return (
                    <React.Fragment key={item.wingId}>
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
                            <User size={10} /> {item.employees[0].name}
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

                {/* Secretary — fixed, not draggable */}
                {secretaryDesignation && (
                  <>
                    <div className="flex justify-center">
                      <div className="w-0.5 h-3 bg-slate-300 rounded" />
                    </div>
                    <div className={`p-3 rounded-lg border flex items-center gap-3 ${SECRETARY_COLORS.bg} ${SECRETARY_COLORS.border} opacity-80`}>
                      <div className="w-4 flex-shrink-0" />
                      <div className={`w-7 h-7 rounded-full ${SECRETARY_COLORS.dot} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                        {summary.length + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">Final Approval</p>
                        <p className={`text-xs font-medium ${SECRETARY_COLORS.text}`}>Secretary</p>
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User size={10} /> {(employeesMap[secretaryDesignation.hash_id] || [])[0]?.name}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Validation Status */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 ${processType ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {processType ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  Process type selected
                </div>
                <div className={`flex items-center gap-2 ${completeCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {completeCount > 0 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  At least one complete selection (wing + designation + employee)
                </div>
              </div>
            </div>

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
                      const colors = getStepColors(i);
                      const emp = (item.employees || [])[0];
                      return (
                        <React.Fragment key={item.wingId}>
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
                          <div className="flex items-center self-center mt-1 flex-shrink-0 w-10">
                            <div className="flex-1 h-0.5 bg-emerald-300" />
                            <ArrowRight size={16} className="text-emerald-500 -ml-1" />
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Secretary final step */}
                    {secretaryDesignation && (() => {
                      const secEmp = (employeesMap[secretaryDesignation.hash_id] || [])[0];
                      return (
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-full ${SECRETARY_COLORS.dot} text-white flex items-center justify-center text-lg font-bold shadow-md`}>
                            {summary.length + 1}
                          </div>
                          <div className="mt-2 text-center w-full px-1">
                            <p className={`text-xs font-bold ${SECRETARY_COLORS.text} truncate`}>Secretary</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">Final Approval</p>
                            {secEmp && (
                              <span className="text-xs text-slate-600 flex items-center justify-center gap-1 mt-1 truncate">
                                <User size={10} className="text-slate-400 flex-shrink-0" /> {secEmp.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
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
                        const colors = getStepColors(i);
                        return (
                          <tr key={item.wingId} className="border-t border-slate-100">
                            <td className="px-4 py-3">
                              <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold text-white ${colors.dot}`}>{i + 1}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{item.wingName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>{item.designation}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{(item.employees || [])[0]?.name || ''}</td>
                          </tr>
                        );
                      })}
                      {secretaryDesignation && (
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold text-white ${SECRETARY_COLORS.dot}`}>{summary.length + 1}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">Final Approval</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SECRETARY_COLORS.bg} ${SECRETARY_COLORS.text}`}>Secretary</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{(employeesMap[secretaryDesignation.hash_id] || [])[0]?.name || ''}</td>
                        </tr>
                      )}
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
