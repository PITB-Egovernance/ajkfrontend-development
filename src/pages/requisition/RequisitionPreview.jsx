import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { InlineLoader } from 'components/ui/Loader';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'components/ui/Dialog';
import { CheckCircle2, Printer } from 'lucide-react';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import RequisitionApi from 'api/requisitionApi';
import toast from 'react-hot-toast';
import { extractFilePath, persistDraftFilePath, getPersistedDraftFilePath, clearPersistedDraftFiles } from 'utils';

const RequisitionPreview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tempId = searchParams.get('temp_id');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showServiceRuleDialog, setShowServiceRuleDialog] = useState(false);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [previewData, setPreviewData] = useState({
    step1: {},
    step2: {},
    step3: {},
    serviceRule:{},
    syllabus:{},
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;
  const getDocumentUrl = (path) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    return `https://api-admin-ajkpsc.punjab.gov.pk/${String(path).replace(/^\/+/, "")}`;
  };

  useEffect(() => {
      fetchDistricts();
      fetchGrades();
      fetchDepartments();
    if (!tempId) {
      toast.error('No temporary data found');
      navigate('/dashboard/requisitions');
      return;
    }
    loadPreviewData();
  }, [tempId]);

  // Once the preview has loaded, if no Service Rule file is on record for
  // Step 1, prompt the admin to go back and upload it — Confirm & Save is
  // disabled below until this is resolved.
  useEffect(() => {
    if (!loading && !loadError && !previewData.serviceRule) {
      setShowServiceRuleDialog(true);
    }
  }, [loading, loadError, previewData.serviceRule]);

  const fetchDistricts = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/districts`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();

      if (result.success) {
        setDistrictOptions(
          result.data.data.map((d) => ({
            id: String(d.hash_id),
            name: d.name
          }))
        );
      }
    } catch (err) {
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/grades?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();

      if (result.success || result.status === 200) {
        const list = result.data?.data ?? result.data ?? [];
        setGradeOptions(
          list
            .filter((g) => (g.status ?? 'active') === 'active')
            .map((g) => ({ id: g.hash_id || g.id, name: g.name }))
        );
      }
    } catch (err) {
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/departments?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();

      if (result.success || result.status === 200) {
        const list = result.data?.data ?? result.data ?? [];
        setDepartmentOptions(
          list
            .filter((d) => (d.status ?? 'active') === 'active')
            .map((d) => ({
              id:   d.hash_id || d.id,
              name: d.department_name || d.name,
            }))
        );
      }
    } catch (err) {
    }
  };

  // Resolve a stored scale value (hash_id, number, or string) to the
  // human-readable grade name. Falls back to the raw value if no match.
  const getScaleName = (rawScale) => {
    if (rawScale === null || rawScale === undefined || rawScale === '') return 'N/A';
    if (typeof rawScale === 'object') {
      return rawScale.name || rawScale.hash_id || rawScale.id || 'N/A';
    }
    const str = String(rawScale).trim();
    const matched = gradeOptions.find((g) => g.id === str || g.name === str);
    if (matched) return matched.name;
    return str;
  };


  const getDistrictName = (id) => {
    // Plain name strings (e.g. "Muzaffarabad") — return as-is, since
    // the live API often stores district values as plain names rather
    // than hash_ids.
    if (typeof id === 'string' && id.includes(' ')) {
      return id;
    }
    if (!id) return 'N/A';
    const found = districtOptions.find(d => String(d.id) === String(id));
    return found ? found.name : id;
  };

  // Resolve a stored department value (hash_id, name, or relation object)
  // to the human-readable department name. Falls back to the raw value
  // if no match.
  const getDepartmentName = (rawDept) => {
    if (rawDept === null || rawDept === undefined || rawDept === '') return 'N/A';
    if (typeof rawDept === 'object') {
      return rawDept.name || rawDept.department_name || rawDept.hash_id || rawDept.id || 'N/A';
    }
    const str = String(rawDept).trim();
    const matched = departmentOptions.find(
      (d) => d.id === str || d.name === str
    );
    if (matched) return matched.name;
    return str;
  };

  // Convert snake_case merit_type values to human-readable labels.
  // e.g. "open_merit" → "Open Merit", "quota_wise" → "Quota Wise".
  // Sourced purely from the API — no hardcoded fallback.
  const formatMeritType = (value) => {
    if (!value) return 'N/A';
    return String(value)
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const loadPreviewData = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await RequisitionApi.getPreview(tempId);

      // Handle different response formats
      if (result) {
        const data = result || result;

        const step1Data = data.step1 || {};
        // Workaround for the backend's storeStep() dropping service_rules/
        // syllabus from step1_data on a re-save without a new upload — see
        // BACKEND_FIX_REQUISITION_FILE_DROP.md. Fall back to the path
        // persisted locally when Step 1 was first saved.
        const servicerule = extractFilePath(step1Data.service_rules) || getPersistedDraftFilePath(tempId, 'service_rules');
        const slb = extractFilePath(step1Data.syllabus) || getPersistedDraftFilePath(tempId, 'syllabus');

        setPreviewData({
          step1: step1Data,
          step2: data.step2 || {},
          step3: data.step3 || {},
          serviceRule: servicerule,
          syllabus: slb,
        });
      } else {
        const errorMsg = result?.error || result?.message || 'Failed to load preview data';
        toast.error(errorMsg);
        setLoadError(errorMsg);
      }
    } catch (error) {
      // Laravel's default rate-limit response is HTTP 429 with the message
      // "Too Many Attempts." — surface a friendly, actionable message and a
      // Retry button instead of letting it bubble up as an uncaught error.
      const isRateLimited = error?.status === 429 || /too many attempts/i.test(error?.message || '');
      const message = isRateLimited
        ? "Too many requests — please wait a moment and click Retry."
        : (error?.message || 'Error loading preview data');

      toast.error(message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setShowConfirmDialog(false); // Close dialog

    try {
      const result = await RequisitionApi.confirm(tempId);

      // Check for success
      if (result.success || result.status === 200) {
        const message = result.message || 'Requisition confirmed and saved successfully!';
        toast.success(message, {
          icon: <CheckCircle2 className="text-emerald-500" size={24} />,
          style: { fontWeight: '500' }
        });

        // Carry the resolved service_rules/syllabus paths over to the
        // confirmed requisition's hash_id, so RequisitionDetail can show
        // "View Service Rules"/"View Syllabus" even if the backend's
        // confirm() persisted null for these columns (same root cause as
        // BACKEND_FIX_REQUISITION_FILE_DROP.md — step1_data had already
        // lost the file paths by the time confirm() ran).
        const confirmedHashId = result.data?.job_detail?.job_detail_id;
        if (confirmedHashId) {
          persistDraftFilePath(confirmedHashId, 'service_rules', previewData.serviceRule);
          persistDraftFilePath(confirmedHashId, 'syllabus', previewData.syllabus);
        }

        // Clear the per-step localStorage caches so Back-to-Edit on the
        // confirmed requisition doesn't re-populate stale draft values.
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('step3_draft_') || k.startsWith('step1_draft_') || k.startsWith('step2_draft_')) {
              localStorage.removeItem(k);
            }
          });
          clearPersistedDraftFiles(tempId);
        } catch { /* ignore */ }

        setTimeout(() => {
          navigate('/dashboard/requisitions');
        }, 1500);
      } else {
        const errorMsg = result.error || result.message || 'Failed to confirm requisition';
        toast.error(errorMsg);
      }
    } catch (error) {
      // Provide more specific error messages
      let errorMessage = 'Error confirming requisition';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized. Please login again.';
      } else if (error.status === 404) {
        errorMessage = 'Requisition not found. It may have already been confirmed.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      toast.error(errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <InlineLoader text="Loading preview..." variant="ring" size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <Typography variant="body1" className="mb-4 text-red-600">
          {loadError}
        </Typography>
        <Button variant="contained" onClick={loadPreviewData}>
          Retry
        </Button>
      </div>
    );
  }

  const { step1, step2, step3, serviceRule,syllabus } = previewData;

  const handlePrint = () => {
    document.body.classList.add('printing-preview');
    window.print();
    document.body.classList.remove('printing-preview');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow" id="requisition-preview">
      <style>{`
        @media print {
          body.printing-preview * { visibility: hidden; }
          body.printing-preview #requisition-preview,
          body.printing-preview #requisition-preview * { visibility: visible; }
          body.printing-preview #requisition-preview { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          body.printing-preview .no-print { display: none !important; }
        }
      `}</style>
      <Typography variant="h5" className="font-semibold mb-6 text-center">
        Requisition Preview
      </Typography>

      {/* Job Details Card */}
      <Card className="mb-4">
        <CardContent>
          <Typography variant="h6" className="font-semibold mb-3" sx={{ color: '#0B5E3C' }}>
            Job Details
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '250px' }}>Designation</TableCell>
                  <TableCell>{step1.designation || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Scale</TableCell>
                  <TableCell>{getScaleName(step1.scale)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                  <TableCell>{getDepartmentName(step1.department)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Promotion Quota</TableCell>
                  <TableCell>{step1.quota_percentage !== '' && step1.quota_percentage != null ? `${step1.quota_percentage}%` : 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Direct Quota</TableCell>
                  <TableCell>{step1.quota_promotion || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>No. of Posts Requisitioned</TableCell>
                  <TableCell>{step1.num_posts || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date of Availability of Vacancy</TableCell>
                  <TableCell>{step1.vacancy_date || 'N/A'}</TableCell>
                </TableRow>
                {/* <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Test Type</TableCell>
                  <TableCell>{step1.test_type || 'N/A'}</TableCell>
                </TableRow> */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Service Rules</TableCell>
                  <TableCell>
                    {serviceRule ? (
                      <a href={getDocumentUrl(serviceRule)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Service Rules
                      </a>
                    ) : 'No service rule file uploaded yet'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Service Rule (Text)</TableCell>
                  <TableCell style={{ whiteSpace: 'pre-wrap' }}>{step1.service_rules_text || step1.service_rule_text || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Syllabus</TableCell>
                  <TableCell>
                    {syllabus ? (
                      <a href={getDocumentUrl(syllabus)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Syllabus
                      </a>
                    ) : 'No syllabus file uploaded yet'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Criteria Details Card */}
      <Card className="mb-4">
        <CardContent>
          <Typography variant="h6" className="font-semibold mb-3" sx={{ color: '#0B5E3C' }}>
            Criteria Details
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '250px' }}>Required Qualification</TableCell>
                  <TableCell>
                    {(() => {
                      const raw = step2.academic_qualification || '';
                      const qualNames = Array.isArray(raw)
                        ? raw
                        : raw.split(',').map(q => q.trim()).filter(Boolean);
                      if (qualNames.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {qualNames.map((name, idx) => (
                              <span key={idx} className="inline-block bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-sm font-medium">
                                {name}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      return 'N/A';
                    })()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Equivalent Qualification</TableCell>
                  <TableCell>{step2.equivalent_qualification || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Authority Certificate</TableCell>
                  <TableCell>{step2.authority_certificate || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Eligible Degrees</TableCell>
                  <TableCell>
                    {(() => {
                      const raw = step2.degree_equivalence || '';
                      const degreeNames = raw.split(',').map(d => d.trim()).filter(d => d);
                      if (degreeNames.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {degreeNames.map((name, idx) => (
                              <span key={idx} className="inline-block bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-sm font-medium">
                                {name}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      return 'N/A';
                    })()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Any Other Qualification</TableCell>
                  <TableCell>{step2.any_other_qualification || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Training Institute</TableCell>
                  <TableCell>{step2.training_institute || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Experience Type</TableCell>
                  <TableCell>{step2.experience_type || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Experience Length</TableCell>
                  <TableCell>
                    {step2.qualification_experience && Object.keys(step2.qualification_experience).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(step2.qualification_experience).map(([qual, yrs]) => (
                          <span key={qual} className="inline-block bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-sm font-medium">
                            {qual}: {yrs} years
                          </span>
                        ))}
                      </div>
                    ) : (() => {
                      const raw = step2.experience_length || '';
                      const expParts = Array.isArray(raw)
                        ? raw
                        : raw.split(',').map(e => e.trim()).filter(Boolean);
                      if (expParts.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {expParts.map((exp, idx) => (
                              <span key={idx} className="inline-block bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-sm font-medium">
                                {exp}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      return 'N/A';
                    })()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Minimum Qualification</TableCell>
                  <TableCell>
                    {(() => {
                      const raw = step2.min_qualification || '';
                      const qualNames = Array.isArray(raw)
                        ? raw
                        : raw.split(',').map(q => q.trim()).filter(Boolean);
                      if (qualNames.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {qualNames.map((name, idx) => (
                              <span key={idx} className="inline-block bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-sm font-medium">
                                {name}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      return 'N/A';
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Eligibility Details Card */}
      <Card className="mb-4">
        <CardContent>
          <Typography variant="h6" className="font-semibold mb-3" sx={{ color: '#0B5E3C' }}>
            Eligibility Details
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '250px' }}>Minimum Age</TableCell>
                  <TableCell>{step3.min_age || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Maximum Age</TableCell>
                  <TableCell>{step3.max_age || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Age Relaxation</TableCell>
                  <TableCell>{step3.age_relaxation || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Relaxation Reason</TableCell>
                  <TableCell>{step3.relaxation_reason || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Relaxation Years</TableCell>
                  <TableCell>{step3.relaxation_years || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Nationality</TableCell>
                  <TableCell>{step3.nationality || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Other Conditions</TableCell>
                  <TableCell>{step3.other_conditions || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Gender</TableCell>
                  <TableCell>{step3.gender_basis || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Merit Type</TableCell>
                  <TableCell>
                    {formatMeritType(step3.merit_type || step3.selection_mode)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>District/Posts</TableCell>
                  {/* <TableCell>
                    {(() => {
                      // Backend stores district/post arrays as comma-separated
                      // strings (per the user's spec). Also try step3_quota /
                      // step4.quota in case the live preview returns nested objects.
                      const csvToArr = (v) => {
                        if (Array.isArray(v)) return v.map(String);
                        if (v === null || v === undefined || v === '') return [];
                        return String(v).split(',').map((s) => s.trim()).filter(Boolean);
                      };
                      const districts = csvToArr(step3.district).length
                        ? csvToArr(step3.district)
                        : csvToArr(step4.districts);
                      const districtPosts = csvToArr(step3.district_quota_post).length
                        ? csvToArr(step3.district_quota_post)
                        : csvToArr(step3.post).length
                          ? csvToArr(step3.post)
                          : csvToArr(step4.posts);
                      // Promotional posts are stored as a separate array,
                      // indexed to match the district array. Show as a
                      // separate amber pill so the two values are easy
                      // to read at a glance.
                      const promoPosts = csvToArr(step3.promotional_quota_post).length
                        ? csvToArr(step3.promotional_quota_post)
                        : csvToArr(step3.promotional_post);

                      if (districts.length > 0) {
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            {districts.map((d, i) => (
                              <span key={i} className="inline-flex items-center gap-1">
                                <span className="text-slate-700">{getDistrictName(d)}/</span>
                                <span className="inline-block bg-emerald-700 text-white px-2 py-0.5 rounded text-sm font-semibold" title="District Quota Posts">{districtPosts[i] || '-'}</span>
                                {promoPosts[i] && Number(promoPosts[i]) > 0 ? (
                                  <span className="inline-block bg-amber-600 text-white px-2 py-0.5 rounded text-sm font-semibold" title="Promotional Quota Posts">+{promoPosts[i]}</span>
                                ) : null}
                              </span>
                            )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`} className="text-slate-500">,</span>, curr], [])}
                          </div>
                        );
                      }

                      // Open Merit branch: when the user picks "Open Merit"
                      // in Step 3 they don't enter per-district posts, so
                      // `step3.district` / `step3.post` are empty. In that
                      // case fall back to showing the grand-total post
                      // count from Step 1 against a generic "AJK Districts"
                      // label so the preview still shows a meaningful
                      // value instead of N/A.
                      const openMeritTotal = step1?.num_posts;
                      if (openMeritTotal !== null && openMeritTotal !== undefined && openMeritTotal !== '') {
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-700">AJK DISTRICTS /</span>
                              <span className="inline-block bg-emerald-700 text-white px-2 py-0.5 rounded text-sm font-semibold" title="Total Posts from Step 1">{openMeritTotal}</span>
                            </span>
                          </div>
                        );
                      }

                      return 'N/A';
                    })()}
                  </TableCell> */}
                  <TableCell>
                    {(step3.merit_type === 'open_merit' || step3.selection_mode === 'open_merit') && step3.district?.length > 0 ? (
                      <div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {step3.district.map((district, index) => (
                            <span key={index} className="inline-block bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-sm font-medium">
                              {district}
                            </span>
                          ))}
                        </div>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-slate-500 text-sm">Total Posts:</span>
                          <span className="bg-emerald-700 text-white px-2 py-1 rounded text-sm">
                            {step1.num_posts || 0}
                          </span>
                        </span>
                      </div>
                    ) : step3.district?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {step3.district.map((district, index) => (
                          <span key={index} className="inline-flex items-center gap-2">
                            <span className="text-slate-700 font-medium">{district}</span>
                            <span className="bg-emerald-700 text-white px-2 py-1 rounded text-sm">
                              {step3.post?.[index] || 0}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                </TableRow>
                {/* Promotional Posts row — disabled (not currently
                    functional end-to-end with the live backend). */}
                {/* <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Promotional Posts</TableCell>
                  <TableCell>
                    {(() => {
                      const csvToArr = (v) => {
                        if (Array.isArray(v)) return v.map(String);
                        if (v === null || v === undefined || v === '') return [];
                        return String(v).split(',').map((s) => s.trim()).filter(Boolean);
                      };
                      // Show district name + promotional count for each row, so
                      // the user can see which district each value applies to.
                      const districts = csvToArr(step3.district);
                      const promos = csvToArr(step3.promotional_quota_post).length
                        ? csvToArr(step3.promotional_quota_post)
                        : csvToArr(step3.promotional_post);
                      if (promos.length === 0) return 'N/A';
                      return promos.map((p, i) => {
                        // Hide the row if the value is empty or zero (it's optional)
                        if (!p || Number(p) === 0) return null;
                        return (
                          <span key={i} className="inline-flex items-center gap-1 mr-2">
                            <span className="text-slate-700 text-sm">{districts[i] ? getDistrictName(districts[i]) : `Row ${i + 1}`}/</span>
                            <span className="inline-block bg-amber-600 text-white px-2 py-0.5 rounded text-sm font-semibold">{p}</span>
                          </span>
                        );
                      });
                    })()}
                  </TableCell>
                </TableRow> */}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-6 no-print">
        <Button
          variant="outlined"
          onClick={() => navigate(`/dashboard/requisitions/create?temp_id=${tempId}`)}
          sx={{ borderColor: '#6b7280', color: '#6b7280' }}
        >
          Back to Edit
        </Button>
        <Button
          variant="outlined"
          onClick={handlePrint}
          startIcon={<Printer size={18} />}
          sx={{ borderColor: '#0B5E3C', color: '#0B5E3C' }}
        >
          Print
        </Button>
        <Button
          variant="contained"
          onClick={() => setShowConfirmDialog(true)}
          disabled={confirming || !serviceRule}
          title={!serviceRule ? 'Service Rule file is required — go back to Step 1 and upload it to continue' : undefined}
          sx={{ backgroundColor: '#0B5E3C', '&:hover': { backgroundColor: '#084a2e' } }}
        >
          {confirming ? 'Confirming...' : 'Confirm & Save'}
        </Button>
      </div>

      {!serviceRule && !confirming && (
        <Typography variant="body2" className="text-center mt-2 text-red-600">
          Service Rule file is missing. Please go back to Step 1 and upload the Service Rule to enable Confirm & Save.
        </Typography>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-emerald-900">
              Confirm Requisition
            </DialogTitle>
            <DialogDescription className="text-base pt-4 text-gray-700">
              Are you sure you want to confirm and save this requisition? This action will finalize the requisition and it will be submitted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button
              variant="outlined"
              onClick={() => setShowConfirmDialog(false)}
              disabled={confirming}
              sx={{ borderColor: '#6b7280', color: '#6b7280' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={confirming}
              sx={{ backgroundColor: '#0B5E3C', '&:hover': { backgroundColor: '#084a2e' } }}
            >
              {confirming ? 'Confirming...' : 'Yes, Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Rule Missing Dialog */}
      <Dialog open={showServiceRuleDialog} onOpenChange={setShowServiceRuleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-700">
              Service Rule Required
            </DialogTitle>
            <DialogDescription className="text-base pt-4 text-gray-700">
              This requisition cannot be confirmed because no Service Rule file has been uploaded. Please go back to Step 1 and upload the Service Rule file to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button
              variant="outlined"
              onClick={() => setShowServiceRuleDialog(false)}
              sx={{ borderColor: '#6b7280', color: '#6b7280' }}
            >
              Close
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/dashboard/requisitions/create?temp_id=${tempId}&step=1`)}
              sx={{ backgroundColor: '#0B5E3C', '&:hover': { backgroundColor: '#084a2e' } }}
            >
              Go to Step 1
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequisitionPreview;
