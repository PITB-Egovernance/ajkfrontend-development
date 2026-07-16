import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Award, ArrowLeft, Search, ChevronDown, Filter,
  FileSpreadsheet, ArrowRight, Send, FileText,
  LayoutDashboard, ShieldAlert,
} from 'lucide-react';
import { TextField } from '@mui/material';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import RollNumberApi from 'api/rollNumberApi';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { getJobRouteId } from 'utils/jobMapper';
import { useAuth } from 'context/AuthContext';
import { getUserRole } from 'utils/roleUtils';
import SearchableSelect from 'components/ui/SearchableSelect';

const examTypeMeta = {
  'one-paper-mcqs': { title: 'One Paper MCQs — Results', badge: 'One Paper MCQs', testTypeFilter: (tt) => /mcq/i.test(tt) && !/two/i.test(tt) },
  'two-paper-mcqs': { title: 'Two Paper MCQs — Results', badge: 'Two Paper MCQs', testTypeFilter: (tt) => /mcq/i.test(tt) && /two/i.test(tt) },
  'written-exams':  { title: 'Written Exams — Results',  badge: 'Written Exams',  testTypeFilter: (tt) => /written/i.test(tt) },
  'cce-exams':      { title: 'CCE Exams — Results',      badge: 'CCE Exams',      testTypeFilter: (tt) => /cce/i.test(tt) || /joint.competitive/i.test(tt) || /jce/i.test(tt) },
};

const examCategoryAliases = {
  'one-paper-mcqs': new Set(['one-paper-mcq', 'one-paper-mcqs', 'one_paper_mcq', 'one_paper_mcqs']),
  'two-paper-mcqs': new Set(['two-paper-mcq', 'two-paper-mcqs', 'two_paper_mcq', 'two_paper_mcqs']),
  'written-exams':  new Set(['written-exam', 'written-exams', 'written_exam', 'written_exams']),
  'cce-exams':      new Set(['cce-exam', 'cce-exams', 'cce_exam', 'cce', 'joint-competitive-exam', 'joint_competitive_exam', 'jce']),
};

const confirmWithdraw = () =>
  new Promise((resolve) => {
    let reasonText = '';
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[320px] p-1 text-left">
        <div>
          <p className="font-bold text-slate-800 text-sm">Emergency Withdrawal</p>
          <p className="text-xs text-slate-500 mt-1">Provide a mandatory legal reason for taking these results offline:</p>
        </div>
        <textarea rows={3} placeholder="Enter withdrawal reason..."
          onChange={(e) => { reasonText = e.target.value; }}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.dismiss(t.id); resolve(null); }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={() => {
            const trimmed = reasonText.trim();
            if (!trimmed) { toast.error('Withdrawal reason is mandatory.', { id: 'withdraw-validation' }); return; }
            toast.dismiss(t.id); resolve(trimmed);
          }} className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors">
            Withdraw
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  });

const StatusBadge = ({ status }) => {
  const s = status || 'Pending';
  let badgeClass = 'bg-slate-100 text-slate-500 border border-slate-200';
  let dotClass   = 'bg-slate-400';
  if (s === 'Published' || s === 'PROVISIONAL PUBLISHED') { badgeClass = 'bg-purple-50 text-purple-600 border border-purple-100'; dotClass = 'bg-purple-600'; }
  else if (s === 'FINAL PUBLISHED')   { badgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100'; dotClass = 'bg-indigo-600'; }
  else if (s === 'GAZETTE PUBLISHED') { badgeClass = 'bg-pink-50 text-pink-600 border border-pink-100'; dotClass = 'bg-pink-600'; }
  else if (s === 'Approved' || s === 'APPROVED') { badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100'; dotClass = 'bg-emerald-600'; }
  else if (s === 'Under Verification' || s === 'PENDING IMPORT') { badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100'; dotClass = 'bg-amber-600'; }
  else if (s === 'Uploaded')  { badgeClass = 'bg-blue-50 text-blue-600 border border-blue-100'; dotClass = 'bg-blue-600'; }
  else if (s === 'WITHDRAWN') { badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100'; dotClass = 'bg-rose-600'; }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 ${badgeClass}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />{s}
    </span>
  );
};

const PortalDropdown = ({ anchorRef, open, onClose, children }) => {
  const [style, setStyle] = useState({});

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownH  = 260; // approximate max height of the menu
    if (spaceBelow < dropdownH) {
      setStyle({ position: 'fixed', bottom: window.innerHeight - rect.top, right: window.innerWidth - rect.right, minWidth: rect.width });
    } else {
      setStyle({ position: 'fixed', top: rect.bottom + 4, right: window.innerWidth - rect.right, minWidth: rect.width });
    }
  }, [open, anchorRef]);

  if (!open) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div style={{ ...style, zIndex: 9999 }}
        className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-1 text-left animate-in fade-in zoom-in-95 duration-100">
        {children}
      </div>
    </>,
    document.body
  );
};

const ActionCell = ({ job, rId, examType, isPublishedState, isImportable, isShortlistable, isInterviewAllowed, isWithdrawable, onWithdraw, onGazette, activeId, setActiveId }) => {
  const btnRef = useRef(null);
  const open   = activeId === rId;
  return (
    <div className="flex justify-end">
      <button ref={btnRef} type="button"
        onClick={(e) => { e.stopPropagation(); setActiveId(open ? null : rId); }}
        className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5">
        Actions <ChevronDown size={14} className="text-slate-400" />
      </button>
      <PortalDropdown anchorRef={btnRef} open={open} onClose={() => setActiveId(null)}>
        {isImportable ? (
          <Link to={`/dashboard/results/import/${rId}?examType=${examType || ''}`} onClick={() => setActiveId(null)}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded transition-colors">
            <FileSpreadsheet size={14} className="text-slate-400" /> Import Marks (CSV)
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-400 cursor-not-allowed opacity-50">
            <FileSpreadsheet size={14} /> Import Marks (CSV)
          </div>
        )}
        <Link to={`/dashboard/results/view/${rId}`} onClick={() => setActiveId(null)}
          className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded transition-colors">
          <ArrowRight size={14} className="text-slate-400" /> Manage Results
        </Link>
        {isShortlistable ? (
          <Link to={`/dashboard/results/shortlist/${rId}`} onClick={() => setActiveId(null)}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded transition-colors">
            <Send size={14} className="text-slate-400" /> Prepare Shortlist
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-400 cursor-not-allowed opacity-50">
            <Send size={14} /> Prepare Shortlist
          </div>
        )}
        <div className="my-1 border-t border-slate-100" />
        {isPublishedState ? (
          <button onClick={() => { setActiveId(null); onGazette(job); }}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded transition-colors text-left">
            <FileText size={14} className="text-slate-400" /> Official Gazette
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-400 cursor-not-allowed opacity-50">
            <FileText size={14} /> Official Gazette
          </div>
        )}
        {isInterviewAllowed ? (
          <Link to="/dashboard/award-lists" onClick={() => setActiveId(null)}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded transition-colors">
            <LayoutDashboard size={14} className="text-slate-400" /> Interview Marks
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-400 cursor-not-allowed opacity-50">
            <LayoutDashboard size={14} /> Interview Marks
          </div>
        )}
        {isWithdrawable ? (
          <button onClick={() => { setActiveId(null); onWithdraw(job, rId); }}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer rounded transition-colors text-left">
            <ShieldAlert size={14} className="text-rose-500" /> Withdraw Results
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-50">
            <ShieldAlert size={14} /> Withdraw Results
          </div>
        )}
      </PortalDropdown>
    </div>
  );
};

const ResultsExamFlow = () => {
  const navigate  = useNavigate();
  const { examType } = useParams();
  const meta = examTypeMeta[examType];
  const { user } = useAuth();
  const userRole  = getUserRole(user);
  const isAdmin   = ['admin', 'chairman', 'secretary'].includes(userRole);
  const isDirector = ['director', 'admin', 'chairman', 'secretary'].includes(userRole);

  const [loading, setLoading]           = useState(true);
  const [allJobRows, setAllJobRows]     = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterAdv, setFilterAdv]       = useState('all');
  const [filterDept, setFilterDept]     = useState('all');
  const [filterPost, setFilterPost]     = useState('all');
  const [activeDropdownJobId, setActiveDropdownJobId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const adminHeaders = {
        Accept: 'application/json',
        'X-API-KEY': Config.apiKey,
        Authorization: `Bearer ${AuthService.getToken()}`,
      };

      const [adsResult, testTypesRes] = await Promise.all([
        AdvertisementApi.getAll(1, { per_page: 200, results_only: true }).catch(() => ({})),
        fetch(`${Config.apiUrl}/settings/test-types?per_page=200`, { headers: adminHeaders }).then(r => r.json()).catch(() => ({})),
      ]);

      const testTypeMap   = {};
      const examCategoryMap = {};
      const ttList = testTypesRes?.data?.data ?? testTypesRes?.data ?? [];
      (Array.isArray(ttList) ? ttList : []).forEach(tt => {
        const cat = (tt.exam_category || '').toLowerCase().replace(/[\s_]+/g, '-');
        if (tt.hash_id) { testTypeMap[tt.hash_id] = tt.name || ''; examCategoryMap[tt.hash_id] = cat; }
        if (tt.id)      { testTypeMap[String(tt.id)] = tt.name || ''; examCategoryMap[String(tt.id)] = cat; }
      });

      const allAds = adsResult?.data?.data ?? adsResult?.data ?? [];
      const validCategories = examCategoryAliases[examType] ?? new Set([examType]);

      const matchedAds = allAds
        .map((ad) => {
          const jobs = (ad.job_details || []).filter((job) => {
            const pivotHt  = String(job.pivot?.test_type || '');
            const jobHt    = String(job.test_type || '');
            const pivotCat = (job.pivot?.test_type_exam_category || examCategoryMap[pivotHt] || '').toLowerCase().replace(/[\s_]+/g, '-');
            const jobCat   = (job.resolved_test_type_exam_category || examCategoryMap[jobHt] || '').toLowerCase().replace(/[\s_]+/g, '-');
            if (pivotCat && validCategories.has(pivotCat)) return true;
            if (jobCat   && validCategories.has(jobCat))   return true;
            const resolved = job.pivot?.test_type_name || job.resolved_test_type_name || testTypeMap[pivotHt] || testTypeMap[jobHt] || job.test_type || '';
            return resolved ? meta.testTypeFilter(resolved) : false;
          });
          if (jobs.length === 0) return null;
          return { ad, jobs };
        })
        .filter(Boolean);

      const adsToUse = matchedAds.length > 0
        ? matchedAds
        : allAds.map((ad) => ({ ad, jobs: ad.job_details || [] }));

      setAllJobRows(
        adsToUse.flatMap(({ ad, jobs }) =>
          jobs.map((job) => ({ ...job, adv: ad }))
        )
      );
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [examType, meta]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWithdraw = async (job, rId) => {
    const reason = await confirmWithdraw();
    if (!reason) return;
    try {
      toast.loading('Withdrawing publication...', { id: 'withdraw' });
      await ResultsApi.withdraw(rId, reason);
      toast.success('Publication withdrawn', { id: 'withdraw' });
      fetchData();
    } catch { toast.error('Withdrawal failed', { id: 'withdraw' }); }
  };

  const handleDownloadGazette = async (job) => {
    try {
      toast.loading('Generating Official Gazette...', { id: 'gazette-task' });
      const blob = await ResultsApi.downloadGazette(getJobRouteId(job));
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `Gazette_${(job.designation || 'Result').replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Gazette downloaded successfully!', { id: 'gazette-task' });
    } catch {
      toast.error('Failed to generate Gazette', { id: 'gazette-task' });
    }
  };

  const advOptions = useMemo(() =>
    [...new Map(allJobRows.map((j) => [j.adv?.hash_id || j.adv?.id, j.adv])).values()]
      .filter(Boolean)
      .map((ad) => ({ value: ad.hash_id || String(ad.id), label: `#${ad.adv_number}` })),
    [allJobRows]);

  const deptOptions = useMemo(() =>
    [...new Set(allJobRows.map((j) => j.department_label || j.department).filter(Boolean))].sort()
      .map((d) => ({ value: d, label: d })),
    [allJobRows]);

  const postOptions = useMemo(() =>
    [...new Map(allJobRows.map((j) => [j.hash_id || String(j.id), j.designation])).entries()]
      .map(([id, label]) => ({ value: id, label })),
    [allJobRows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return allJobRows.filter((job) => {
      const advId = job.adv?.hash_id || String(job.adv?.id || '');
      if (filterAdv  !== 'all' && advId !== filterAdv) return false;
      const dept = job.department_label || job.department || '';
      if (filterDept !== 'all' && dept !== filterDept) return false;
      const postId = job.hash_id || String(job.id || '');
      if (filterPost !== 'all' && postId !== filterPost) return false;
      if (q) return (job.designation || '').toLowerCase().includes(q) || (job.adv?.adv_number || '').toLowerCase().includes(q);
      return true;
    });
  }, [allJobRows, searchTerm, filterAdv, filterDept, filterPost]);

  const columns = useMemo(() => [
    {
      field: 'advertisement',
      headerName: 'Advertisement',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <div className="py-2">
          <p className="text-xs font-semibold text-slate-500 mb-0.5">#{params.row.adv?.adv_number}</p>
          <p className="text-xs text-slate-400">{params.row.adv?.title || 'General Recruitment'}</p>
        </div>
      )
    },
    {
      field: 'designation',
      headerName: 'Job Designation',
      flex: 2,
      minWidth: 250,
      renderCell: (params) => (
        <div className="py-2">
          <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-650 transition-colors">
            {params.row.designation}
          </p>
          <p className="text-xs text-slate-400">Scale: BPS-{params.row.scale}</p>
        </div>
      )
    },
    {
      field: 'result_status',
      headerName: 'Current Stage',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => <StatusBadge status={params.value} />
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const job = params.row;
        const rId = getJobRouteId(job);
        const isPublishedState   = ['Published', 'PROVISIONAL PUBLISHED', 'FINAL PUBLISHED', 'GAZETTE PUBLISHED'].includes(job.result_status);
        const isImportable       = !isPublishedState;
        const isShortlistable    = ['Approved', 'APPROVED', 'WITHDRAWN'].includes(job.result_status);
        const isInterviewAllowed = isPublishedState && (isAdmin || isDirector || ['data_entry', 'dataentry', 'senior_admin'].includes(userRole));
        const isWithdrawable     = isPublishedState && (isAdmin || isDirector);

        return (
          <div className="flex items-center h-full">
            <ActionCell job={job} rId={rId} examType={examType}
              isPublishedState={isPublishedState} isImportable={isImportable}
              isShortlistable={isShortlistable} isInterviewAllowed={isInterviewAllowed}
              isWithdrawable={isWithdrawable}
              onGazette={handleDownloadGazette} onWithdraw={handleWithdraw}
              activeId={activeDropdownJobId} setActiveId={setActiveDropdownJobId} />
          </div>
        );
      }
    }
  ], [examType, activeDropdownJobId, isAdmin, isDirector, userRole]);

  if (!meta) {
    return (
      <div className="p-8 text-center text-slate-500">
        Unknown exam type.{' '}
        <button className="text-emerald-700 underline" onClick={() => navigate('/dashboard/results')}>Go back</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <InlineLoader text="Loading jobs…" variant="ring" size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <button onClick={() => navigate('/dashboard/results')}
            className="text-sm text-slate-500 flex items-center gap-1 mb-3 hover:text-slate-700">
            <ArrowLeft size={14} /> Back to Results
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><Award size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{meta.title}</h1>
                <p className="text-sm text-slate-500 mt-0.5">AJK Public Service Commission</p>
              </div>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Job Listings</h2>

          {/* Filters — same layout as Roll Number Exam Flow */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <TextField size="small" label="Search" value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="lg:col-span-3"
              InputProps={{ startAdornment: <Search size={16} className="mr-2 text-slate-400" /> }} />
            <div className="lg:col-span-3">
              <SearchableSelect label="Advertisement" value={filterAdv}
                onChange={(e) => setFilterAdv(e.target.value)} placeholder="All Advertisements"
                options={[{ value: 'all', label: 'All Advertisements' }, ...advOptions]} />
            </div>
            <div className="lg:col-span-3">
              <SearchableSelect label="Department" value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)} placeholder="All Departments"
                options={[{ value: 'all', label: 'All Departments' }, ...deptOptions]} />
            </div>
            <div className="lg:col-span-2">
              <SearchableSelect label="Post" value={filterPost}
                onChange={(e) => setFilterPost(e.target.value)} placeholder="All Posts"
                options={[{ value: 'all', label: 'All Posts' }, ...postOptions]} />
            </div>
            <Button variant="outline" className="h-10 gap-2 bg-white lg:col-span-1"
              onClick={() => { setSearchTerm(''); setFilterAdv('all'); setFilterDept('all'); setFilterPost('all'); }}>
              <Filter size={15} /> Reset
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <TooltipDataGrid
              rows={filteredRows.map((job, idx) => ({
                ...job,
                id: job.hash_id || job.id || `${job.adv?.adv_number}-${idx}`
              }))}
              columns={columns}
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              loading={loading}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                '& .MuiDataGrid-row': { minHeight: '52px !important' }
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResultsExamFlow;
