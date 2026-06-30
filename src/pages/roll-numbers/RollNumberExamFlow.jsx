import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, Eye, FileCheck2, Filter, Hash, MapPin, Search, Send, Users } from 'lucide-react';
import { MenuItem, TextField } from '@mui/material';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberApi from 'api/rollNumberApi';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const examTypeMeta = {
  'one-paper-mcqs': { title: 'One Paper MCQs Roll Number Management', badge: 'One Paper MCQs', description: 'Club one or multiple posts and generate one common roll number slip per candidate.', papers: ['One Paper'], testTypeFilter: (tt) => /mcq/i.test(tt) && !/two/i.test(tt) },
  'two-paper-mcqs': { title: 'Two Paper MCQs Roll Number Management', badge: 'Two Paper MCQs', description: 'Paper 1 and Paper 2 schedules remain separate, while selected jobs can be clubbed under one roll number.', papers: ['Paper 1', 'Paper 2'], testTypeFilter: (tt) => /mcq/i.test(tt) && /two/i.test(tt) },
  'written-exams': { title: 'Written Exams Roll Number Management', badge: 'Written Exams', description: 'Written exams roll number generation following the same allocation pattern.', papers: ['Written Exam'], testTypeFilter: (tt) => /written/i.test(tt) },
  'cce-exams': { title: 'CCE Exams Roll Number Management', badge: 'CCE Exams', description: 'CCE exams roll number generation following the same allocation pattern.', papers: ['CCE Exam'], testTypeFilter: (tt) => /cce/i.test(tt) },
};

const EXAM_TYPE_MAP = {
  'one-paper-mcqs': ['MCQs', 'MCQ', 'One Paper MCQs', 'one-paper-mcqs'],
  'two-paper-mcqs': ['Two Paper MCQs', 'two-paper-mcqs'],
  'written-exams': ['Written Exam', 'Written', 'written-exams'],
  'cce-exams': ['CCE', 'CCE Exam', 'cce-exams'],
};

const matchesExamType = (pivotTestType, examType, testTypeMap = {}) => {
  if (!pivotTestType) return false;
  const resolved = testTypeMap[String(pivotTestType)] || String(pivotTestType);
  const tt = resolved.toLowerCase();
  const keywords = EXAM_TYPE_MAP[examType] || [];
  return keywords.some((k) => tt.includes(k.toLowerCase()));
};

const StepHeader = ({ number, title, subtitle }) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-sm font-bold text-white">{number}</div>
    <div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;

  const windowSize = 1;
  const pageSet = new Set([0, totalPages - 1]);
  for (let p = Math.max(0, page - windowSize); p <= Math.min(totalPages - 1, page + windowSize); p++) {
    pageSet.add(p);
  }
  const uniquePages = [...pageSet].sort((a, b) => a - b);

  const items = [];
  let prev = null;
  uniquePages.forEach((p) => {
    if (prev !== null && p - prev > 1) items.push(`ellipsis-${p}`);
    items.push(p);
    prev = p;
  });

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      {items.map((item) =>
        typeof item === 'number' ? (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              item === page ? 'bg-emerald-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item + 1}
          </button>
        ) : (
          <span key={item} className="px-1 text-slate-400">…</span>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};


const computeEndTime = (startTime, durationMinutes) => {
  if (!startTime || !durationMinutes) return '';
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const totalMinutes = h * 60 + m + Number(durationMinutes);
  const endH = Math.floor((totalMinutes / 60) % 24);
  const endM = totalMinutes % 60;
  const period = endH >= 12 ? 'PM' : 'AM';
  const hour12 = endH % 12 === 0 ? 12 : endH % 12;
  return `${hour12}:${String(endM).padStart(2, '0')} ${period}`;
};

const RollNumberExamFlow = () => {
  const navigate = useNavigate();
  const { examType = 'one-paper-mcqs' } = useParams();
  const meta = examTypeMeta[examType] || examTypeMeta['one-paper-mcqs'];

  const [stage, setStage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [selectedCenterIds, setSelectedCenterIds] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scheduleDates, setScheduleDates] = useState(() => meta.papers.map(() => ''));
  const [scheduleTimes, setScheduleTimes] = useState(() => meta.papers.map((_, i) => i === 1 ? '14:00' : '10:00'));
  const [scheduleDurations, setScheduleDurations] = useState(() => meta.papers.map((_, i) => i === 1 ? 120 : 90));

  const [advertisements, setAdvertisements] = useState([]);
  const [centers, setCenters] = useState([]);
  const [generatedCandidates, setGeneratedCandidates] = useState([]);
  const [allCandidateApps, setAllCandidateApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAdvertisement, setFilterAdvertisement] = useState('all');
  const [filterPost, setFilterPost] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');

  const [postsPage, setPostsPage] = useState(0);
  const postsPageSize = 10;
  const [centersPage, setCentersPage] = useState(0);
  const centersPageSize = 10;

  const fetchWithTimeout = useCallback((url, options, ms = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }, []);

  const fetchAllCandidateApps = useCallback(async () => {
    try {
      const headers = { Accept: 'application/json', 'X-API-KEY': Config.candidateApiKey };
      const firstRes = await fetchWithTimeout(`${Config.candidateApiUrl}/applications?per_page=100`, { headers });
      const firstJson = await firstRes.json();
      const firstPage = firstJson?.data?.data ?? firstJson?.data ?? [];
      const lastPage = firstJson?.data?.last_page ?? 1;

      let allApps = [...firstPage];
      if (lastPage > 1) {
        const remaining = await Promise.all(
          Array.from({ length: Math.min(lastPage - 1, 9) }, (_, i) =>
            fetchWithTimeout(`${Config.candidateApiUrl}/applications?per_page=100&page=${i + 2}`, { headers })
              .then(r => r.json())
              .then(j => j?.data?.data ?? [])
              .catch(() => [])
          )
        );
        remaining.forEach(page => { allApps = allApps.concat(page); });
      }
      return allApps;
    } catch (err) {
      console.warn('Candidate API fetch failed:', err?.message);
      return [];
    }
  }, [fetchWithTimeout]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const adminHeaders = {
        Accept: 'application/json',
        'X-API-KEY': Config.apiKey,
        Authorization: `Bearer ${AuthService.getToken()}`,
      };
      const candidateHeaders = { Accept: 'application/json', 'X-API-KEY': Config.candidateApiKey };

      const [adsResult, centersResult, testTypesRes, gradesRes, candidateApps, rollNumbersResult] = await Promise.all([
        RollNumberApi.getAdvertisementsWithJobs(200),
        RollNumberApi.getExamCenters(500),
        fetch(`${Config.apiUrl}/settings/test-types?per_page=200`, { headers: adminHeaders }).then(r => r.json()).catch(() => ({})),
        fetch(`${Config.apiUrl}/settings/grades?per_page=200`, { headers: adminHeaders }).then(r => r.json()).catch(() => ({})),
        fetchAllCandidateApps(),
        RollNumberApi.getAdvertisements({ per_page: 200 }).catch(() => ({})),
      ]);

      const testTypeMap = {};
      const ttList = testTypesRes?.data?.data ?? testTypesRes?.data ?? [];
      (Array.isArray(ttList) ? ttList : []).forEach(tt => {
        if (tt.hash_id) testTypeMap[tt.hash_id] = tt.name || '';
        if (tt.id) testTypeMap[String(tt.id)] = tt.name || '';
      });

      const gradeMap = {};
      const gradeList = gradesRes?.data?.data ?? gradesRes?.data ?? [];
      (Array.isArray(gradeList) ? gradeList : []).forEach(g => {
        if (g.hash_id) gradeMap[g.hash_id] = g.name || g.grade_name || '';
        if (g.id) gradeMap[String(g.id)] = g.name || g.grade_name || '';
      });

      // Strictly match candidate applications to admin job posts via ext_adv_id
      // (admin job detail hash). This is the authoritative link — only
      // candidates whose job_post.ext_adv_id equals a post's hash_id are
      // counted as having applied for that specific post.
      const jobPostCountMap = {};
      const candidateAppsAvailable = Array.isArray(candidateApps) && candidateApps.length > 0;
      if (candidateAppsAvailable) {
        candidateApps.forEach(app => {
          const extAdvId = app.job_post?.ext_adv_id || null;
          if (extAdvId) jobPostCountMap[extAdvId] = (jobPostCountMap[extAdvId] || 0) + 1;
        });
      }
      setAllCandidateApps(candidateAppsAvailable ? candidateApps : []);

      const adAppCountMap = {};
      const rnAds = rollNumbersResult?.data?.data ?? rollNumbersResult?.data ?? [];
      (Array.isArray(rnAds) ? rnAds : []).forEach((ad) => {
        const key = ad.hash_id || String(ad.id);
        adAppCountMap[key] = ad.total_applications ?? 0;
      });

      const allAds = adsResult?.data?.data ?? adsResult?.data ?? [];
      const matchedAds = allAds
        .map((ad) => {
          const jobs = (ad.job_details || []).filter((job) => {
            const testType = job.pivot?.test_type || job.test_type || '';
            return matchesExamType(testType, examType, testTypeMap);
          });
          if (jobs.length === 0) return null;
          return { ad, jobs };
        })
        .filter(Boolean);

      const filtered = matchedAds.map(({ ad, jobs }) => {
        const adKey = ad.hash_id || String(ad.id);
        const adTotal = ad.total_applications ?? adAppCountMap[adKey] ?? 0;
        const perPostFallback = jobs.length > 0 ? Math.ceil(adTotal / jobs.length) : 0;

        return {
          id: adKey,
          advertisement: ad.adv_number
            ? (/^advertisement\b/i.test(String(ad.adv_number).trim()) ? String(ad.adv_number).trim() : `Advertisement ${ad.adv_number}`)
            : `Advertisement #${ad.id}`,
          meta: meta.badge,
          posts: jobs.map((job) => {
            const jobId = job.hash_id || String(job.id);
            const deptName = job.department_label || 'N/A';
            const rawScale = gradeMap[job.scale] || job.scale || '';
            const scaleDisplay = rawScale ? (rawScale.toUpperCase().startsWith('BPS') ? rawScale : `BPS-${rawScale}`) : '';
            const candidateCount = jobPostCountMap[jobId] ?? 0;
            return {
              id: jobId,
              post: job.designation || job.post_title || 'Untitled Post',
              caseNo: job.case_number ? `Case ${job.case_number} | ${scaleDisplay}` : scaleDisplay,
              department: deptName,
              applicants: candidateAppsAvailable ? candidateCount : perPostFallback,
              advertisementId: adKey,
            };
          }),
        };
      });

      setAdvertisements(filtered);

      const centerList = centersResult?.data?.data ?? centersResult?.data ?? [];
      setCenters(
        (Array.isArray(centerList) ? centerList : [])
          .filter((c) => (c.status ?? 'active') === 'active')
          .map((c) => ({
            id: c.id != null ? String(c.id) : c.hash_id,
            center: c.name,
            district: c.city || c.district || '',
            capacity: Number(c.capacity) || 0,
          }))
      );
    } catch (err) {
      toast.error(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [examType, meta.badge]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allPosts = useMemo(() => advertisements.flatMap((ad) => ad.posts.map((post) => ({ ...post, advertisement: ad.advertisement, advertisementMeta: ad.meta }))), [advertisements]);
  const selectedPosts = useMemo(() => allPosts.filter((post) => selectedPostIds.includes(post.id)), [allPosts, selectedPostIds]);
  const selectedCenters = useMemo(() => centers.filter((center) => selectedCenterIds.includes(center.id)), [centers, selectedCenterIds]);
  const selectedApplicants = selectedPosts.reduce((sum, post) => sum + (post.applicants || 0), 0);
  const selectedCapacity = selectedCenters.reduce((sum, center) => sum + center.capacity, 0);
  const commonRollNumber = ['one-paper-mcqs', 'two-paper-mcqs'].includes(examType) ? 'MCQ-01-00001' : null;
  const capacityShortage = Math.max(0, selectedApplicants - selectedCapacity);
  const capacityPassed = selectedApplicants > 0 && selectedCapacity >= selectedApplicants;

  const uniqueDepartments = useMemo(() => [...new Set(allPosts.map((p) => p.department).filter(Boolean))], [allPosts]);

  const filteredPosts = useMemo(() => {
    return advertisements.map((ad) => {
      if (filterAdvertisement !== 'all' && ad.id !== filterAdvertisement) return null;
      const posts = ad.posts.filter((post) => {
        if (filterPost !== 'all' && post.id !== filterPost) return false;
        if (filterDepartment !== 'all' && post.department !== filterDepartment) return false;
        if (search && !`${ad.advertisement} ${post.post} ${post.department}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
      if (posts.length === 0) return null;
      return { ...ad, posts };
    }).filter(Boolean);
  }, [advertisements, filterAdvertisement, filterPost, filterDepartment, search]);

  // Flatten to ad+post rows for pagination, then re-group consecutive rows
  // sharing the same advertisement so the rowSpan grouping still renders
  // correctly within each page.
  const flatPostRows = useMemo(() => {
    const rows = [];
    filteredPosts.forEach((ad) => {
      ad.posts.forEach((post) => rows.push({ ad, post }));
    });
    return rows;
  }, [filteredPosts]);

  const postsTotalPages = Math.max(1, Math.ceil(flatPostRows.length / postsPageSize));

  useEffect(() => { setPostsPage(0); }, [filterAdvertisement, filterPost, filterDepartment, search]);

  const pagedGroupedPosts = useMemo(() => {
    const start = postsPage * postsPageSize;
    const pageRows = flatPostRows.slice(start, start + postsPageSize);
    const groups = [];
    pageRows.forEach(({ ad, post }) => {
      const last = groups[groups.length - 1];
      if (last && last.ad.id === ad.id) {
        last.posts.push(post);
      } else {
        groups.push({ ad, posts: [post] });
      }
    });
    return groups;
  }, [flatPostRows, postsPage]);

  const centersTotalPages = Math.max(1, Math.ceil(centers.length / centersPageSize));
  const pagedCenters = useMemo(() => {
    const start = centersPage * centersPageSize;
    return centers.slice(start, start + centersPageSize);
  }, [centers, centersPage]);

  useEffect(() => { setCentersPage(0); }, [centers]);

  const togglePost = (postId) => setSelectedPostIds((current) => current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId]);
  const toggleCenter = (centerId) => setSelectedCenterIds((current) => current.includes(centerId) ? current.filter((id) => id !== centerId) : [...current, centerId]);

  const generateRollNumbers = async () => {
    if (!capacityPassed) return;
    if (selectedCenterIds.length === 0) {
      toast.error('Select at least one exam center');
      return;
    }

    setGenerating(true);
    try {
      // Filter strictly client-side using the cached full candidate list,
      // matching by job_post.ext_adv_id (admin job detail hash) == selected
      // post id. The candidate API's server-side ?job_id= query parameter
      // does NOT reliably filter by individual post — it can return
      // unrelated applications — so it must not be used for generation.
      const selectedPostIdSet = new Set(selectedPosts.map(p => p.id));
      const matchedApps = allCandidateApps.filter(app => {
        const extAdvId = app.job_post?.ext_adv_id || null;
        return extAdvId && selectedPostIdSet.has(extAdvId);
      });

      const seen = new Set();
      const uniqueApps = matchedApps.filter(a => {
        const num = a.application_number;
        if (!num || seen.has(num)) return false;
        seen.add(num);
        return true;
      });

      if (uniqueApps.length === 0) {
        toast.error('No applications found for the selected posts');
        setGenerating(false);
        return;
      }

      // Check admin backend for already-generated roll numbers. If every
      // selected candidate already has one, skip generation entirely and
      // just show the existing slips (view/download only).
      const advIds = [...new Set(selectedPosts.map(p => p.advertisementId))];
      const existingRollMap = {};
      for (const advId of advIds) {
        const result = await RollNumberApi.getApplicationsByAdvertisement(advId, { per_page: 1000 });
        const apps = result?.data?.applications?.data ?? [];
        apps.forEach(a => {
          const roll = a.rollNumber || a.roll_number;
          if (roll?.roll_number) existingRollMap[a.application_number] = roll;
        });
      }

      const newApps = uniqueApps.filter(a => !existingRollMap[a.application_number]);

      if (newApps.length === 0) {
        setGeneratedCandidates(uniqueApps.map(app => {
          const existing = existingRollMap[app.application_number];
          const name = app.snapshot_data?.name || app.candidate?.name || '';
          return {
            id: app.application_number,
            photo: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
            roll: existing?.roll_number,
            name,
            cnic: app.snapshot_data?.cnic || app.candidate?.cnic || '',
            district: '',
            center: existing?.examCenter?.name || existing?.exam_center?.name || '',
          };
        }));
        toast.success('All selected candidates already have roll numbers generated');
        setGenerated(true);
        setStage(3);
        setGenerating(false);
        return;
      }

      const candidates = uniqueApps.map(app => ({
        application_number: app.application_number,
        candidate_name: app.snapshot_data?.name || app.candidate?.name || '',
        candidate_cnic: app.snapshot_data?.cnic || app.candidate?.cnic || '',
        candidate_email: app.snapshot_data?.email || app.candidate?.email || '',
        candidate_mobile: app.snapshot_data?.mobile_number || app.candidate?.mobile_number || '',
        ext_adv_id: app.job_post?.ext_adv_id || '',
        ext_advertisement_id: app.job_post?.ext_advertisement_id || '',
        preferred_exam_cities: (app.preferred_exam_cities || []).map(c => typeof c === 'string' ? c : (c?.city || '')).filter(Boolean),
        personal_details: app.snapshot_data || {},
        // Pass document URLs straight through from the candidate API (already
        // fetched by the browser) so the backend doesn't need its own
        // outbound call to the candidate portal to resolve them later.
        documents: (app.candidate?.documents || []).map(d => ({
          doc_type: d.doc_type || d.type || '',
          file_url: d.file_url || d.url || '',
        })).filter(d => d.doc_type && d.file_url),
      }));

      const centerId = selectedCenterIds[0];
      const prefix = 'AJK';
      // Multi-paper exam types (Two Paper MCQs etc.) schedule each paper
      // separately even though all papers share one roll number — send the
      // full per-paper schedule so the slip can show one row per paper.
      const papers = meta.papers.map((label, index) => ({
        label,
        date: scheduleDates[index] || null,
        time: scheduleTimes[index] || null,
        end_time: computeEndTime(scheduleTimes[index], scheduleDurations[index]) || null,
      })).filter(p => p.date || p.time);

      const body = {
        application_numbers: uniqueApps.map(a => a.application_number),
        candidates,
        exam_center_id: Number(centerId),
        prefix,
        starting_number: 1,
        format: 'sequential',
        exam_date: scheduleDates[0] || null,
        attendance_time: scheduleTimes[0] || null,
        papers: papers.length > 1 ? papers : undefined,
      };

      const result = await RollNumberApi.generateSlips(body);
      const slips = result?.data?.slips ?? [];
      const count = result?.data?.generated_count ?? slips.length;

      setGeneratedCandidates(slips.map((s) => ({
        id: s.application_number,
        photo: (s.candidate_name || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        roll: s.roll_number,
        name: s.candidate_name,
        cnic: s.candidate_cnic || '',
        district: '',
        center: `${s.exam_center || ''}${s.exam_city ? ` ${s.exam_city}` : ''}`,
      })));

      toast.success(`Generated ${count} roll number${count === 1 ? '' : 's'} successfully`);
      setGenerated(true);
      setStage(3);
    } catch (err) {
      toast.error(err?.message || 'Failed to generate roll numbers');
    } finally {
      setGenerating(false);
    }
  };

  // Navigates to a dedicated full-page slip viewer route (in-app, not a
  // modal or a new browser tab) — consistent with how Advertisement detail
  // pages are viewed elsewhere in the app.
  const viewSlip = useCallback((applicationNumber) => {
    navigate(`/dashboard/roll-numbers/slip/${applicationNumber}`);
  }, [navigate]);

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
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
        <InlineLoader text="Loading exam data…" variant="ring" size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto space-y-6" style={{ width: '-webkit-fill-available' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2"><Hash size={24} className="text-emerald-800" /></div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{meta.title}</h1>
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">{meta.badge}</span>
              </div>
              <p className="text-sm text-slate-500">{meta.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={() => navigate('/dashboard/roll-numbers')}><ArrowLeft size={15} /> Back</Button>
            <Button variant="outline" size="sm" className="gap-2 bg-white"><FileCheck2 size={15} /> Save Draft</Button>
          </div>
        </div>

        {advertisements.length === 0 && !loading && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            <AlertTriangle size={16} /> No advertisements found with {meta.badge} test type. Create advertisements with this test type first.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-lg border-blue-200 bg-blue-50"><CardContent className="flex items-center gap-3 p-4"><Users size={24} className="text-blue-700" /><div><p className="text-xs font-semibold text-blue-700">Selected Applicants</p><p className="text-2xl font-bold text-blue-950">{selectedApplicants}</p></div></CardContent></Card>
          <Card className="rounded-lg border-emerald-200 bg-emerald-50"><CardContent className="flex items-center gap-3 p-4"><MapPin size={24} className="text-emerald-700" /><div><p className="text-xs font-semibold text-emerald-700">Selected Capacity</p><p className="text-2xl font-bold text-emerald-950">{selectedCapacity}</p></div></CardContent></Card>
          <Card className="rounded-lg border-violet-200 bg-violet-50"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 size={24} className="text-violet-700" /><div><p className="text-xs font-semibold text-violet-700">Generated</p><p className="text-2xl font-bold text-violet-950">{generated ? generatedCandidates.length : 0}</p></div></CardContent></Card>
        </div>

        {stage !== 3 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {['Select Posts', 'Center Allocation & Generate'].map((label, index) => {
              const step = index + 1;
              return <button key={label} type="button" onClick={() => setStage(step)} className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${stage === step ? 'border-emerald-700 bg-emerald-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-xs">{step}</span>{label}</button>;
            })}
          </div>
        )}

        {stage === 1 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="1" title="Select Advertisement, Posts, Departments & Applicants" subtitle="Select the posts you want to include in this roll number generation batch." />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <TextField size="small" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} className="lg:col-span-4" InputProps={{ startAdornment: <Search size={16} className="mr-2 text-slate-400" /> }} />
              <TextField select size="small" label="Advertisement" value={filterAdvertisement} onChange={(e) => setFilterAdvertisement(e.target.value)} className="lg:col-span-3"><MenuItem value="all">All Advertisements</MenuItem>{advertisements.map((ad) => <MenuItem key={ad.id} value={ad.id}>{ad.advertisement}</MenuItem>)}</TextField>
              <TextField select size="small" label="Post" value={filterPost} onChange={(e) => setFilterPost(e.target.value)} className="lg:col-span-2"><MenuItem value="all">All Posts</MenuItem>{allPosts.map((post) => <MenuItem key={post.id} value={post.id}>{post.post}</MenuItem>)}</TextField>
              <TextField select size="small" label="Department" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="lg:col-span-2"><MenuItem value="all">All Departments</MenuItem>{uniqueDepartments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField>
              <Button variant="outline" className="h-10 gap-2 bg-white lg:col-span-1" onClick={() => { setSearch(''); setFilterAdvertisement('all'); setFilterPost('all'); setFilterDepartment('all'); }}><Filter size={15} /> Filter</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="w-[260px] px-4 py-3">Advertisement</th><th className="px-4 py-3">Designation / Post</th><th className="px-4 py-3">Department</th><th className="px-4 py-3 text-right">Applicants</th></tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {flatPostRows.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No posts found for this exam type</td></tr>
                  )}
                  {pagedGroupedPosts.map(({ ad, posts }, groupIndex) => {
                    const isLastGroup = groupIndex === pagedGroupedPosts.length - 1;
                    const groupBorder = !isLastGroup ? 'border-b-2 border-b-slate-300' : '';
                    return posts.map((post, index) => {
                      const isLastInGroup = index === posts.length - 1;
                      return (
                        <tr key={post.id} className="hover:bg-slate-50">
                          {index === 0 && <td rowSpan={posts.length} className={`border-r border-slate-100 bg-slate-50 px-4 py-3 align-top ${groupBorder}`}><div className="font-bold text-slate-900">{ad.advertisement}</div><div className="mt-1 text-xs font-medium text-slate-500">{ad.meta}</div></td>}
                          <td className={`px-4 py-3 ${isLastInGroup ? groupBorder : ''}`}><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={selectedPostIds.includes(post.id)} onChange={() => togglePost(post.id)} className="h-4 w-4 rounded border-slate-300 accent-emerald-800" /><span><span className="block font-semibold text-slate-900">{post.post}</span><span className="block text-xs text-slate-500">{post.caseNo}</span></span></label></td>
                          <td className={`px-4 py-3 text-slate-600 ${isLastInGroup ? groupBorder : ''}`}>{post.department}</td>
                          <td className={`px-4 py-3 text-right font-bold text-slate-900 ${isLastInGroup ? groupBorder : ''}`}>{post.applicants}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
            {flatPostRows.length > 0 && (
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{flatPostRows.length} post{flatPostRows.length === 1 ? '' : 's'}</span>
                <Pagination page={postsPage} totalPages={postsTotalPages} onChange={setPostsPage} />
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-3">
              <div><p className="text-xs font-semibold text-emerald-700">Selected Posts</p><p className="text-lg font-bold text-emerald-950">{selectedPosts.length}</p></div>
              <div><p className="text-xs font-semibold text-emerald-700">Total Applicants</p><p className="text-lg font-bold text-emerald-950">{selectedApplicants}</p></div>
              <div><p className="text-xs font-semibold text-emerald-700">Roll Slip Rule</p><p className="text-lg font-bold text-emerald-950">One roll number</p></div>
            </div>
            <div className="flex justify-end"><Button className="gap-2" disabled={!selectedPosts.length} onClick={() => setStage(2)}>Next: Center Allocation <ArrowRight size={15} /></Button></div>
          </CardContent></Card>
        )}

        {stage === 2 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="2" title="Center Allocation & Generate Roll Numbers" subtitle="Select centers, configure schedule, then generate roll numbers." />
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{meta.papers.map((paper, index) => (
                  <div key={paper} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center gap-2"><CalendarDays size={17} className="text-emerald-700" /><h3 className="text-sm font-bold text-slate-900">{paper} Schedule</h3></div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <TextField size="small" type="date" label="Start Date" value={scheduleDates[index] || ''} onChange={(event) => setScheduleDates((current) => current.map((date, dateIndex) => dateIndex === index ? event.target.value : date))} InputLabelProps={{ shrink: true }} />
                      <TextField size="small" type="time" label="Start Time" value={scheduleTimes[index] || ''} onChange={(event) => setScheduleTimes((current) => current.map((time, timeIndex) => timeIndex === index ? event.target.value : time))} InputLabelProps={{ shrink: true }} />
                      <TextField select size="small" label="Duration" value={scheduleDurations[index] ?? 90} onChange={(event) => setScheduleDurations((current) => current.map((dur, durIndex) => durIndex === index ? Number(event.target.value) : dur))} InputProps={{ startAdornment: <Clock3 size={15} className="mr-2 text-slate-400" /> }}>
                        <MenuItem value={60}>60 Minutes</MenuItem>
                        <MenuItem value={90}>90 Minutes</MenuItem>
                        <MenuItem value={120}>120 Minutes</MenuItem>
                        <MenuItem value={150}>150 Minutes</MenuItem>
                        <MenuItem value={180}>180 Minutes</MenuItem>
                      </TextField>
                      <TextField size="small" label="End Time" value={computeEndTime(scheduleTimes[index], scheduleDurations[index]) || '—'} InputProps={{ readOnly: true }} disabled InputLabelProps={{ shrink: true }} />
                    </div>
                  </div>
                ))}</div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="w-12 px-4 py-3"></th><th className="px-4 py-3">Center Name</th><th className="px-4 py-3">District</th><th className="px-4 py-3 text-right">Capacity</th><th className="px-4 py-3">Start Date</th><th className="px-4 py-3">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {centers.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No exam centers found</td></tr>
                      )}
                      {pagedCenters.map((center) => <tr key={center.id} className="hover:bg-slate-50"><td className="px-4 py-3"><input type="checkbox" checked={selectedCenterIds.includes(center.id)} onChange={() => toggleCenter(center.id)} className="h-4 w-4 rounded border-slate-300 accent-emerald-800" /></td><td className="px-4 py-3 font-medium text-slate-800">{center.center}</td><td className="px-4 py-3 text-slate-600">{center.district}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">{center.capacity}</td><td className="px-4 py-3 font-medium text-slate-700">{scheduleDates[0] || '—'}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Available</span></td></tr>)}
                    </tbody>
                  </table>
                </div>
                {centers.length > 0 && (
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{centers.length} center{centers.length === 1 ? '' : 's'}</span>
                    <Pagination page={centersPage} totalPages={centersTotalPages} onChange={setCentersPage} />
                  </div>
                )}
                <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${capacityPassed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{capacityPassed ? `Capacity check passed. ${selectedCapacity} seats selected for ${selectedApplicants} applicants.` : `Selected center capacity is short by ${capacityShortage} seats. Select more centers.`}</div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Center Allocation by District or by Preference</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"><input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 accent-emerald-800" />By District</label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"><input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 accent-emerald-800" />By Preference</label>
                  </div>
                </div>
              </div>
</div>
            <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="gap-2 bg-white" onClick={() => setStage(1)}><ArrowLeft size={15} /> Back</Button><Button className="gap-2" disabled={!capacityPassed || generating} onClick={generateRollNumbers}><Send size={15} /> {generating ? 'Generating…' : 'Generate Roll Numbers'}</Button></div>
          </CardContent></Card>
        )}

        {stage === 3 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="3" title="Generated Candidates List" subtitle="Roll number slips are now available for selected candidates." />
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Roll numbers generated. Candidate dashboard par har selected job ke against same roll number slip available hogi.</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="w-20 px-4 py-3">Photo</th><th className="px-4 py-3">Roll No</th><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Selected Jobs</th><th className="px-4 py-3">Center</th><th className="px-4 py-3 text-right">Slip</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">
              {generatedCandidates.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No candidates generated yet</td></tr>
              )}
              {generatedCandidates.map((candidate) => <tr key={candidate.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-700">{candidate.photo}</div></td><td className="px-4 py-3 font-bold text-slate-900">{candidate.roll}</td><td className="px-4 py-3"><div className="font-semibold text-slate-900">{candidate.name}</div><div className="text-xs text-slate-500">{candidate.cnic}{candidate.district ? ` | ${candidate.district}` : ''}</div></td><td className="px-4 py-3 text-slate-600">{selectedPosts.map((post) => post.post).join(' + ') || 'N/A'}</td><td className="px-4 py-3 text-slate-600">{candidate.center}</td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" className="gap-1.5 bg-white" onClick={() => viewSlip(candidate.id)}><Eye size={14} /> View Slip</Button><Button variant="outline" size="sm" className="w-9 h-9 p-0 bg-white" title="Download Slip" aria-label="Download Slip" onClick={() => downloadSlip(candidate.id)}><Download size={14} /></Button></div></td></tr>)}
            </tbody></table></div>
            <div className="flex justify-start"><Button variant="outline" className="gap-2 bg-white" onClick={() => setStage(2)}><ArrowLeft size={15} /> Back to Allocation</Button></div>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default RollNumberExamFlow;
