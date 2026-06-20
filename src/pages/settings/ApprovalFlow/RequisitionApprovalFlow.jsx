import React, { useState, useMemo, useCallback } from 'react';
import {
  TextField, MenuItem, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import {
  ArrowLeft, ChevronDown, ChevronRight, CheckCircle2,
  AlertCircle, RotateCcw, Save, GitBranch, User,
  ArrowRight, Info, Layers, GripVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const WINGS = [
  { id: 'exam_wing', name: 'Exam Wing' },
  { id: 'recruitment_wing_1', name: 'Recruitment Wing I' },
  { id: 'recruitment_wing_2', name: 'Recruitment Wing II' },
  { id: 'admin_wing', name: 'Admin Wing' },
  { id: 'research_wing', name: 'Research Wing' },
  { id: 'litigation_wing', name: 'Litigation Wing' },
  { id: 'it_wing', name: 'IT Wing' },
];

const DESIGNATIONS = [
  { key: 'assistant_director', label: 'Assistant Director', order: 1 },
  { key: 'deputy_director', label: 'Deputy Director', order: 2 },
  { key: 'director', label: 'Director', order: 3 },
];

const MAX_ASSIGNMENTS = DESIGNATIONS.length;

const HIERARCHY_STEPS = [
  ...DESIGNATIONS,
  { key: 'secretary', label: 'Secretary', order: 4 },
];

const PROCESS_TYPES = [
  { value: 'requisition', label: 'Requisition' },
];

const MOCK_EMPLOYEES = {
  assistant_director: [
    { id: 1, name: 'Muhammad Imran Khan' },
    { id: 2, name: 'Syed Ali Raza' },
  ],
  deputy_director: [
    { id: 3, name: 'Khalid Mehmood' },
    { id: 4, name: 'Zahid Hussain' },
  ],
  director: [
    { id: 5, name: 'Dr. Farooq Ahmed' },
    { id: 6, name: 'Shahid Iqbal' },
  ],
  secretary: [
    { id: 7, name: 'Raja Muhammad Arif' },
    { id: 8, name: 'Sardar Tanveer' },
  ],
};

const hierarchyColors = {
  assistant_director: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-600', ring: 'ring-emerald-300' },
  deputy_director: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-700', ring: 'ring-emerald-400' },
  director: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-800', ring: 'ring-emerald-400' },
  secretary: { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900', dot: 'bg-emerald-900', ring: 'ring-emerald-500' },
};

const RequisitionApprovalFlow = () => {
  const navigate = useNavigate();

  const [processType, setProcessType] = useState('requisition');
  const [selectedWings, setSelectedWings] = useState({});
  const [designationMap, setDesignationMap] = useState({});
  const [expandedWings, setExpandedWings] = useState({});
  const [saved, setSaved] = useState(false);
  const [showFlowDialog, setShowFlowDialog] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState({});
  const [flowOrder, setFlowOrder] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const usedDesignations = useMemo(() => {
    return new Set(Object.values(designationMap));
  }, [designationMap]);

  const assignedCount = Object.keys(designationMap).length;
  const allDesignationsConsumed = assignedCount >= MAX_ASSIGNMENTS;

  const completeCount = useMemo(() => {
    return Object.entries(designationMap).filter(([wingId, desigKey]) => {
      const mapKey = `${wingId}_${desigKey}`;
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

  const selectDesignation = (wingId, designationKey) => {
    setDesignationMap((prev) => {
      const copy = { ...prev };
      if (copy[wingId] === designationKey) {
        delete copy[wingId];
        setSelectedEmployees((se) => { const c = { ...se }; delete c[`${wingId}_${designationKey}`]; return c; });
      } else {
        if (copy[wingId]) {
          setSelectedEmployees((se) => { const c = { ...se }; delete c[`${wingId}_${copy[wingId]}`]; return c; });
        }
        copy[wingId] = designationKey;
      }
      return copy;
    });
    setSaved(false);
    setFlowOrder(null);
  };

  const toggleEmployee = (wingId, designationKey, empId) => {
    const mapKey = `${wingId}_${designationKey}`;
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

  const handleSave = () => {
    if (!isValid) {
      toast.error('Please complete at least one wing: select wing, designation, and employee');
      return;
    }
    setSaved(true);
    setShowFlowDialog(true);
    toast.success('Approval flow saved successfully');
  };

  const getSelectedEmpNames = useCallback((wingId, desigKey) => {
    const mapKey = `${wingId}_${desigKey}`;
    const empMap = selectedEmployees[mapKey] || {};
    const selectedIds = Object.keys(empMap).filter((id) => empMap[id]);
    if (selectedIds.length === 0) return [];
    return (MOCK_EMPLOYEES[desigKey] || []).filter((e) => selectedIds.includes(String(e.id)));
  }, [selectedEmployees]);

  const hasEmployeeSelected = useCallback((wingId, desigKey) => {
    return getSelectedEmpNames(wingId, desigKey).length > 0;
  }, [getSelectedEmpNames]);

  const baseSummary = useMemo(() => {
    return Object.entries(designationMap)
      .map(([wingId, desigKey]) => {
        const wing = WINGS.find((w) => w.id === wingId);
        const desig = DESIGNATIONS.find((d) => d.key === desigKey);
        return {
          wingId,
          wingName: wing?.name || 'Unknown',
          designation: desig?.label || 'Unknown',
          designationKey: desigKey,
          order: desig?.order || 0,
          employees: getSelectedEmpNames(wingId, desigKey),
        };
      }).sort((a, b) => a.order - b.order);
  }, [designationMap, getSelectedEmpNames]);

  const summary = useMemo(() => {
    if (!flowOrder) return baseSummary;
    const byWing = {};
    baseSummary.forEach((item) => { byWing[item.wingId] = item; });
    return flowOrder.filter((id) => byWing[id]).map((id) => byWing[id]);
  }, [baseSummary, flowOrder]);

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
            <button onClick={handleSave} disabled={!isValid}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <Save size={15} /> Save Flow
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

        {/* All designations consumed banner */}
        {allDesignationsConsumed && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <Info size={20} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">All available designations have been assigned.</p>
              <p className="text-xs text-amber-600 mt-0.5">No additional assignments can be made. Reset or remove existing assignments to reassign.</p>
            </div>
          </div>
        )}

        {/* Wing Selection — Tree View (full width) */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Select Wings & Assign Designations</h2>
          <p className="text-sm text-slate-500 mb-4">
            Select wings and assign a unique designation to each. Each designation can only be used once across all wings.
            {assignedCount > 0 && (
              <span className="ml-2 text-emerald-700 font-medium">
                ({assignedCount}/{MAX_ASSIGNMENTS} designations assigned)
              </span>
            )}
          </p>

          <Card className="border border-slate-200">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
                <Layers size={16} className="text-emerald-700" />
                <span className="text-sm font-semibold text-slate-800">Organizational Wings</span>
              </div>

              <div className="bg-white select-none">
                {WINGS.map((wing, wingIdx) => {
                  const isSelected = !!selectedWings[wing.id];
                  const isExpanded = !!expandedWings[wing.id];
                  const assignedDesig = designationMap[wing.id];
                  const isLastWing = wingIdx === WINGS.length - 1;
                  const hasChildren = isSelected && isExpanded;

                  return (
                    <div key={wing.id}>
                      <div className={`flex items-center gap-0 border-b border-slate-100 transition-colors duration-100 ${isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                        <div className="w-8 flex-shrink-0 flex justify-center relative h-9">
                          <div className={`absolute left-1/2 w-px bg-slate-300 ${wingIdx === 0 ? 'top-1/2 h-1/2' : hasChildren || !isLastWing ? 'top-0 h-full' : 'top-0 h-1/2'}`} />
                          <div className="absolute top-1/2 left-1/2 w-3 h-px bg-slate-300" />
                        </div>
                        <button type="button" onClick={() => { if (!isSelected) toggleWing(wing.id); else toggleExpand(wing.id); }}
                          className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-slate-400 hover:text-slate-600">
                          {isSelected && isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <Checkbox checked={isSelected} onChange={() => toggleWing(wing.id)} size="small"
                          sx={{ p: '4px', color: '#94a3b8', '&.Mui-checked': { color: '#064e3b' } }} />
                        <Layers size={15} className={`flex-shrink-0 mr-1.5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span className={`text-sm py-2 cursor-pointer flex-1 ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                          onClick={() => { if (!isSelected) toggleWing(wing.id); else toggleExpand(wing.id); }}>
                          {wing.name}
                        </span>
                        {assignedDesig && (
                          <span className="mr-3 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            {DESIGNATIONS.find((d) => d.key === assignedDesig)?.label}
                          </span>
                        )}
                      </div>

                      {isSelected && isExpanded && (
                        <div>
                          {DESIGNATIONS.map((desig, desigIdx) => {
                            const isUsedElsewhere = usedDesignations.has(desig.key) && designationMap[wing.id] !== desig.key;
                            const isAssigned = designationMap[wing.id] === desig.key;
                            const isDisabled = isUsedElsewhere || (allDesignationsConsumed && !isAssigned);
                            const isLastDesig = desigIdx === DESIGNATIONS.length - 1;
                            const employees = MOCK_EMPLOYEES[desig.key] || [];
                            const hasEmps = isAssigned && employees.length > 0;
                            const empMapKey = `${wing.id}_${desig.key}`;

                            return (
                              <React.Fragment key={desig.key}>
                                <div className={`flex items-center gap-0 border-b border-slate-50 transition-colors duration-100 ${isAssigned ? 'bg-emerald-50/40' : isDisabled ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
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
                                  <Checkbox checked={isAssigned} onChange={() => !isDisabled && selectDesignation(wing.id, desig.key)}
                                    disabled={isDisabled} size="small"
                                    sx={{ p: '4px', color: isDisabled ? '#cbd5e1' : '#94a3b8', '&.Mui-checked': { color: '#064e3b' }, '&.Mui-disabled': { color: '#e2e8f0' } }} />
                                  <span className={`text-sm py-2 flex-1 cursor-pointer ${isAssigned ? 'font-semibold text-emerald-800' : isDisabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:text-slate-800'}`}
                                    onClick={() => !isDisabled && selectDesignation(wing.id, desig.key)}>
                                    {desig.label}
                                  </span>
                                  {isUsedElsewhere && (
                                    <span className="mr-3 text-xs text-amber-500 flex items-center gap-1">
                                      <AlertCircle size={11} /> Assigned
                                    </span>
                                  )}
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
                                      <Checkbox checked={isEmpSelected} onChange={() => toggleEmployee(wing.id, desig.key, emp.id)} size="small"
                                        sx={{ p: '3px', color: '#94a3b8', '&.Mui-checked': { color: '#064e3b' } }} />
                                      <User size={13} className="text-slate-400 flex-shrink-0 mr-1.5" />
                                      <span className={`text-xs py-1.5 flex-1 cursor-pointer ${isEmpSelected ? 'font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                        onClick={() => toggleEmployee(wing.id, desig.key, emp.id)}>
                                        {emp.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
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

            {/* Hierarchy preview row — reflects drag order + selected employees */}
            {summary.length > 0 && (() => {
              const allSteps = [
                ...summary.map((item, i) => ({ ...item, stepNum: i + 1, isSecretary: false })),
                { stepNum: summary.length + 1, isSecretary: true, designationKey: 'secretary', designation: 'Secretary' },
              ];
              const totalSteps = allSteps.length;
              return (
                <div className="flex items-center gap-0 mb-6 pb-5 border-b border-slate-200 w-full">
                  {allSteps.map((step, i) => {
                    const colors = hierarchyColors[step.designationKey];
                    const emp = step.isSecretary ? (MOCK_EMPLOYEES.secretary || [])[0] : (step.employees || [])[0];
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
                  const colors = hierarchyColors[item.designationKey];
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
                <div className="flex justify-center">
                  <div className="w-0.5 h-3 bg-slate-300 rounded" />
                </div>
                <div className={`p-3 rounded-lg border flex items-center gap-3 ${hierarchyColors.secretary.bg} ${hierarchyColors.secretary.border} opacity-80`}>
                  <div className="w-4 flex-shrink-0" />
                  <div className={`w-7 h-7 rounded-full ${hierarchyColors.secretary.dot} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {summary.length + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Final Approval</p>
                    <p className={`text-xs font-medium ${hierarchyColors.secretary.text}`}>Secretary</p>
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <User size={10} /> {(MOCK_EMPLOYEES.secretary || [])[0]?.name}
                  </span>
                </div>
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
                <div className={`flex items-center gap-2 ${completeCount <= MAX_ASSIGNMENTS ? 'text-emerald-600' : 'text-red-500'}`}>
                  {completeCount <= MAX_ASSIGNMENTS ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  Max {MAX_ASSIGNMENTS} assignments ({completeCount}/{MAX_ASSIGNMENTS})
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
                      const colors = hierarchyColors[item.designationKey];
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
                    {(() => {
                      const sc = hierarchyColors.secretary;
                      const secEmp = (MOCK_EMPLOYEES.secretary || [])[0];
                      return (
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-full ${sc.dot} text-white flex items-center justify-center text-lg font-bold shadow-md`}>
                            {summary.length + 1}
                          </div>
                          <div className="mt-2 text-center w-full px-1">
                            <p className={`text-xs font-bold ${sc.text} truncate`}>Secretary</p>
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
                        const colors = hierarchyColors[item.designationKey];
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
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold text-white ${hierarchyColors.secretary.dot}`}>{summary.length + 1}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">Final Approval</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${hierarchyColors.secretary.bg} ${hierarchyColors.secretary.text}`}>Secretary</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{(MOCK_EMPLOYEES.secretary || [])[0]?.name || ''}</td>
                      </tr>
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
      </div>
    </div>
  );
};

export default RequisitionApprovalFlow;
