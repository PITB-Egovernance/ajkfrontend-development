import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ArrowLeft, Send, Hash, Users, Building2, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberApi from 'api/rollNumberApi';

const EMPTY_FORM = {
  exam_center_id:  '',
  prefix:          'AJK',
  starting_number: '1001',
  format:          'sequential',
  exam_date:       '',
  attendance_time: '',
};

// Convert HH:MM (24-hour, from <input type="time">) → "H:MM AM/PM"
const formatTime12h = (value) => {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const RollSlipGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Applications passed in via navigation state
  const applications     = useMemo(() => location.state?.applications ?? [], [location.state]);
  const applicationNumbers = useMemo(() => applications.map((a) => a.application_number ?? a.id), [applications]);

  const [formData,   setFormData]   = useState(EMPTY_FORM);
  const [centers,    setCenters]    = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [result,     setResult]     = useState(null);

  // Allocation mode (v2.2.0): 
  // 'manual' = one center for everyone (legacy);
  // 'auto' = group candidates by domicile district, assign each district's candidates to centers in that district until capacity is reached;
  // 'preferred' = use candidate's preferred exam cities in order, then fallback to any remaining centers
  const [allocationMode, setAllocationMode] = useState('manual');
  const [crossDistrictPrompt, setCrossDistrictPrompt] = useState(null); // { district, overflow: number, suggestion: string } | null
  const [crossDistrictAllowed, setCrossDistrictAllowed] = useState(null); // null = ask, true/false = decided
  const [allocationPreview, setAllocationPreview] = useState(null); // { buckets: [{ centerId, centerName, district, apps: [] }], unallocated: [] }

  // Bounce back if the page was opened directly without any selection
  useEffect(() => {
    if (applications.length === 0) {
      toast.error('No candidates selected — open this page from the shortlisted list');
      navigate('/dashboard/roll-numbers', { replace: true });
    }
  }, [applications.length, navigate]);

  // Load exam centers on mount
  const fetchCenters = useCallback(async () => {
    setLoading(true);
    try {
      const r    = await RollNumberApi.getExamCenters(500);
      const list = r.data?.data ?? r.data ?? [];
      setCenters(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err?.status === 401
        ? 'Session expired — please log in again'
        : (err?.message || 'Failed to load exam centers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCenters(); }, [fetchCenters]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── District-based auto-allocation (v2.2.0) ───────────────────────────────
  // Group candidates by their domicile district and assign them to centers in
  // that same district until capacity runs out. When a district overflows we
  // either spill over to another district (if admin allowed it) or surface the
  // overflow as "needs manual allocation".
  //
  // Frontend prerequisites (backend must provide):
  // - Each application row needs `domicile_district_id` + `domicile_district_name`.
  //   (Currently the shortlisted endpoint does not return these — once it
  //   does, auto mode lights up. Until then auto mode shows a clear warning.)
  // - Each exam center row needs `district_id` and `capacity`.
  const buildAllocation = useCallback((allowCrossDistrict) => {
    // Prepare centers list with remaining capacity
    const centersList = centers.map((c) => ({
      // Prefer the numeric id (validated as `integer|exists:exam_centers,id`
      // by the backend today). Fall back to hash_id for environments where the
      // exam-centers API doesn't expose a numeric id — works once the backend's
      // hash_id-decode in prepareForValidation() is deployed.
      id:        c.id ?? c.hash_id,
      name:      c.name,
      district:  c.district?.name || c.district_name || '—',
      district_id: c.district_id ?? c.district?.id ?? null,
      city:      c.city,
      capacity:  Number(c.capacity) || 0,
      remaining: Number(c.capacity) || 0,
    }));

    // Buckets are keyed by center id so we can later submit one batch per center.
    const buckets = new Map();
    const unallocated = [];
    const crossDistrictOverflowByDistrict = new Map();

    const assignToCenter = (center, app) => {
      if (!buckets.has(center.id)) {
        buckets.set(center.id, { centerId: center.id, centerName: center.name, district: center.district, apps: [] });
      }
      buckets.get(center.id).apps.push(app);
      center.remaining -= 1;
    };

    // Handle different allocation modes
    if (allocationMode === 'preferred') {
      // Preferred mode: use candidate's preferred exam cities in order
      applications.forEach((app) => {
        let target = null;
        const preferredCities = app.preferred_exam_cities ?? [];
        
        // Try each preferred city in order
        for (const city of preferredCities) {
          target = centersList.find((c) => 
            c.remaining > 0 && 
            c.city && 
            c.city.toLowerCase() === city.toLowerCase()
          );
          if (target) break;
        }

        // If no preferred city found or full, try any remaining center
        if (!target) {
          target = centersList.find((c) => c.remaining > 0);
        }

        // If still no center, add to unallocated
        if (target) {
          assignToCenter(target, app);
        } else {
          unallocated.push(app);
        }
      });
    } else if (allocationMode === 'auto') {
      // Auto mode: group by domicile district, but if centers don't have district info, treat it as a single pool
      // Index centers by district
      const centersByDistrict = new Map();
      let hasDistrictInfo = false;
      centersList.forEach((c) => {
        const districtId = c.district_id;
        if (districtId != null) {
          hasDistrictInfo = true;
          if (!centersByDistrict.has(districtId)) centersByDistrict.set(districtId, []);
          centersByDistrict.get(districtId).push(c);
        }
      });

      if (!hasDistrictInfo) {
        // No district info on centers, treat all centers as one pool, no district restrictions
        applications.forEach((app) => {
          const target = centersList.find((c) => c.remaining > 0);
          if (target) {
            assignToCenter(target, app);
          } else {
            unallocated.push(app);
          }
        });
      } else {
        // Group candidates by domicile district
        const candidatesByDistrict = new Map();
        applications.forEach((a) => {
          const districtId = a.domicile_district_id ?? a.domicile?.id ?? null;
          if (!candidatesByDistrict.has(districtId)) candidatesByDistrict.set(districtId, []);
          candidatesByDistrict.get(districtId).push(a);
        });

        // Pass 1: assign each candidate to a center in their own district
        candidatesByDistrict.forEach((apps, districtId) => {
          const districtCenters = centersByDistrict.get(districtId) ?? [];
          apps.forEach((app) => {
            // pick first center in this district with remaining capacity
            const target = districtCenters.find((c) => c.remaining > 0);
            if (target) {
              assignToCenter(target, app);
            } else if (districtId == null) {
              // No domicile district, try any center
              const anyTarget = centersList.find((c) => c.remaining > 0);
              if (anyTarget) {
                assignToCenter(anyTarget, app);
              } else {
                unallocated.push(app);
              }
            } else {
              // Whole district is full → spillover
              if (!crossDistrictOverflowByDistrict.has(districtId)) {
                crossDistrictOverflowByDistrict.set(districtId, {
                  districtId,
                  districtName: app.domicile_district_name || app.domicile?.name || 'No Domicile',
                  apps: [],
                });
              }
              crossDistrictOverflowByDistrict.get(districtId).apps.push(app);
            }
          });
        });

        // Pass 2: if cross-district allowed, place overflow in any center with remaining capacity
        if (allowCrossDistrict) {
          const remainingCenters = [];
          centersByDistrict.forEach((list) => list.forEach((c) => { if (c.remaining > 0) remainingCenters.push(c); }));
          crossDistrictOverflowByDistrict.forEach(({ apps }) => {
            apps.forEach((app) => {
              const target = remainingCenters.find((c) => c.remaining > 0);
              if (target) {
                assignToCenter(target, app);
              } else {
                unallocated.push(app);
              }
            });
          });
        } else {
          // not allowed → all overflow goes to "needs manual allocation"
          crossDistrictOverflowByDistrict.forEach(({ apps }) => apps.forEach((a) => unallocated.push(a)));
        }
      }
    }

    return {
      buckets: Array.from(buckets.values()),
      unallocated,
      overflowDistricts: Array.from(crossDistrictOverflowByDistrict.values()),
    };
  }, [applications, centers, allocationMode]);

  // Recompute the allocation preview whenever inputs change
  useEffect(() => {
    if (allocationMode === 'manual') {
      setAllocationPreview(null);
      setCrossDistrictPrompt(null);
      return;
    }
    const initial = buildAllocation(crossDistrictAllowed === true);
    setAllocationPreview(initial);

    if (allocationMode === 'auto' && initial.overflowDistricts.length > 0 && crossDistrictAllowed === null) {
      const first = initial.overflowDistricts[0];
      setCrossDistrictPrompt({
        districts: initial.overflowDistricts,
        overflowCount: initial.overflowDistricts.reduce((s, d) => s + d.apps.length, 0),
        firstName: first.districtName,
      });
    } else {
      setCrossDistrictPrompt(null);
    }
  }, [allocationMode, crossDistrictAllowed, buildAllocation]);

  const handleGenerate = async () => {
    if (!formData.prefix?.trim())  { toast.error('Enter a roll number prefix'); return; }
    if (!formData.starting_number) { toast.error('Enter a starting number'); return; }

    // ─── AUTO MODE OR PREFERRED MODE ───
    if (allocationMode === 'auto' || allocationMode === 'preferred') {
      if (!allocationPreview || allocationPreview.buckets.length === 0) {
        toast.error('No candidates could be allocated.');
        return;
      }
      if (allocationPreview.unallocated.length > 0) {
        if (allocationMode === 'auto' && crossDistrictAllowed !== false) {
          toast.error('Some candidates are still unallocated — decide cross-district permission first');
          return;
        } else if (allocationMode === 'preferred') {
          toast.error('Some candidates could not be allocated — switch to manual mode');
          return;
        }
      }
      setGenerating(true);
      const allSlips  = [];
      let totalCount  = 0;
      let nextNumber  = Number(formData.starting_number);
      try {
        // Submit one batch per center bucket so the existing backend endpoint
        // (single exam_center_id per call) still works. The starting number is
        // bumped per batch so roll numbers stay globally unique.
        for (const bucket of allocationPreview.buckets) {
          const body = {
            application_numbers: bucket.apps.map((a) => a.application_number ?? a.id),
            exam_center_id:      bucket.centerId,
            prefix:              formData.prefix.trim(),
            starting_number:     nextNumber,
            format:              formData.format,
            exam_date:           formData.exam_date || null,
            attendance_time:     formData.attendance_time ? formatTime12h(formData.attendance_time) : null,
          };
          const r = await RollNumberApi.generateSlips(body);
          const generated = r.data?.generated_count ?? bucket.apps.length;
          totalCount += generated;
          nextNumber += generated;
          if (Array.isArray(r.data?.slips)) allSlips.push(...r.data.slips);
        }
        toast.success(`Generated ${totalCount} roll number slip${totalCount === 1 ? '' : 's'} across ${allocationPreview.buckets.length} center${allocationPreview.buckets.length === 1 ? '' : 's'}`);
        setResult({ count: totalCount, slips: allSlips });
      } catch (err) {
        toast.error(err?.message || 'Allocation failed mid-batch');
      } finally {
        setGenerating(false);
      }
      return;
    }

    // ─── MANUAL MODE (legacy single-center) ───
    if (!formData.exam_center_id) { toast.error('Choose an exam center'); return; }

    setGenerating(true);
    try {
      const body = {
        application_numbers: applicationNumbers,
        exam_center_id:      formData.exam_center_id,
        prefix:              formData.prefix.trim(),
        starting_number:     Number(formData.starting_number),
        format:              formData.format,
        exam_date:           formData.exam_date || null,
        attendance_time:     formData.attendance_time ? formatTime12h(formData.attendance_time) : null,
      };
      const r = await RollNumberApi.generateSlips(body);
      toast.success('Roll number slips generated successfully');
      setResult({
        count: r.data?.generated_count ?? 0,
        slips: r.data?.slips ?? [],
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to generate slips');
    } finally {
      setGenerating(false);
    }
  };

  const downloadSlip = useCallback(async (applicationNumber) => {
    const tid = toast.loading('Preparing slip PDF…');
    try {
      const res = await RollNumberApi.downloadSlip(applicationNumber);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.dismiss(tid);
        toast.error(err.message || 'Failed to download slip');
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `AdmissionSlip_${applicationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.dismiss(tid);
      toast.success('Slip downloaded successfully');
    } catch {
      toast.dismiss(tid);
      toast.error('Could not download slip');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <InlineLoader text="Loading exam centers…" variant="ring" size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <button onClick={() => navigate('/dashboard/roll-numbers')}
          className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Roll Number Management
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg"><Hash size={22} className="text-emerald-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Center Allocation &amp; Roll Number Format</h1>
            <p className="text-sm text-slate-500 mt-1">
              Generating slips for <strong>{applications.length}</strong> shortlisted candidate{applications.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Users size={24} className="text-blue-700" />
              <div><p className="text-xs text-blue-700 font-medium">Selected Candidates</p><h2 className="text-xl font-bold text-blue-900">{applications.length}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 size={24} className="text-emerald-700" />
              <div><p className="text-xs text-emerald-700 font-medium">Available Centers</p><h2 className="text-xl font-bold text-emerald-900">{centers.length}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-violet-700" />
              <div><p className="text-xs text-violet-700 font-medium">Generated</p><h2 className="text-xl font-bold text-violet-900">{result?.count ?? 0}</h2></div>
            </CardContent>
          </Card>
        </div>

        {!result && (
          <>
            {/* MODE TOGGLE */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <span className="font-semibold text-slate-700 text-sm">Allocation Mode:</span>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <label
                  className={`flex items-start gap-2 cursor-pointer text-sm rounded-lg border px-3 py-2.5 transition-colors ${
                    allocationMode === 'manual'
                      ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-300'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="allocation_mode"
                    value="manual"
                    checked={allocationMode === 'manual'}
                    onChange={() => { setAllocationMode('manual'); setCrossDistrictAllowed(null); }}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>
                    <span className="font-medium text-emerald-950">Manual</span>
                    <span className="block text-slate-500 text-xs">(one center for all selected)</span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-2 cursor-pointer text-sm rounded-lg border px-3 py-2.5 transition-colors ${
                    allocationMode === 'auto'
                      ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-300'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="allocation_mode"
                    value="auto"
                    checked={allocationMode === 'auto'}
                    onChange={() => { setAllocationMode('auto'); setCrossDistrictAllowed(null); }}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>
                    <span className="font-medium text-emerald-950">Auto-allocate by District</span>
                    <span className="block text-slate-500 text-xs">(group by candidate domicile, fill centers by capacity)</span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-2 cursor-pointer text-sm rounded-lg border px-3 py-2.5 transition-colors ${
                    allocationMode === 'preferred'
                      ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-300'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="allocation_mode"
                    value="preferred"
                    checked={allocationMode === 'preferred'}
                    onChange={() => { setAllocationMode('preferred'); setCrossDistrictAllowed(null); }}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>
                    <span className="font-medium text-emerald-950">Candidate Prefer City</span>
                    <span className="block text-slate-500 text-xs">(use candidate's preferred cities in order, fallback to any remaining)</span>
                  </span>
                </label>
              </div>
            </div>

            {/* ALLOCATION PREVIEW */}
            {(allocationMode === 'auto' || allocationMode === 'preferred') && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 className="font-semibold text-slate-800 mb-3">
                  {allocationMode === 'auto' ? 'District-Based' : 'Candidate Preferred City'} Allocation Preview
                </h2>

                {allocationMode === 'auto' && (!applications[0]?.domicile_district_id && !applications[0]?.domicile?.id) && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle size={18} className="text-amber-700 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-800">
                      Candidate domicile data is not present in the selected rows.
                      Auto-allocation requires the backend's shortlisted endpoint to include
                      <code className="bg-amber-100 px-1 mx-1 rounded">domicile_district_id</code>.
                      Until then, switch to Manual mode or Candidate Preferred City mode.
                    </div>
                  </div>
                )}

                {allocationPreview && (
                  <>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg mb-3">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-slate-700">Center</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-700">City</th>
                            <th className="text-right px-3 py-2 font-semibold text-slate-700">Capacity</th>
                            <th className="text-right px-3 py-2 font-semibold text-slate-700">Assigned</th>
                            <th className="text-right px-3 py-2 font-semibold text-slate-700">Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allocationPreview.buckets.map((b) => {
                            const center = centers.find((c) => (c.id ?? c.hash_id) === b.centerId);
                            const cap    = Number(center?.capacity) || 0;
                            return (
                              <tr key={b.centerId} className="border-t border-slate-100">
                                <td className="px-3 py-2 font-medium text-slate-800">{b.centerName}</td>
                                <td className="px-3 py-2 text-slate-600">{center?.city || '—'}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{cap || '—'}</td>
                                <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{b.apps.length}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{cap ? Math.max(cap - b.apps.length, 0) : '—'}</td>
                              </tr>
                            );
                          })}
                          {allocationPreview.buckets.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500 italic">No candidates allocated yet</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {allocationPreview.unallocated.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-2">
                        <AlertTriangle size={18} className="text-red-700 mt-0.5 shrink-0" />
                        <div className="text-sm text-red-800">
                          <strong>{allocationPreview.unallocated.length}</strong> candidate{allocationPreview.unallocated.length === 1 ? '' : 's'} could not be allocated automatically.
                          Switch to Manual mode to assign them, or free up capacity.
                        </div>
                      </div>
                    )}

                    {allocationMode === 'auto' && crossDistrictAllowed === true && allocationPreview.overflowDistricts.length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        Cross-district spillover is enabled — overflow candidates were placed in centers outside their domicile district.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ALLOCATION FORM */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="font-semibold text-slate-800 mb-4">Allocation Settings</h2>

              {allocationMode === 'manual' && (
                <TextField select fullWidth required label="Exam Center" margin="normal" size="small"
                  name="exam_center_id" value={formData.exam_center_id} onChange={handleFormChange}>
                  <MenuItem key="none" value="">— Select center —</MenuItem>
                  {centers.map((c) => {
                    const capacity = Number(c.capacity) || 0;
                    // Prefer numeric id (works with current backend validation);
                    // fall back to hash_id once the backend decodes hash ids too.
                    const value = c.id != null ? String(c.id) : c.hash_id;
                    return (
                      <MenuItem key={value} value={value}>
                        {c.name} {c.city ? `(${c.city})` : ''}
                        {capacity > 0 ? ` — capacity ${capacity}` : ''}
                      </MenuItem>
                    );
                  })}
                </TextField>
              )}

              {allocationMode === 'auto' && (
                <div className="mb-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  Center assignment is determined by the allocation table above, not by this form.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TextField fullWidth required label="Roll Number Prefix" margin="normal" size="small"
                  name="prefix" value={formData.prefix} onChange={handleFormChange}
                  helperText="e.g. AJK → AJK-001001" />
                <TextField fullWidth required type="number" inputProps={{ min: 1 }}
                  label="Starting Number" margin="normal" size="small"
                  name="starting_number" value={formData.starting_number} onChange={handleFormChange} />
                <TextField select fullWidth label="Format" margin="normal" size="small"
                  name="format" value={formData.format} onChange={handleFormChange}>
                  <MenuItem key="sequential" value="sequential">Sequential (1001, 1002, 1003 …)</MenuItem>
                  <MenuItem key="random" value="random">Random (shuffled within range)</MenuItem>
                </TextField>
              </div>

              <div className="mt-2 pt-3 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Exam Schedule (printed on slip)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField fullWidth type="date" label="Exam Date" margin="normal" size="small"
                    InputLabelProps={{ shrink: true }}
                    name="exam_date" value={formData.exam_date} onChange={handleFormChange}
                    helperText="Day name is derived automatically (e.g. Sunday)" />
                  <TextField fullWidth type="time" label="Attendance Time" margin="normal" size="small"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }}
                    name="attendance_time" value={formData.attendance_time} onChange={handleFormChange}
                    helperText={formData.attendance_time
                      ? `Will print as: ${formatTime12h(formData.attendance_time)}`
                      : 'Time candidates must arrive at the centre (5-minute steps)'} />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" size="md" onClick={() => navigate('/dashboard/roll-numbers')} disabled={generating}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleGenerate} disabled={generating}
                  className="flex items-center gap-2">
                  <Send size={14} /> {generating ? 'Generating…' : 'Generate Slips'}
                </Button>
              </div>
            </div>

            {/* SELECTED CANDIDATES */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-slate-800 mb-4">Selected Candidates ({applications.length})</h2>
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold w-12">#</th>
                      <th className="text-left px-3 py-2 font-semibold">Ref ID</th>
                      <th className="text-left px-3 py-2 font-semibold">Candidate</th>
                      <th className="text-left px-3 py-2 font-semibold">CNIC</th>
                      <th className="text-left px-3 py-2 font-semibold">Advertisement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((a, i) => (
                      <tr key={a.application_number ?? a.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs">{a.application_number}</td>
                        <td className="px-3 py-2">{a.applicant_name || a.candidate_name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{a.cnic || a.candidate_cnic || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{a.advertisement_no || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* RESULT VIEW */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={24} className="text-emerald-600" />
              <h2 className="font-bold text-lg text-slate-800">Slips Generated</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {result.count} roll number slip{result.count === 1 ? '' : 's'} generated successfully.
            </p>
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Ref ID</th>
                    <th className="text-left px-3 py-2 font-semibold">Candidate</th>
                    <th className="text-left px-3 py-2 font-semibold">Roll Number</th>
                    <th className="text-left px-3 py-2 font-semibold">Center</th>
                    <th className="text-left px-3 py-2 font-semibold">Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {result.slips.map((s) => (
                    <tr key={s.application_number} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs">{s.application_number}</td>
                      <td className="px-3 py-2">{s.candidate_name}</td>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-700">{s.roll_number}</td>
                      <td className="px-3 py-2 text-slate-600">{s.exam_center}{s.exam_city ? ` — ${s.exam_city}` : ''}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => downloadSlip(s.application_number)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded font-medium">
                          <Download size={12}/> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => navigate('/dashboard/roll-numbers')}>
                Back to List
              </Button>
              <Button variant="primary" size="md"
                onClick={() => result.slips.forEach((s) => downloadSlip(s.application_number))}
                className="flex items-center gap-2">
                <Download size={14}/> Download All
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Cross-district overflow permission dialog (#5) */}
      <Dialog
        open={!!crossDistrictPrompt}
        onClose={() => { /* keep open until user decides */ }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-bold flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-600" />
          District Capacity Exceeded
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-700 mb-2">
            All exam centers in <strong>{crossDistrictPrompt?.firstName}</strong>
            {crossDistrictPrompt?.districts?.length > 1 && <> (and {crossDistrictPrompt.districts.length - 1} other district{crossDistrictPrompt.districts.length - 1 === 1 ? '' : 's'})</>}
            {' '}are full.
          </p>
          <p className="text-sm text-slate-700 mb-2">
            <strong>{crossDistrictPrompt?.overflowCount}</strong> candidate{crossDistrictPrompt?.overflowCount === 1 ? '' : 's'} still need a center.
            Allocate them to centers in another district?
          </p>
          <ul className="text-xs text-slate-500 list-disc pl-5 mt-2">
            <li><strong>Yes</strong> — spill over to any center with remaining capacity (no district restriction).</li>
            <li><strong>No</strong> — leave overflow candidates unallocated; manually assign them after generation.</li>
          </ul>
        </DialogContent>
        <DialogActions className="px-4 pb-3 gap-2">
          <button
            onClick={() => { setCrossDistrictAllowed(false); setCrossDistrictPrompt(null); }}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm"
          >
            No — manual allocation
          </button>
          <button
            onClick={() => { setCrossDistrictAllowed(true); setCrossDistrictPrompt(null); }}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm"
          >
            Yes — allow cross-district
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RollSlipGenerator;
