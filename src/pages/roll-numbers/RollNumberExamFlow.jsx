import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, Eye, Filter, Hash, MapPin, Plus, Search, Send, Users, X } from 'lucide-react';
import { MenuItem, TextField } from '@mui/material';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberApi from 'api/rollNumberApi';
import WrittenExamSubjectApi from 'api/writtenExamSubjectApi';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { useGenerationGuard } from 'context/GenerationGuardContext';

// ── AJK district → exam-center zone mapping ───────────────────────────────
// Key: district name (lower-case) OR district code (string)
// Value: zone key that is matched against the center name in `centers` list
const DISTRICT_ZONE_MAP = {
  // Muzaffarabad zone (districts 01 02 03 12)
  '02': 'muzaffarabad', 'muzaffarabad': 'muzaffarabad',
  '01': 'muzaffarabad', 'neelum': 'muzaffarabad',
  '03': 'muzaffarabad', 'jehlum valley': 'muzaffarabad', 'jhelum valley': 'muzaffarabad',
  '12': 'muzaffarabad', 'refugees (1989)': 'muzaffarabad', 'refugee (1989)': 'muzaffarabad',
  '13': 'muzaffarabad', 'special persons': 'muzaffarabad', // default to capital
  // Rawalakot / Poonch zone (districts 04 05 06 07)
  '06': 'rawalakot', 'poonch': 'rawalakot', 'rawalakot': 'rawalakot',
  '04': 'rawalakot', 'bagh': 'rawalakot',
  '07': 'rawalakot', 'sudhnoti': 'rawalakot',
  '05': 'rawalakot', 'haveli': 'rawalakot',
  // Mirpur zone (districts 08 09 10 11)
  '10': 'mirpur', 'mirpur': 'mirpur',
  '09': 'mirpur', 'bhimber': 'mirpur',
  '08': 'mirpur', 'kotli': 'mirpur',
  '11': 'mirpur',
  'refugees settled in pakistan (1947)': 'mirpur',
  'refugees settled in paskistan (1947)': 'mirpur',
};
const ZONE_ORDER  = ['muzaffarabad', 'rawalakot', 'mirpur'];
const ZONE_LABELS = { muzaffarabad: 'Muzaffarabad', rawalakot: 'Rawalakot', mirpur: 'Mirpur' };

// Resolve district → zone from a candidate application (checks name + code)
const resolveDistrictZone = (app) => {
  const raw = [
    app.snapshot_data?.district,
    app.snapshot_data?.district_code,
    app.snapshot_data?.domicile_district,
    app.snapshot_data?.permanent_district,
    app.snapshot_data?.address?.district,
    app.snapshot_data?.permanent_address?.district,
  ].filter(Boolean).map(v => String(v).toLowerCase().trim());

  for (const v of raw) {
    if (DISTRICT_ZONE_MAP[v]) return DISTRICT_ZONE_MAP[v];
    for (const [key, zone] of Object.entries(DISTRICT_ZONE_MAP)) {
      if (v.includes(key) || key.includes(v)) return zone;
    }
  }
  return 'muzaffarabad'; // default to capital zone
};

// Resolve preferred-city → zone; falls back to district if no match
const resolvePreferenceZone = (app) => {
  const cities = (app.preferred_exam_cities || [])
    .map(c => (typeof c === 'string' ? c : (c?.city || '')).toLowerCase().trim())
    .filter(Boolean);
  for (const city of cities) {
    if (DISTRICT_ZONE_MAP[city]) return DISTRICT_ZONE_MAP[city];
    for (const [key, zone] of Object.entries(DISTRICT_ZONE_MAP)) {
      if (city.includes(key) || key.includes(city)) return zone;
    }
  }
  return resolveDistrictZone(app);
};

const examTypeMeta = {
  'one-paper-mcqs': { title: 'One Paper MCQs Roll Number Management', badge: 'One Paper MCQs', description: 'Club one or multiple posts and generate one common roll number slip per candidate.', papers: ['One Paper'], testTypeFilter: (tt) => /mcq/i.test(tt) && !/two/i.test(tt) },
  'two-paper-mcqs': { title: 'Two Paper MCQs Roll Number Management', badge: 'Two Paper MCQs', description: 'Paper 1 and Paper 2 schedules remain separate, while selected jobs can be clubbed under one roll number.', papers: ['Paper 1', 'Paper 2'], testTypeFilter: (tt) => /mcq/i.test(tt) && /two/i.test(tt) },
  'written-exams': { title: 'Written Exams Roll Number Management', badge: 'Written Exams', description: 'Written exams roll number generation following the same allocation pattern.', papers: ['Written Exam'], testTypeFilter: (tt) => /written/i.test(tt) },
  'cce-exams': { title: 'CCE Exams Roll Number Management', badge: 'CCE Exams', description: 'CCE exams roll number generation following the same allocation pattern.', papers: ['CCE Exam'], testTypeFilter: (tt) => /cce/i.test(tt) || /joint.competitive/i.test(tt) || /jce/i.test(tt) },
};

const DEFAULT_ROLL_PREFIXES = {
  'one-paper-mcqs': 'OPM',
  'two-paper-mcqs': 'TPM',
  'written-exams':  'WE',
  'cce-exams':      'CCE',
};

// Accepted exam_category values for each exam-type URL param.
// The DB exam_category values may not have a trailing 's', and CCE uses
// 'joint-competitive-exam' in some installations — all variants are listed here.
const examCategoryAliases = {
  'one-paper-mcqs': new Set(['one-paper-mcq', 'one-paper-mcqs', 'one_paper_mcq', 'one_paper_mcqs']),
  'two-paper-mcqs': new Set(['two-paper-mcq', 'two-paper-mcqs', 'two_paper_mcq', 'two_paper_mcqs']),
  'written-exams':  new Set(['written-exam', 'written-exams', 'written_exam', 'written_exams']),
  'cce-exams':      new Set(['cce-exam', 'cce-exams', 'cce_exam', 'cce', 'joint-competitive-exam', 'joint_competitive_exam', 'jce']),
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


// Extract prefix + zero-padded length from a roll number like "OPM-000001"
const parseRollNumber = (roll) => {
  const match = String(roll || '').match(/^(.*?)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], seq: parseInt(match[2], 10), padLen: match[2].length };
};

const newWrittenSchedule = () => ({ id: Date.now() + Math.random(), date: '', startTime: '10:00', duration: 90, subjectId: '' });

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

// Roll number slip generation now runs as a backend queue job. This polls
// the status endpoint until the job completes/fails, resolving with the same
// { data: { generated_count, slips } } envelope the old synchronous call used
// to return, so all downstream consumption code stays unchanged.
const GENERATION_POLL_INTERVAL_MS = 2500;
const GENERATION_POLL_TIMEOUT_MS = 35 * 60 * 1000; // slightly above the backend job's 30-minute timeout

const pollGenerationStatus = (generationId) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const check = async () => {
    try {
      const res = await RollNumberApi.getGenerationStatus(generationId);
      const status = res?.data?.status;
      if (status === 'completed') {
        resolve(res);
      } else if (status === 'failed') {
        reject(new Error(res?.data?.message || 'Roll number slip generation failed'));
      } else if (Date.now() - startedAt > GENERATION_POLL_TIMEOUT_MS) {
        reject(new Error('Roll number slip generation is taking longer than expected. Please check back later or try again.'));
      } else {
        setTimeout(check, GENERATION_POLL_INTERVAL_MS);
      }
    } catch (err) {
      reject(err);
    }
  };
  check();
});

const RollNumberExamFlow = () => {
  const navigate = useNavigate();
  const { examType = 'one-paper-mcqs' } = useParams();
  const meta = examTypeMeta[examType] || examTypeMeta['one-paper-mcqs'];
  const { setBusy } = useGenerationGuard();

  const [stage, setStage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [selectedCenterIds, setSelectedCenterIds] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [allocationMethod, setAllocationMethod] = useState('district');
  const [centerSelectionMode, setCenterSelectionMode] = useState('auto');
  const [generating, setGenerating] = useState(false);
  const [generationQueue, setGenerationQueue] = useState([]); // [{zone,label,centerName,centerId,total,status,error}]

  // Warn on tab close/refresh while roll number slip generation is in flight —
  // the queue job keeps running server-side, but the admin should know a
  // reload here won't show progress until they come back and re-check.
  useEffect(() => {
    if (!generating) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [generating]);

  // Stage 3 filter + manual-update state
  const [s3Search, setS3Search] = useState('');
  const [s3District, setS3District] = useState('');
  const [s3Gender, setS3Gender] = useState('');
  const [s3CnicFilter, setS3CnicFilter] = useState('');
  const [s3Preference, setS3Preference] = useState('');
  const [s3SelectedIds, setS3SelectedIds] = useState(new Set());
  const [rollStartSeq, setRollStartSeq] = useState('');
  const [manualUpdateCenterId, setManualUpdateCenterId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [s3BackStage, setS3BackStage] = useState(2);
  const [scheduleDates, setScheduleDates] = useState(() => meta.papers.map(() => ''));
  const [scheduleTimes, setScheduleTimes] = useState(() => meta.papers.map((_, i) => i === 1 ? '14:00' : '10:00'));
  const [scheduleDurations, setScheduleDurations] = useState(() => meta.papers.map((_, i) => i === 1 ? 120 : 90));
  const [rollPrefix, setRollPrefix] = useState(() => DEFAULT_ROLL_PREFIXES[examType] ?? '');
  // subjectId → { selected, date, startTime, duration }
  const [subjectSchedules, setSubjectSchedules] = useState({});
  const [writtenExamSubjects, setWrittenExamSubjects] = useState([]);
  const [testTypeSubjectsMap, setTestTypeSubjectsMap] = useState({}); // testTypeId → subject[]

  // Reset schedule state when exam type changes (same component, different route param)
  useEffect(() => {
    setScheduleDates(meta.papers.map(() => ''));
    setScheduleTimes(meta.papers.map((_, i) => i === 1 ? '14:00' : '10:00'));
    setScheduleDurations(meta.papers.map((_, i) => i === 1 ? 120 : 90));
    setRollPrefix(DEFAULT_ROLL_PREFIXES[examType] ?? '');
    setSubjectSchedules({});
  }, [examType]); // eslint-disable-line react-hooks/exhaustive-deps

  const [advertisements, setAdvertisements] = useState([]);
  const [centers, setCenters] = useState([]);
  const [examCities, setExamCities] = useState([]);
  const [generatedCandidates, setGeneratedCandidates] = useState([]);
  const [allCandidateApps, setAllCandidateApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAdvertisement, setFilterAdvertisement] = useState('all');
  const [filterPost, setFilterPost] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [stage]);

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

      const [adsResult, centersResult, testTypesRes, gradesRes, candidateApps, rollNumbersResult, utilizationResult, citiesRes, writtenSubjectsRes, designationsRes] = await Promise.all([
        RollNumberApi.getAdvertisementsWithJobs(200).catch((e) => { console.error('[RollNumberExamFlow] getAdvertisementsWithJobs failed:', e?.message); return {}; }),
        RollNumberApi.getExamCenters(500),
        fetch(`${Config.apiUrl}/settings/test-types?per_page=200`, { headers: adminHeaders }).then(r => r.json()).catch(() => ({})),
        fetch(`${Config.apiUrl}/settings/grades?per_page=200`, { headers: adminHeaders }).then(r => r.json()).catch(() => ({})),
        fetchAllCandidateApps(),
        RollNumberApi.getAdvertisements({ per_page: 200 }).catch(() => ({})),
        RollNumberApi.getCenterUtilization().catch(() => ({ data: {} })),
        fetch(`${Config.apiUrl}/settings/cities?per_page=1000`, { headers: adminHeaders }).then(r => r.json()).catch(() => ({})),
        examType === 'written-exams'
          ? WrittenExamSubjectApi.getAll(1, 1000).catch(() => ({}))
          : Promise.resolve({}),
        examType === 'written-exams'
          ? WrittenExamSubjectApi.getDesignations().catch(() => ({}))
          : Promise.resolve({}),
      ]);

      // designation name (lowercase) → hash_id — used to match job.designation to subject.designation_ids
      const designationNameMap = {};
      const desList = designationsRes?.data?.data ?? designationsRes?.data ?? [];
      (Array.isArray(desList) ? desList : []).forEach(d => {
        const key = (d.name || d.designation_name || '').toLowerCase().trim();
        if (key && d.hash_id) designationNameMap[key] = String(d.hash_id);
      });

      const testTypeMap = {};
      const examCategoryMap = {}; // hash_id/id → exam_category (normalized)
      const subjectIdsMap = {};   // hash_id/id → subject_ids[]
      const ttList = testTypesRes?.data?.data ?? testTypesRes?.data ?? [];
      (Array.isArray(ttList) ? ttList : []).forEach(tt => {
        const cat = (tt.exam_category || '').toLowerCase().replace(/[\s_]+/g, '-');
        const sids = Array.isArray(tt.subject_ids) ? tt.subject_ids.map(String) : [];
        if (tt.hash_id) { testTypeMap[tt.hash_id] = tt.name || ''; examCategoryMap[tt.hash_id] = cat; subjectIdsMap[tt.hash_id] = sids; }
        if (tt.id)      { testTypeMap[String(tt.id)] = tt.name || ''; examCategoryMap[String(tt.id)] = cat; subjectIdsMap[String(tt.id)] = sids; }
      });
      if (examType === 'written-exams') {
        // Fetch individual test type details for every written_exam test type so we
        // get the written_exam_subjects relationship (the list API omits it).
        const writtenTtIds = (Array.isArray(ttList) ? ttList : [])
          .filter(tt => {
            const cat = (tt.exam_category || '').toLowerCase().replace(/[\s_]+/g, '-');
            return cat === 'written-exam' || cat === 'written_exam';
          })
          .map(tt => tt.hash_id || String(tt.id || ''))
          .filter(Boolean);

        const ttDetailResults = writtenTtIds.length > 0
          ? await Promise.all(
              writtenTtIds.map(hid =>
                fetch(`${Config.apiUrl}/settings/test-types/${hid}`, { headers: adminHeaders })
                  .then(r => r.json())
                  .catch(() => null)
              )
            )
          : [];

        const subjectsMap = {};
        ttDetailResults.forEach((result, i) => {
          if (!result) return;
          const data = result.data ?? result;
          const hid = writtenTtIds[i];
          const numId = String(data.id ?? '');

          const relSubjects = Array.isArray(data.subjects) ? data.subjects
            : Array.isArray(data.written_exam_subjects) ? data.written_exam_subjects
            : null;

          let subjects = [];
          if (relSubjects && relSubjects.length > 0) {
            subjects = relSubjects
              .filter(s => String(s?.status ?? 'active').toLowerCase() === 'active')
              .map(s => ({
                id: String(s.hash_id ?? s.id ?? ''),
                name: s.subject_name ?? s.name ?? '',
                marks: Number(s.subject_marks ?? s.total_marks ?? s.marks ?? 0),
              }))
              .filter(s => s.id && s.name);
          }

          // Key by both hash_id and numeric id so any testTypeId format resolves
          if (hid) subjectsMap[hid] = subjects;
          if (numId && numId !== hid) subjectsMap[numId] = subjects;
        });

        setTestTypeSubjectsMap(subjectsMap);

        // Flat subjects list — includes designation_ids for filtering by selected post's designation
        const subjectsList = writtenSubjectsRes?.data?.data ?? writtenSubjectsRes?.data ?? [];
        setWrittenExamSubjects(
          (Array.isArray(subjectsList) ? subjectsList : [])
            .filter(s => String(s?.status ?? 'active').toLowerCase() === 'active')
            .map(s => ({
              id: String(s.hash_id ?? s.id ?? ''),
              name: s.subject_name ?? '',
              marks: Number(s.subject_marks ?? s.total_marks ?? s.marks ?? 0),
              designationIds: Array.isArray(s.designation_ids) && s.designation_ids.length
                ? s.designation_ids.map(String)
                : Array.isArray(s.designations)
                  ? s.designations.map(d => String(d?.hash_id ?? d?.id ?? '')).filter(Boolean)
                  : [],
            }))
            .filter(s => s.id && s.name)
        );
        if (process.env.NODE_ENV !== 'production') {
          console.log('[WrittenExam] writtenSubjectsRes:', writtenSubjectsRes);
          console.log('[WrittenExam] subjectsList length:', subjectsList.length);
        }
      }

      const gradeMap = {};
      const gradeList = gradesRes?.data?.data ?? gradesRes?.data ?? [];
      (Array.isArray(gradeList) ? gradeList : []).forEach(g => {
        if (g.hash_id) gradeMap[g.hash_id] = g.name || g.grade_name || '';
        if (g.id) gradeMap[String(g.id)] = g.name || g.grade_name || '';
      });

      // Fetch which application_numbers already have a generated roll number slip
      const generatedAppsSet = new Set();
      try {
        let rPage = 1;
        for (let i = 0; i < 5; i++) {
          const r = await RollNumberApi.getShortlisted({ per_page: 200, page: rPage });
          const data = r?.data?.data ?? [];
          data.forEach(item => {
            if (item.application_number && item.roll_number) generatedAppsSet.add(item.application_number);
          });
          if (rPage >= (r?.data?.last_page ?? 1) || data.length === 0) break;
          rPage++;
        }
      } catch { /* silent */ }

      // Count candidate applications per post, split into pending vs generated
      const jobPostCountMap = {};    // total apps per post (by ext_adv_id)
      const generatedCountPerPost = {}; // apps with a roll number slip per post
      const candidateAppsAvailable = Array.isArray(candidateApps) && candidateApps.length > 0;
      if (candidateAppsAvailable) {
        candidateApps.forEach(app => {
          const extAdvId = app.job_post?.ext_adv_id || null;
          if (extAdvId) {
            jobPostCountMap[extAdvId] = (jobPostCountMap[extAdvId] || 0) + 1;
            if (generatedAppsSet.has(app.application_number)) {
              generatedCountPerPost[extAdvId] = (generatedCountPerPost[extAdvId] || 0) + 1;
            }
          }
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

      const validCategories = examCategoryAliases[examType] ?? new Set([examType]);

      const matchedAds = allAds
        .map((ad) => {
          const jobs = (ad.job_details || []).filter((job) => {
            const pivotHt  = String(job.pivot?.test_type || '');
            const jobHt    = String(job.test_type || '');

            // 1. Direct exam_category match via alias set (handles 's' suffix + CCE naming)
            const pivotCat = (job.pivot?.test_type_exam_category || examCategoryMap[pivotHt] || '')
              .toLowerCase().replace(/[\s_]+/g, '-');
            const jobCat   = (job.resolved_test_type_exam_category || examCategoryMap[jobHt] || '')
              .toLowerCase().replace(/[\s_]+/g, '-');
            if (pivotCat && validCategories.has(pivotCat)) return true;
            if (jobCat   && validCategories.has(jobCat))   return true;

            // 2. Regex match on resolved name
            const resolved =
              job.pivot?.test_type_name ||
              job.resolved_test_type_name ||
              testTypeMap[pivotHt] ||
              testTypeMap[jobHt] ||
              job.test_type ||
              '';
            return resolved ? meta.testTypeFilter(resolved) : false;
          });
          if (jobs.length === 0) return null;
          return { ad, jobs };
        })
        .filter(Boolean);

      // Debug: log as JSON string so values are immediately readable
      if (process.env.NODE_ENV !== 'production') {
        const dbg = allAds[0]?.job_details?.slice(0, 2).map(j => ({
          designation: j.designation,
          designation_id: j.designation_id,
          designation_hash_id: j.designation_hash_id,
          job_hash_id: j.hash_id,
          job_id: j.id,
          test_type: j.test_type,
          pivot_test_type: j.pivot?.test_type,
        }));
        console.group(`[RollNumberExamFlow] examType=${examType} matched ${matchedAds.length}/${allAds.length}`);
        console.log('testTypeMap:', JSON.stringify(testTypeMap));
        console.log('first ad jobs:', JSON.stringify(dbg, null, 2));
        console.groupEnd();
      }

      // Fallback: if no ads matched the test-type filter (likely because test_type
      // was never set on the pivot/job records), show all ads so the admin is not
      // locked out. Jobs with no test_type will be included with all their details.
      const adsToUse = matchedAds.length > 0
        ? matchedAds
        : allAds.map((ad) => ({ ad, jobs: ad.job_details || [] }));

      const filtered = adsToUse.map(({ ad, jobs }) => {
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
            const totalCount    = jobPostCountMap[jobId] ?? 0;
            const generatedCount = candidateAppsAvailable ? (generatedCountPerPost[jobId] ?? 0) : 0;
            const pendingCount   = candidateAppsAvailable ? totalCount - generatedCount : perPostFallback;
            return {
              id: jobId,
              post: job.designation || job.post_title || 'Untitled Post',
              caseNo: job.case_number ? `Case ${job.case_number} | ${scaleDisplay}` : scaleDisplay,
              scale: scaleDisplay,
              totalPosts: Number(job.pivot?.num_posts ?? job.num_posts) || 0,
              department: deptName,
              applicants: pendingCount,      // candidates without a roll number (used for capacity check)
              generatedCount,                // candidates with a roll number already
              totalApplicants: candidateAppsAvailable ? totalCount : perPostFallback,
              advertisementId: adKey,
              testTypeId: String(job.pivot?.test_type || job.test_type || ''),
              designationHashId: String(
                job.designation_hash_id ??
                job.designation_id ??
                designationNameMap[(job.designation || '').toLowerCase().trim()] ??
                ''
              ),
            };
          }),
        };
      });

      setAdvertisements(filtered);

      const centerList = centersResult?.data?.data ?? centersResult?.data ?? [];
      setCenters(
        (Array.isArray(centerList) ? centerList : [])
          .filter((c) => (c.status ?? 'active') === 'active')
          .map((c) => {
            const numericId = c.id != null ? c.id : null;
            const id = numericId != null ? String(numericId) : c.hash_id;
            const totalCapacity = Number(c.capacity) || 0;
            const allocated = Number((utilizationResult?.data ?? {})[numericId] ?? 0);
            const remaining = Math.max(0, totalCapacity - allocated);
            return {
              id,
              center: c.name,
              district: c.city || c.district || '',
              capacity: remaining,
              totalCapacity,
              allocated,
            };
          })
      );

      const citiesList = citiesRes?.data?.data ?? citiesRes?.data ?? [];
      setExamCities(
        (Array.isArray(citiesList) ? citiesList : [])
          .map(c => c.city_name || c.city || c.name || '')
          .filter(Boolean)
          .sort()
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
  const capacityShortage = Math.max(0, selectedApplicants - selectedCapacity);
  const capacityPassed = selectedApplicants > 0 && selectedCapacity >= selectedApplicants;

  // Only hide zero-applicant posts when real candidate data is available.
  // If the candidate portal is unreachable, allCandidateApps is [] and we
  // fall back to showing all posts so the admin is never locked out.
  const hasCandidateData = allCandidateApps.length > 0;

  // Show ads/posts that have pending applicants OR already-generated slips.
  // Hide only when there are truly zero applications of any kind.
  const postHasActivity = (p) => p.applicants > 0 || p.generatedCount > 0;

  const availableAdvertisements = useMemo(() =>
    hasCandidateData
      ? advertisements.filter((ad) => ad.posts.some(postHasActivity))
      : advertisements,
  [advertisements, hasCandidateData]);

  // Cascade: departments available under the currently selected advertisement
  const availableDepartments = useMemo(() => {
    const pool = filterAdvertisement === 'all'
      ? allPosts
      : allPosts.filter((p) => p.advertisementId === filterAdvertisement);
    const withApplicants = hasCandidateData ? pool.filter(postHasActivity) : pool;
    return [...new Set(withApplicants.map((p) => p.department).filter(Boolean))];
  }, [allPosts, filterAdvertisement, hasCandidateData]);

  // Cascade: posts available under the currently selected advertisement + department
  const availablePosts = useMemo(() =>
    allPosts.filter((p) => {
      if (hasCandidateData && !postHasActivity(p)) return false;
      if (filterAdvertisement !== 'all' && p.advertisementId !== filterAdvertisement) return false;
      if (filterDepartment !== 'all' && p.department !== filterDepartment) return false;
      return true;
    }),
  [allPosts, filterAdvertisement, filterDepartment, hasCandidateData]);

  // Reset child filters when parent selection changes
  useEffect(() => { setFilterDepartment('all'); setFilterPost('all'); }, [filterAdvertisement]);
  useEffect(() => { setFilterPost('all'); }, [filterDepartment]);

  const filteredPosts = useMemo(() => {
    return advertisements.map((ad) => {
      if (filterAdvertisement !== 'all' && ad.id !== filterAdvertisement) return null;
      const posts = ad.posts.filter((post) => {
        if (hasCandidateData && !postHasActivity(post)) return false;
        if (filterPost !== 'all' && post.id !== filterPost) return false;
        if (filterDepartment !== 'all' && post.department !== filterDepartment) return false;
        if (search && !`${ad.advertisement} ${post.post} ${post.department}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
      if (posts.length === 0) return null;
      return { ...ad, posts };
    }).filter(Boolean);
  }, [advertisements, filterAdvertisement, filterPost, filterDepartment, search, hasCandidateData]);

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


  // Subjects for the schedule dropdown — those whose designation_ids include
  // the designation of any selected post. Falls back to all active subjects if
  // designation hash_ids aren't available on the post objects.
  const availableSubjectsForSchedule = useMemo(() => {
    if (examType !== 'written-exams') return [];
    const postDesignationIds = new Set(
      selectedPosts.map(p => p.designationHashId).filter(Boolean)
    );
    if (postDesignationIds.size === 0) return writtenExamSubjects;
    return writtenExamSubjects.filter(s =>
      s.designationIds.some(dId => postDesignationIds.has(dId))
    );
  }, [examType, selectedPosts, writtenExamSubjects]);

  const updateSubjectSchedule = (subjectId, key, value) =>
    setSubjectSchedules(prev => ({
      ...prev,
      [subjectId]: { selected: false, date: '', startTime: '10:00', duration: 90, ...prev[subjectId], [key]: value },
    }));

  // Derived list of selected subject schedules — used for validation and payload
  const writtenExamSchedules = useMemo(() =>
    Object.entries(subjectSchedules)
      .filter(([, sch]) => sch.selected)
      .map(([subjectId, sch]) => ({ subjectId, ...sch })),
  [subjectSchedules]);

  const togglePost = (postId) => setSelectedPostIds((current) => current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId]);
  const toggleCenter = (centerId) => setSelectedCenterIds((current) => current.includes(centerId) ? current.filter((id) => id !== centerId) : [...current, centerId]);

  // View already-generated slips for a specific post (navigates directly to Stage 3)
  const viewGeneratedForPost = useCallback(async (post) => {
    const tid = toast.loading('Loading generated slips…');
    try {
      const r = await RollNumberApi.getApplicationsByAdvertisement(post.advertisementId, { per_page: 1000 });
      const adminApps = r?.data?.applications?.data ?? [];

      // roll_number is a direct string field (e.g. "OPM-000001"), not a nested object
      const appsWithRolls = adminApps.filter(a => {
        const rollStr = typeof a.roll_number === 'string' ? a.roll_number
                      : (a.roll_number?.roll_number || null);
        return !!rollStr;
      });

      if (appsWithRolls.length === 0) {
        toast.dismiss(tid);
        toast.error('No generated slips found for this post');
        return;
      }

      const slips = appsWithRolls.map(a => {
        const rollStr = typeof a.roll_number === 'string' ? a.roll_number
                      : (a.roll_number?.roll_number || '');
        const name = a.candidate_name || a.personal_details?.name || '';
        const centerName = centers.find(c => String(c.id) === String(a.exam_center_id))?.center
                        || a.exam_center || '';
        const startDate = a.exam_date ? a.exam_date.split('T')[0] : '';
        const portalApp = allCandidateApps.find(ca => ca.application_number === a.application_number);
        const preferredCities = (portalApp?.preferred_exam_cities || [])
          .map(c => typeof c === 'string' ? c : (c?.city || '')).filter(Boolean);

        return {
          id: a.application_number,
          photo: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          roll: rollStr,
          name,
          cnic: a.candidate_cnic || '',
          district: a.personal_details?.domicile_district || '',
          center: centerName,
          gender: (a.personal_details?.gender || '').toLowerCase(),
          preferred_cities: preferredCities,
          start_date: startDate,
        };
      });

      toast.dismiss(tid);
      setGeneratedCandidates(slips);
      setSelectedPostIds([post.id]);
      setGenerated(true);
      setS3BackStage(1);
      setStage(3);
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to load generated slips');
    }
  }, [allCandidateApps, centers]);

  const generateRollNumbers = async () => {
    // Validation
    if (centerSelectionMode === 'custom') {
      if (!capacityPassed) { toast.error(`Center capacity is short by ${capacityShortage} seats. Select more centers.`); return; }
      if (selectedCenterIds.length === 0) { toast.error('Select at least one exam center'); return; }
    }
    if (examType === 'written-exams') {
      for (const sch of writtenExamSchedules) {
        if (!sch.date)      { toast.error('All subject schedules must have a date'); return; }
        if (!sch.startTime) { toast.error('All subject schedules must have a start time'); return; }
        if (!sch.subjectId) { toast.error('Please select a subject for each schedule'); return; }
      }
    } else {
      for (let i = 0; i < meta.papers.length; i++) {
        if (!scheduleDates[i]) { toast.error(`${meta.papers[i]} Schedule: Start Date is required`); return; }
        if (!scheduleTimes[i]) { toast.error(`${meta.papers[i]} Schedule: Start Time is required`); return; }
      }
    }

    setGenerating(true);
    setBusy(true, 'Roll number slip generation is in progress. Please wait until it finishes.');
    setGenerationQueue([]);
    try {
      // Collect matching candidate applications (client-side filter by selected posts)
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
        return;
      }

      // Per-paper / per-subject schedule
      const papers = examType === 'written-exams'
        ? writtenExamSchedules.map(sch => ({
            label: availableSubjectsForSchedule.find(s => s.id === sch.subjectId)?.name
                || writtenExamSubjects.find(s => s.id === sch.subjectId)?.name
                || sch.subjectId,
            subject_id: sch.subjectId,
            date: sch.date || null,
            time: sch.startTime || null,
            end_time: computeEndTime(sch.startTime, sch.duration) || null,
          }))
        : meta.papers.map((label, index) => ({
            label,
            date: scheduleDates[index] || null,
            time: scheduleTimes[index] || null,
            end_time: computeEndTime(scheduleTimes[index], scheduleDurations[index]) || null,
          })).filter(p => p.date || p.time);

      const firstExamDate = examType === 'written-exams'
        ? (writtenExamSchedules[0]?.date || null)
        : (scheduleDates[0] || null);
      const firstExamTime = examType === 'written-exams'
        ? (writtenExamSchedules[0]?.startTime || null)
        : (scheduleTimes[0] || null);

      // Reusable candidate object builder
      const buildCandidate = (app) => ({
        application_number: app.application_number,
        candidate_name: app.snapshot_data?.name || app.candidate?.name || '',
        candidate_cnic: app.snapshot_data?.cnic || app.candidate?.cnic || '',
        candidate_email: app.snapshot_data?.email || app.candidate?.email || '',
        candidate_mobile: app.snapshot_data?.mobile_number || app.candidate?.mobile_number || '',
        ext_adv_id: app.job_post?.ext_adv_id || '',
        ext_advertisement_id: app.job_post?.ext_advertisement_id || '',
        preferred_exam_cities: (app.preferred_exam_cities || []).map(c => typeof c === 'string' ? c : (c?.city || '')).filter(Boolean),
        personal_details: app.snapshot_data || {},
        documents: (app.candidate?.documents || []).map(d => ({
          doc_type: d.doc_type || d.type || '',
          file_url: d.file_url || d.url || '',
        })).filter(d => d.doc_type && d.file_url),
      });

      // ── AUTO MODE — district / preference queue ────────────────────────────
      if (centerSelectionMode === 'auto') {
        const resolver = allocationMethod === 'preference' ? resolvePreferenceZone : resolveDistrictZone;

        // Build per-application lookup for enrichment
        const appByNumber = {};
        uniqueApps.forEach(app => { appByNumber[app.application_number] = app; });

        // Helper to build an enriched candidate object from an existing roll record
        const buildExistingCandidate = (app, existing) => {
          const name = app.snapshot_data?.name || app.candidate?.name || '';
          const zone = resolver(app);
          return {
            id: app.application_number,
            photo: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
            roll: existing?.roll_number,
            name,
            cnic: app.snapshot_data?.cnic || app.candidate?.cnic || '',
            district: ZONE_LABELS[zone] || zone,
            center: existing?.examCenter?.name || existing?.exam_center?.name || '',
            gender: (app.snapshot_data?.gender || '').toLowerCase(),
            preferred_cities: (app.preferred_exam_cities || []).map(c => typeof c === 'string' ? c : (c?.city || '')).filter(Boolean),
            start_date: firstExamDate || '',
          };
        };

        // Pre-check: if all selected candidates already have roll numbers, display
        // them without hitting the generate endpoint (mirrors custom mode behaviour).
        const advIdsAuto = [...new Set(selectedPosts.map(p => p.advertisementId))];
        const existingRollMapAuto = {};
        try {
          for (const advId of advIdsAuto) {
            const r = await RollNumberApi.getApplicationsByAdvertisement(advId, { per_page: 1000 });
            (r?.data?.applications?.data ?? []).forEach(a => {
              const roll = a.rollNumber || a.roll_number;
              if (roll?.roll_number) existingRollMapAuto[a.application_number] = roll;
            });
          }
        } catch { /* silent — fall through to generation */ }

        if (uniqueApps.length > 0 && uniqueApps.every(a => existingRollMapAuto[a.application_number])) {
          const existingSlips = uniqueApps.map(app => buildExistingCandidate(app, existingRollMapAuto[app.application_number]));
          setGeneratedCandidates(existingSlips);
          toast.success(`${existingSlips.length} candidate${existingSlips.length !== 1 ? 's' : ''} already have roll numbers — displaying existing slips`);
          setGenerated(true);
          setStage(3);
          return;
        }

        // Group candidates by zone
        const zoneGroups = {};
        uniqueApps.forEach(app => {
          const zone = resolver(app);
          (zoneGroups[zone] = zoneGroups[zone] || []).push(app);
        });

        // Match zone → exam center: check both center name AND district field
        const zoneCenterLookup = {};
        ZONE_ORDER.forEach(zone => {
          const found = centers.find(c =>
            c.center.toLowerCase().includes(zone) ||
            (c.district || '').toLowerCase().includes(zone)
          );
          if (found) zoneCenterLookup[zone] = found;
        });

        // Build processing queue (only zones that have candidates)
        const queue = ZONE_ORDER
          .filter(z => zoneGroups[z]?.length)
          .map(z => ({
            zone: z,
            label: ZONE_LABELS[z],
            centerName: zoneCenterLookup[z]?.center || 'No center configured',
            centerId: zoneCenterLookup[z]?.id ?? null,
            total: zoneGroups[z].length,
            status: 'pending',
            error: null,
          }));
        setGenerationQueue(queue);

        const allSlips = [];
        for (let qi = 0; qi < queue.length; qi++) {
          const item = queue[qi];

          setGenerationQueue(prev => prev.map((q, i) => i === qi ? { ...q, status: 'processing' } : q));

          if (!item.centerId) {
            setGenerationQueue(prev => prev.map((q, i) => i === qi ? { ...q, status: 'error', error: `No exam center found for ${item.label} zone. Add a center with "${item.label}" in its name or district in Settings → Exam Centers.` } : q));
            continue;
          }

          try {
            const groupApps = zoneGroups[item.zone];
            const dispatch = await RollNumberApi.generateSlips({
              application_numbers: groupApps.map(a => a.application_number),
              candidates: groupApps.map(buildCandidate),
              exam_center_id: Number(item.centerId),
              exam_type: examType,
              exam_date: firstExamDate || null,
              attendance_time: firstExamTime || null,
              papers: papers.length > 1 ? papers : undefined,
              allocation_method: allocationMethod,
              auto_allocate: true,
              prefix: rollPrefix.trim(),
            });
            const result = await pollGenerationStatus(dispatch?.data?.generation_id);

            const slips = result?.data?.slips ?? [];

            // If the API returned no slips, candidates may already be generated —
            // fall back to existing roll records for this group.
            if (slips.length === 0) {
              groupApps.forEach(app => {
                const existing = existingRollMapAuto[app.application_number];
                if (existing) allSlips.push(buildExistingCandidate(app, existing));
              });
            } else {
              allSlips.push(...slips.map(s => {
                const orig = appByNumber[s.application_number] || {};
                return {
                  id: s.application_number,
                  photo: (s.candidate_name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                  roll: s.roll_number,
                  name: s.candidate_name,
                  cnic: s.candidate_cnic || '',
                  district: item.label,
                  center: s.exam_center || item.centerName,
                  gender: (orig.snapshot_data?.gender || '').toLowerCase(),
                  preferred_cities: (orig.preferred_exam_cities || []).map(c => typeof c === 'string' ? c : (c?.city || '')).filter(Boolean),
                  start_date: firstExamDate || '',
                };
              }));
            }

            setGenerationQueue(prev => prev.map((q, i) => i === qi ? { ...q, status: 'done' } : q));
          } catch (err) {
            setGenerationQueue(prev => prev.map((q, i) => i === qi ? { ...q, status: 'error', error: err?.message || 'Generation failed' } : q));
          }
        }

        setGeneratedCandidates(allSlips);
        if (allSlips.length > 0) {
          toast.success(`Generated ${allSlips.length} roll number${allSlips.length !== 1 ? 's' : ''} across ${queue.length} center${queue.length !== 1 ? 's' : ''}`);
          setGenerated(true);
          setStage(3);
        } else {
          const zoneErrors = queue.filter(q => q.status === 'error');
          if (zoneErrors.length > 0) {
            zoneErrors.forEach(q => toast.error(`${q.label}: ${q.error}`, { duration: 6000 }));
          } else {
            toast.error('No roll numbers generated — the API returned empty results. Check backend logs.');
          }
        }
        return;
      }

      // ── CUSTOM MODE — existing single-center flow ──────────────────────────
      const advIds = [...new Set(selectedPosts.map(p => p.advertisementId))];
      const existingRollMap = {};
      for (const advId of advIds) {
        const r = await RollNumberApi.getApplicationsByAdvertisement(advId, { per_page: 1000 });
        (r?.data?.applications?.data ?? []).forEach(a => {
          const roll = a.rollNumber || a.roll_number;
          if (roll?.roll_number) existingRollMap[a.application_number] = roll;
        });
      }

      if (uniqueApps.every(a => existingRollMap[a.application_number])) {
        setGeneratedCandidates(uniqueApps.map(app => {
          const existing = existingRollMap[app.application_number];
          const name = app.snapshot_data?.name || app.candidate?.name || '';
          return {
            id: app.application_number,
            photo: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
            roll: existing?.roll_number,
            name,
            cnic: app.snapshot_data?.cnic || app.candidate?.cnic || '',
            district: app.snapshot_data?.district || '',
            center: existing?.examCenter?.name || existing?.exam_center?.name || '',
            gender: (app.snapshot_data?.gender || '').toLowerCase(),
            preferred_cities: (app.preferred_exam_cities || []).map(c => typeof c === 'string' ? c : (c?.city || '')).filter(Boolean),
            start_date: firstExamDate || '',
          };
        }));
        toast.success('All selected candidates already have roll numbers generated');
        setGenerated(true);
        setStage(3);
        return;
      }

      const dispatch = await RollNumberApi.generateSlips({
        application_numbers: uniqueApps.map(a => a.application_number),
        candidates: uniqueApps.map(buildCandidate),
        exam_center_id: Number(selectedCenterIds[0]),
        exam_type: examType,
        exam_date: scheduleDates[0] || null,
        attendance_time: scheduleTimes[0] || null,
        papers: papers.length > 1 ? papers : undefined,
        allocation_method: allocationMethod,
        auto_allocate: false,
        prefix: rollPrefix.trim(),
      });
      const result = await pollGenerationStatus(dispatch?.data?.generation_id);
      const slips = result?.data?.slips ?? [];
      const count = result?.data?.generated_count ?? slips.length;
      const appByNumberCustom = {};
      uniqueApps.forEach(app => { appByNumberCustom[app.application_number] = app; });
      setGeneratedCandidates(slips.map(s => {
        const orig = appByNumberCustom[s.application_number] || {};
        return {
          id: s.application_number,
          photo: (s.candidate_name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          roll: s.roll_number,
          name: s.candidate_name,
          cnic: s.candidate_cnic || '',
          district: orig.snapshot_data?.district || '',
          center: `${s.exam_center || ''}${s.exam_city ? ` ${s.exam_city}` : ''}`,
          gender: (orig.snapshot_data?.gender || '').toLowerCase(),
          preferred_cities: (orig.preferred_exam_cities || []).map(c => typeof c === 'string' ? c : (c?.city || '')).filter(Boolean),
          start_date: firstExamDate || '',
        };
      }));
      toast.success(`Generated ${count} roll number${count === 1 ? '' : 's'} successfully`);
      setGenerated(true);
      setStage(3);
    } catch (err) {
      toast.error(err?.message || 'Failed to generate roll numbers');
    } finally {
      setGenerating(false);
      setBusy(false);
    }
  };

  // Navigates to a dedicated full-page slip viewer route (in-app, not a
  // modal or a new browser tab) — consistent with how Advertisement detail
  // pages are viewed elsewhere in the app.
  const viewSlip = useCallback((rollNumber) => {
    navigate(`/dashboard/roll-numbers/slip/${encodeURIComponent(rollNumber)}`);
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

  // ── Stage 3: derived values ──────────────────────────────────────────────
  // Count unique physical candidates (one per CNIC) regardless of how many
  // applications they have under this batch
  const s3UniqueCandidateCount = useMemo(() => {
    const seen = new Set();
    generatedCandidates.forEach(c => { if (c.cnic) seen.add(c.cnic); });
    return seen.size || generatedCandidates.length;
  }, [generatedCandidates]);

  const s3UniqueDistricts = useMemo(
    () => [...new Set(generatedCandidates.map(c => c.district).filter(Boolean))],
    [generatedCandidates]
  );
  const s3FilteredCandidates = useMemo(() => {
    // Deduplicate by CNIC — one row per physical candidate (a candidate who
    // applied for multiple posts in this batch still gets one roll number slip)
    const seenCnic = new Set();
    const deduped = generatedCandidates.filter(c => {
      if (!c.cnic) return true;
      if (seenCnic.has(c.cnic)) return false;
      seenCnic.add(c.cnic);
      return true;
    });

    return deduped.filter(c => {
      if (s3Search && !`${c.name} ${c.cnic} ${c.id}`.toLowerCase().includes(s3Search.toLowerCase())) return false;
      if (s3District && (c.district || '').toLowerCase() !== s3District.toLowerCase()) return false;
      if (s3Gender && c.gender !== s3Gender) return false;
      if (s3CnicFilter && !(c.cnic || '').includes(s3CnicFilter.trim())) return false;
      if (s3Preference && !(c.preferred_cities || []).some(p => p.toLowerCase().includes(s3Preference.toLowerCase()))) return false;
      return true;
    });
  }, [generatedCandidates, s3Search, s3District, s3Gender, s3CnicFilter, s3Preference]);

  const s3SelectedList = useMemo(
    () => s3FilteredCandidates.filter(c => s3SelectedIds.has(c.id)),
    [s3FilteredCandidates, s3SelectedIds]
  );
  const s3AllChecked = s3FilteredCandidates.length > 0 && s3FilteredCandidates.every(c => s3SelectedIds.has(c.id));
  const s3SomeChecked = !s3AllChecked && s3FilteredCandidates.some(c => s3SelectedIds.has(c.id));
  const s3EndSeq = useMemo(() => {
    const start = parseInt(rollStartSeq, 10);
    if (isNaN(start) || start < 1 || s3SelectedList.length === 0) return '';
    const end = start + s3SelectedList.length - 1;
    const padLen = Math.max(rollStartSeq.length, String(end).length);
    return String(end).padStart(padLen, '0');
  }, [rollStartSeq, s3SelectedList]);

  const toggleS3All = useCallback(() => {
    setS3SelectedIds(prev => {
      const n = new Set(prev);
      if (s3AllChecked) {
        s3FilteredCandidates.forEach(c => n.delete(c.id));
      } else {
        s3FilteredCandidates.forEach(c => n.add(c.id));
      }
      return n;
    });
  }, [s3AllChecked, s3FilteredCandidates]);

  const toggleS3Candidate = useCallback((id) => {
    setS3SelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const handleManualUpdate = useCallback(async () => {
    if (s3SelectedList.length === 0) { toast.error('Select at least one candidate to update'); return; }
    const startSeq = parseInt(rollStartSeq, 10);
    if (isNaN(startSeq) || startSeq < 1) { toast.error('Enter a valid Roll No start sequence'); return; }
    if (!manualUpdateCenterId) { toast.error('Select an exam center'); return; }

    const firstRoll = generatedCandidates.find(c => c.roll)?.roll;
    const fmt = parseRollNumber(firstRoll);

    const newRolls = s3SelectedList.map((_, i) => {
      const seq = startSeq + i;
      return fmt ? `${fmt.prefix}${String(seq).padStart(fmt.padLen, '0')}` : String(seq).padStart(6, '0');
    });

    // Use deduped candidate list for conflict check to avoid false positives
    // from multi-post duplicate rows for the same CNIC
    const seenCnic = new Set();
    const dedupedAll = generatedCandidates.filter(c => {
      if (!c.cnic) return true;
      if (seenCnic.has(c.cnic)) return false;
      seenCnic.add(c.cnic);
      return true;
    });
    const nonSelectedRolls = new Set(
      dedupedAll.filter(c => !s3SelectedIds.has(c.id) && c.roll).map(c => c.roll)
    );
    const conflicts = newRolls.filter(r => nonSelectedRolls.has(r));
    if (conflicts.length > 0) {
      const proceed = window.confirm(
        `The following roll number${conflicts.length > 1 ? 's' : ''} already exist:\n${conflicts.join(', ')}\n\nDo you want to overwrite them anyway?`
      );
      if (!proceed) return;
    }

    setUpdating(true);
    try {
      const selectedCenter = centers.find(c => c.id === manualUpdateCenterId);
      for (let i = 0; i < s3SelectedList.length; i++) {
        await RollNumberApi.updateSlip(s3SelectedList[i].id, {
          roll_number: newRolls[i],
          exam_center_id: Number(manualUpdateCenterId),
        });
      }
      const updateMap = {};
      s3SelectedList.forEach((c, i) => { updateMap[c.id] = { roll: newRolls[i], center: selectedCenter?.center || '' }; });
      setGeneratedCandidates(prev => prev.map(c => updateMap[c.id] ? { ...c, ...updateMap[c.id] } : c));
      setS3SelectedIds(new Set());
      setRollStartSeq('');
      toast.success(`Updated ${s3SelectedList.length} candidate${s3SelectedList.length !== 1 ? 's' : ''} successfully`);
    } catch (err) {
      toast.error(err?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  }, [s3SelectedList, rollStartSeq, manualUpdateCenterId, generatedCandidates, s3SelectedIds, centers]);

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
          <Card className="rounded-lg border-violet-200 bg-violet-50"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 size={24} className="text-violet-700" /><div><p className="text-xs font-semibold text-violet-700">Generated</p><p className="text-2xl font-bold text-violet-950">{generated ? s3UniqueCandidateCount : 0}</p></div></CardContent></Card>
        </div>

        {stage !== 3 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {['Select Posts', 'Center Allocation & Generate'].map((label, index) => {
              const step = index + 1;
              // Both tabs lock while a generation job is running — without this,
              // "Select Posts" stayed clickable mid-job and let the admin jump
              // back to stage 1 and change the post selection underneath it.
              const isDisabled = step === 2 || generating;
              return <button key={label} type="button" disabled={isDisabled} onClick={() => { if (!isDisabled) setStage(step); }} className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${stage === step ? 'border-emerald-700 bg-emerald-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} disabled:cursor-not-allowed`}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-xs">{step}</span>{label}</button>;
            })}
          </div>
        )}

        {stage === 1 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="1" title="Select Advertisement, Posts, Departments & Applicants" subtitle="Select the posts you want to include in this roll number generation batch." />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <TextField size="small" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} className="lg:col-span-3" InputProps={{ startAdornment: <Search size={16} className="mr-2 text-slate-400" /> }} />
              <TextField select size="small" label="Advertisement" value={filterAdvertisement} onChange={(e) => setFilterAdvertisement(e.target.value)} className="lg:col-span-3"><MenuItem value="all">All Advertisements</MenuItem>{availableAdvertisements.map((ad) => <MenuItem key={ad.id} value={ad.id}>{ad.advertisement}</MenuItem>)}</TextField>
              <TextField select size="small" label="Department" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="lg:col-span-3"><MenuItem value="all">All Departments</MenuItem>{availableDepartments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField>
              <TextField select size="small" label="Post" value={filterPost} onChange={(e) => setFilterPost(e.target.value)} className="lg:col-span-2"><MenuItem value="all">All Posts</MenuItem>{availablePosts.map((post) => <MenuItem key={post.id} value={post.id}>{post.post}</MenuItem>)}</TextField>
              <Button variant="outline" className="h-10 gap-2 bg-white lg:col-span-1" onClick={() => { setSearch(''); setFilterAdvertisement('all'); setFilterPost('all'); setFilterDepartment('all'); }}><Filter size={15} /> Reset</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="w-[260px] px-4 py-3">Advertisement</th><th className="px-4 py-3">Designation / Post</th><th className="px-4 py-3">Department</th><th className="px-4 py-3 text-right"><div>Applicants</div><div className="font-normal text-slate-400 text-[10px] normal-case tracking-normal">Pending / Generated</div></th></tr></thead>
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
                          {index === 0 && <td rowSpan={posts.length} className={`border-r border-slate-100 bg-slate-50 px-4 py-3 align-top ${groupBorder}`}><div className="font-bold text-slate-900">{ad.advertisement}</div></td>}
                          <td className={`px-4 py-3 ${isLastInGroup ? groupBorder : ''}`}><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={selectedPostIds.includes(post.id)} onChange={() => togglePost(post.id)} className="h-4 w-4 rounded border-slate-300 accent-emerald-800" /><span><span className="block font-semibold text-slate-900">{post.post}</span><span className="mt-0.5 flex items-center gap-2"><span className="text-xs text-slate-500">{post.scale}</span>{post.totalPosts > 0 && <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{post.totalPosts} {post.totalPosts === 1 ? 'Post' : 'Posts'}</span>}</span></span></label></td>
                          <td className={`px-4 py-3 text-slate-600 ${isLastInGroup ? groupBorder : ''}`}>{post.department}</td>
                          <td className={`px-4 py-3 text-right ${isLastInGroup ? groupBorder : ''}`}>
                              <div className="flex flex-col items-end gap-1">
                                {post.applicants > 0 && (
                                  <span className="font-bold text-slate-900 text-sm">{post.applicants}</span>
                                )}
                                {post.applicants === 0 && post.generatedCount === 0 && (
                                  <span className="text-slate-400 text-sm">—</span>
                                )}
                                {post.generatedCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); viewGeneratedForPost(post); }}
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 transition-colors"
                                  >
                                    <CheckCircle2 size={11} />
                                    {post.generatedCount} Generated · View
                                  </button>
                                )}
                              </div>
                            </td>
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
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-4">
              <div><p className="text-xs font-semibold text-emerald-700">Selected Posts</p><p className="text-lg font-bold text-emerald-950">{selectedPosts.length}</p></div>
              <div><p className="text-xs font-semibold text-emerald-700">Pending (no slip)</p><p className="text-lg font-bold text-emerald-950">{selectedApplicants}</p></div>
              <div><p className="text-xs font-semibold text-emerald-700">Already Generated</p><p className="text-lg font-bold text-emerald-950">{selectedPosts.reduce((s, p) => s + (p.generatedCount || 0), 0)}</p></div>
              <div><p className="text-xs font-semibold text-emerald-700">Roll Slip Rule</p><p className="text-lg font-bold text-emerald-950">One roll number</p></div>
            </div>
            <div className="flex justify-end"><Button className="gap-2" disabled={!selectedPosts.length} onClick={() => setStage(2)}>Next: Center Allocation <ArrowRight size={15} /></Button></div>
          </CardContent></Card>
        )}

        {stage === 2 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="2" title="Center Allocation & Generate Roll Numbers" subtitle="Select centers, configure schedule, then generate roll numbers." />

            {/* ── In-progress banner — shown for both auto and custom modes while the queue job runs ── */}
            {generating && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <p className="text-sm font-semibold text-emerald-900">
                  Roll number slip generation is in progress. Please wait — all selections on this screen are locked until it finishes.
                </p>
              </div>
            )}

            {/* Disables every form control in this step (radios, inputs, buttons)
                while a generation job is running, so the admin can't change any
                selection mid-job — the fieldset's native `disabled` cascades to
                all descendants; `contents` keeps it out of the layout flow. */}
            <fieldset disabled={generating} className="contents">

            {/* ── Selection mode ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { value: 'auto',   label: 'Auto Selection',   desc: 'System automatically allocates candidates to centers based on the chosen method.' },
                { value: 'custom', label: 'Custom Selection', desc: 'Manually select exam centers and control capacity allocation.' },
              ].map(({ value, label, desc }) => (
                <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${centerSelectionMode === value ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                  <input type="radio" name="centerSelectionMode" value={value} checked={centerSelectionMode === value} onChange={() => setCenterSelectionMode(value)} className="mt-0.5 h-4 w-4 accent-emerald-800" />
                  <div>
                    <p className={`text-sm font-bold ${centerSelectionMode === value ? 'text-emerald-900' : 'text-slate-800'}`}>{label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* ── Roll Number Prefix ── */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Hash size={15} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Roll Number Prefix</h3>
                <span className="ml-1 text-xs text-slate-400">Optional — prepended before the sequence number</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-56">
                  <input
                    type="text"
                    value={rollPrefix}
                    onChange={(e) => setRollPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder={`Default: ${DEFAULT_ROLL_PREFIXES[examType] ?? 'none'}`}
                    maxLength={10}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pr-8 font-mono text-sm font-semibold uppercase tracking-widest text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {rollPrefix && (
                    <button
                      type="button"
                      onClick={() => setRollPrefix('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Remove prefix"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="font-mono text-sm font-bold text-slate-700">
                    {rollPrefix ? `${rollPrefix}-000001` : '000001'}
                  </span>
                  <span className="text-xs text-slate-400">preview</span>
                </div>
                {rollPrefix !== (DEFAULT_ROLL_PREFIXES[examType] ?? '') && (
                  <button
                    type="button"
                    onClick={() => setRollPrefix(DEFAULT_ROLL_PREFIXES[examType] ?? '')}
                    className="text-xs text-emerald-700 underline hover:text-emerald-900"
                  >
                    Reset to default
                  </button>
                )}
              </div>
            </div>

            {/* ── Schedule — shown in BOTH modes ── */}
            {examType === 'written-exams' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={17} className="text-emerald-700" />
                  <h3 className="text-sm font-bold text-slate-900">Subject Schedules</h3>
                  {writtenExamSchedules.length > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">{writtenExamSchedules.length} selected</span>
                  )}
                </div>

                {availableSubjectsForSchedule.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                    No subjects found for the selected posts. Please check written exam subjects configuration.
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="w-10 px-4 py-3"></th>
                          <th className="px-4 py-3 text-left">Subject</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Start Time</th>
                          <th className="px-4 py-3 text-left">Duration</th>
                          <th className="px-4 py-3 text-left">End Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {availableSubjectsForSchedule.map(subj => {
                          const sch = subjectSchedules[subj.id] ?? { selected: false, date: '', startTime: '10:00', duration: 90 };
                          const isSelected = !!sch.selected;
                          return (
                            <tr key={subj.id} className={isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={e => updateSubjectSchedule(subj.id, 'selected', e.target.checked)}
                                  className="h-4 w-4 accent-emerald-700 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <p className={`font-medium ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{subj.name}</p>
                                <p className="text-xs text-slate-400">{subj.marks} marks</p>
                              </td>
                              <td className="px-4 py-3">
                                <TextField
                                  size="small" type="date"
                                  disabled={!isSelected}
                                  value={sch.date}
                                  onChange={e => updateSubjectSchedule(subj.id, 'date', e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  error={isSelected && !sch.date}
                                  sx={{ width: 150 }}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <TextField
                                  size="small" type="time"
                                  disabled={!isSelected}
                                  value={sch.startTime}
                                  onChange={e => updateSubjectSchedule(subj.id, 'startTime', e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  sx={{ width: 130 }}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <TextField
                                  select size="small"
                                  disabled={!isSelected}
                                  value={sch.duration}
                                  onChange={e => updateSubjectSchedule(subj.id, 'duration', Number(e.target.value))}
                                  InputProps={{ startAdornment: <Clock3 size={14} className="mr-1 text-slate-400" /> }}
                                  sx={{ width: 140 }}
                                >
                                  {[60, 90, 120, 150, 180].map(m => <MenuItem key={m} value={m}>{m} min</MenuItem>)}
                                </TextField>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-sm">
                                {isSelected ? (computeEndTime(sch.startTime, sch.duration) || '—') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {meta.papers.map((paper, index) => (
                  <div key={paper} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center gap-2"><CalendarDays size={17} className="text-emerald-700" /><h3 className="text-sm font-bold text-slate-900">{paper} Schedule</h3></div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <TextField size="small" type="date" label="Start Date *" value={scheduleDates[index] || ''} onChange={(e) => { const v = e.target.value; setScheduleDates((cur) => { const a = [...cur]; while (a.length <= index) a.push(''); a[index] = v; return a; }); }} required error={!scheduleDates[index]} helperText={!scheduleDates[index] ? 'Required' : ''} InputLabelProps={{ shrink: true }} />
                      <TextField size="small" type="time" label="Start Time *" value={scheduleTimes[index] || ''} onChange={(e) => { const v = e.target.value; setScheduleTimes((cur) => { const a = [...cur]; while (a.length <= index) a.push(''); a[index] = v; return a; }); }} required error={!scheduleTimes[index]} helperText={!scheduleTimes[index] ? 'Required' : ''} InputLabelProps={{ shrink: true }} />
                      <TextField select size="small" label="Duration *" value={scheduleDurations[index] ?? 90} onChange={(e) => { const v = Number(e.target.value); setScheduleDurations((cur) => { const a = [...cur]; while (a.length <= index) a.push(90); a[index] = v; return a; }); }} required InputProps={{ startAdornment: <Clock3 size={15} className="mr-2 text-slate-400" /> }}>
                        {[60, 90, 120, 150, 180].map((m) => <MenuItem key={m} value={m}>{m} Minutes</MenuItem>)}
                      </TextField>
                      <TextField size="small" label="End Time" value={computeEndTime(scheduleTimes[index], scheduleDurations[index]) || '—'} InputProps={{ readOnly: true }} disabled InputLabelProps={{ shrink: true }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Auto Selection: only method picker ── */}
            {centerSelectionMode === 'auto' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Center Allocation Method</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[{ value: 'district', label: 'By District' }, { value: 'preference', label: 'By Preference' }].map(({ value, label }) => (
                    <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${allocationMethod === value ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                      <input type="radio" name="allocationMethod" value={value} checked={allocationMethod === value} onChange={() => setAllocationMethod(value)} className="h-4 w-4 accent-emerald-800" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── Custom Selection: center table + capacity + method ── */}
            {centerSelectionMode === 'custom' && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                      <tr><th className="w-12 px-4 py-3"></th><th className="px-4 py-3">Center Name</th><th className="px-4 py-3">District</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Allocated</th><th className="px-4 py-3 text-right">Remaining</th><th className="px-4 py-3">Start Date</th><th className="px-4 py-3">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {centers.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No exam centers found</td></tr>}
                      {pagedCenters.map((center) => (
                        <tr key={center.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3"><input type="checkbox" checked={selectedCenterIds.includes(center.id)} onChange={() => toggleCenter(center.id)} className="h-4 w-4 rounded border-slate-300 accent-emerald-800" /></td>
                          <td className="px-4 py-3 font-medium text-slate-800">{center.center}</td>
                          <td className="px-4 py-3 text-slate-600">{center.district}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{center.totalCapacity}</td>
                          <td className="px-4 py-3 text-right font-medium text-rose-600">{center.allocated}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">{center.capacity}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{scheduleDates[0] || '—'}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${center.capacity === 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>{center.capacity === 0 ? 'Full' : 'Available'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {centers.length > 0 && (
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{centers.length} center{centers.length === 1 ? '' : 's'}</span>
                    <Pagination page={centersPage} totalPages={centersTotalPages} onChange={setCentersPage} />
                  </div>
                )}
                <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${capacityPassed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                  {capacityPassed ? `Capacity check passed — ${selectedCapacity} seats for ${selectedApplicants} applicants.` : `Center capacity is short by ${capacityShortage} seats. Select more centers.`}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Center Allocation Method</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[{ value: 'district', label: 'By District' }, { value: 'preference', label: 'By Preference' }].map(({ value, label }) => (
                      <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${allocationMethod === value ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                        <input type="radio" name="allocationMethod" value={value} checked={allocationMethod === value} onChange={() => setAllocationMethod(value)} className="h-4 w-4 accent-emerald-800" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Queue progress (auto mode — visible while generating OR when there are errors) ── */}
            {centerSelectionMode === 'auto' && generationQueue.length > 0 && (generating || generationQueue.some(q => q.status === 'error')) && (
              <div className={`rounded-lg border p-4 space-y-3 ${generationQueue.some(q => q.status === 'error') && !generating ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {generating
                    ? <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    : <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
                  }
                  <p className="text-sm font-bold text-slate-800">
                    {generating ? 'Generating Roll Numbers — Queue' : 'Generation Errors — Center Configuration Required'}
                  </p>
                </div>
                <div className="space-y-2">
                  {generationQueue.map((item, qi) => (
                    <div key={item.zone} className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      item.status === 'done'       ? 'border-emerald-200 bg-emerald-50' :
                      item.status === 'processing' ? 'border-blue-200 bg-blue-50' :
                      item.status === 'error'      ? 'border-rose-200 bg-rose-50' :
                                                     'border-slate-200 bg-slate-50'
                    }`}>
                      <div className="flex-shrink-0">
                        {item.status === 'pending'    && <div className="h-5 w-5 rounded-full border-2 border-slate-300" />}
                        {item.status === 'processing' && <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
                        {item.status === 'done'       && <CheckCircle2 size={20} className="text-emerald-600" />}
                        {item.status === 'error'      && <AlertTriangle size={20} className="text-rose-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{item.label} Center</p>
                        <p className="text-xs text-slate-500 truncate">{item.centerName} · {item.total} candidate{item.total !== 1 ? 's' : ''}</p>
                        {item.error && <p className="mt-0.5 text-xs text-rose-600">{item.error}</p>}
                      </div>
                      <span className={`flex-shrink-0 text-xs font-bold ${
                        item.status === 'done'       ? 'text-emerald-700' :
                        item.status === 'error'      ? 'text-rose-700' :
                        item.status === 'processing' ? 'text-blue-700' :
                                                       'text-slate-400'
                      }`}>
                        {item.status === 'done' ? 'Done' : item.status === 'error' ? 'Error' : item.status === 'processing' ? 'Processing…' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer navigation ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" className="gap-2 bg-white" disabled={generating} onClick={() => setStage(1)}><ArrowLeft size={15} /> Back</Button>
              <Button
                className="gap-2"
                disabled={
                  generating ||
                  (examType === 'written-exams'
                    ? writtenExamSchedules.length === 0
                    : (scheduleDates.some((d) => !d) || scheduleTimes.some((t) => !t))
                  ) ||
                  (centerSelectionMode === 'custom' && (!capacityPassed || selectedCenterIds.length === 0))
                }
                onClick={generateRollNumbers}
              >
                <Send size={15} /> {generating ? 'Generating…' : 'Generate Roll Numbers'}
              </Button>
            </div>

            </fieldset>
          </CardContent></Card>
        )}

        {stage === 3 && (
          <Card className="rounded-lg">
            <CardContent className="space-y-6 p-6">

              {/* ── Success header ── */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle2 size={22} className="text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Roll Numbers Generated Successfully</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Examination slips are now linked to each candidate&apos;s dashboard for all applied posts under this batch.
                    </p>
                  </div>
                </div>
                <span className="flex-shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {s3UniqueCandidateCount} Candidate{s3UniqueCandidateCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* ── Batch summary ── */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Generated</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{s3UniqueCandidateCount}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exam Type</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{meta.badge}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Posts Clubbed</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{selectedPosts.length} Post{selectedPosts.length !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exam Date</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{scheduleDates[0] || generatedCandidates[0]?.start_date || '—'}</p>
                </div>
              </div>

              {/* ── Clubbed posts tags ── */}
              {selectedPosts.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Posts Included in This Batch</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPosts.map((post) => (
                      <span key={post.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {post.post}
                        {post.caseNo ? <span className="font-normal text-slate-400">· {post.caseNo}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Filters ── */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Filter Candidates</span>
                  {(s3Search || s3District || s3Gender || s3CnicFilter || s3Preference) && (
                    <button
                      type="button"
                      onClick={() => { setS3Search(''); setS3District(''); setS3Gender(''); setS3CnicFilter(''); setS3Preference(''); }}
                      className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      <X size={12} /> Clear All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <TextField
                    size="small" label="Search" placeholder="Name, CNIC, Ref ID"
                    value={s3Search} onChange={(e) => setS3Search(e.target.value)}
                    InputProps={{ startAdornment: <Search size={14} className="mr-2 text-slate-400" /> }}
                  />
                  <TextField
                    size="small" label="District / Zone"
                    value={s3District} onChange={(e) => setS3District(e.target.value)}
                    SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}
                    select
                  >
                    <option value="">All Districts</option>
                    {s3UniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </TextField>
                  <TextField
                    size="small" label="Gender"
                    value={s3Gender} onChange={(e) => setS3Gender(e.target.value)}
                    SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}
                    select
                  >
                    <option value="">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </TextField>
                  <TextField
                    size="small" label="CNIC" placeholder="e.g. 3110470679173"
                    value={s3CnicFilter} onChange={(e) => setS3CnicFilter(e.target.value)}
                  />
                  <TextField
                    size="small" label="Preference"
                    value={s3Preference} onChange={(e) => setS3Preference(e.target.value)}
                    SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}
                    select
                  >
                    <option value="">All Preferences</option>
                    {examCities.map(p => <option key={p} value={p}>{p}</option>)}
                  </TextField>
                </div>
                <p className="text-xs text-slate-400">
                  Showing {s3FilteredCandidates.length} of {s3UniqueCandidateCount} candidate{s3UniqueCandidateCount !== 1 ? 's' : ''}
                  {s3SelectedIds.size > 0 && ` · ${s3SelectedIds.size} selected`}
                </p>
              </div>

              {/* ── Candidates table ── */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-[90px] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={s3AllChecked}
                            ref={(el) => { if (el) el.indeterminate = s3SomeChecked; }}
                            onChange={toggleS3All}
                            className="h-4 w-4 rounded border-slate-300 accent-emerald-800"
                          />
                          <span>Sr No</span>
                        </div>
                      </th>
                      <th className="px-4 py-3">Applicant Name</th>
                      <th className="px-4 py-3">CNIC</th>
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">Center Name</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {s3FilteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                          {s3UniqueCandidateCount === 0 ? 'No candidates in this batch' : 'No candidates match the current filters'}
                        </td>
                      </tr>
                    )}
                    {s3FilteredCandidates.map((c, idx) => {
                      const isSelected = s3SelectedIds.has(c.id);
                      return (
                        <tr key={c.id} className={`transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleS3Candidate(c.id)}
                                className="h-4 w-4 rounded border-slate-300 accent-emerald-800"
                              />
                              <div className="flex flex-col leading-tight">
                                <span className="text-sm font-bold text-slate-700">{idx + 1}</span>
                                {c.roll && <span className="font-mono text-[10px] text-emerald-700">{c.roll}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-xs font-bold text-white">
                                {c.photo}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{c.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.cnic || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-sm font-bold text-emerald-800">
                              {c.roll || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{c.center || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{c.start_date || scheduleDates[0] || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-2">
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white px-3" onClick={() => viewSlip(c.roll)}>
                                <Eye size={13} /> View Slip
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white px-3" onClick={() => downloadSlip(c.id)}>
                                <Download size={13} /> Download
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Manual roll number reassignment ── */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Hash size={15} className="text-slate-600" />
                  <span className="text-sm font-semibold text-slate-800">Manual Roll Number Reassignment</span>
                  {s3SelectedList.length > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      {s3SelectedList.length} selected
                    </span>
                  )}
                  {s3SelectedList.length === 0 && (
                    <span className="ml-1 text-xs text-slate-400">Select candidates above to reassign their roll numbers</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
                  <TextField
                    size="small"
                    label="Roll No Start Sequence"
                    type="number"
                    placeholder="e.g. 10"
                    value={rollStartSeq}
                    onChange={(e) => setRollStartSeq(e.target.value)}
                    inputProps={{ min: 1 }}
                    helperText={
                      s3SelectedList.length > 0 && rollStartSeq
                        ? `Assigns ${s3SelectedList.length} sequential roll no${s3SelectedList.length !== 1 ? 's' : ''}`
                        : 'Starting number for the sequence'
                    }
                  />
                  <TextField
                    size="small"
                    label="Roll No End Sequence"
                    type="number"
                    value={s3EndSeq}
                    InputProps={{ readOnly: true }}
                    disabled
                    InputLabelProps={{ shrink: true }}
                    helperText="Auto-calculated from selection"
                  />
                  <TextField
                    size="small" label="Exam Center"
                    value={manualUpdateCenterId}
                    onChange={(e) => setManualUpdateCenterId(e.target.value)}
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                    helperText="Center to assign to selected candidates"
                    select
                  >
                    <option value="">Select Center</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.center}{c.district ? ` — ${c.district}` : ''}</option>
                    ))}
                  </TextField>
                  <Button
                    className="h-10 mb-[22px]"
                    disabled={updating || s3SelectedList.length === 0 || !rollStartSeq || !manualUpdateCenterId}
                    onClick={handleManualUpdate}
                  >
                    {updating ? 'Updating…' : 'Update'}
                  </Button>
                </div>
              </div>

              {/* ── Footer actions ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button variant="outline" className="gap-2 bg-white" onClick={() => setStage(s3BackStage)}>
                  <ArrowLeft size={15} /> {s3BackStage === 1 ? 'Back to Posts' : 'Back to Allocation'}
                </Button>
                <Button variant="outline" className="gap-2 bg-white" onClick={() => navigate('/dashboard/roll-numbers')}>
                  View All Slips <ArrowRight size={15} />
                </Button>
              </div>

            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RollNumberExamFlow;
