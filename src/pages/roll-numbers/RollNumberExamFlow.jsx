import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, Eye, Filter, Hash, MapPin, Plus, Search, Send, Users, X } from 'lucide-react';
import SearchableSelect from 'components/ui/SearchableSelect';
import { TextField } from '@mui/material';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberApi from 'api/rollNumberApi';
import WrittenExamSubjectApi from 'api/writtenExamSubjectApi';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { useGenerationGuard } from 'context/GenerationGuardContext';
import RollNumberGenerationMode from 'components/roll-numbers/RollNumberGenerationMode';
import PendingRangeCard from 'components/roll-numbers/PendingRangeCard';
import RollNumberProgressCard from 'components/roll-numbers/RollNumberProgressCard';
import { handleApiError } from 'utils/apiErrors';
import { showNotice } from 'components/ui/noticeDialog';

// "View Slip" opens a separate route (/dashboard/roll-numbers/slip/:rollNumber).
// Navigating there and pressing Back unmounts this page, so its stage/results
// state would normally reset — leaving the admin back on stage 1 instead of
// the generated-slips list. Persisting the stage-3 snapshot per exam type in
// sessionStorage (cleared on tab close, and on any intentional exit from this
// flow) lets the page restore exactly where the admin left it.
const STAGE3_SNAPSHOT_PREFIX = 'ajk_roll_number_stage3_';

const readStage3Snapshot = (examType) => {
  try {
    const raw = sessionStorage.getItem(`${STAGE3_SNAPSHOT_PREFIX}${examType}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearStage3Snapshot = (examType) => {
  try {
    sessionStorage.removeItem(`${STAGE3_SNAPSHOT_PREFIX}${examType}`);
  } catch {}
};

// The AJK district -> exam-center zone mapping and its resolvers used to
// live here, driving a client-side per-zone generation loop. The new
// resumable "Automatic -> District" allocation strategy resolves zones
// server-side instead (see CenterAllocationService::DISTRICT_ZONE_MAP on
// the backend, ported from this exact mapping) — nothing here calls these
// anymore.

const examTypeMeta = {
  'one-paper-mcqs': { title: 'One Paper MCQs Roll Number Management', badge: 'One Paper MCQs', description: 'Club one or multiple posts and generate one common roll number slip per candidate.', papers: ['One Paper'], testTypeFilter: (tt) => /mcq/i.test(tt) && !/two/i.test(tt) },
  'two-paper-mcqs': { title: 'Two Paper MCQs Roll Number Management', badge: 'Two Paper MCQs', description: 'Paper 1 and Paper 2 schedules remain separate, while selected jobs can be clubbed under one roll number.', papers: ['Paper 1', 'Paper 2'], testTypeFilter: (tt) => /mcq/i.test(tt) && /two/i.test(tt) },
  'written-exams': { title: 'Written Exams Roll Number Management', badge: 'Written Exams', description: 'Written exams roll number generation following the same allocation pattern.', papers: ['Written Exam'], testTypeFilter: (tt) => /written/i.test(tt) },
  'cce-exams': { title: 'CCE Screening Roll Number Management', badge: 'CCE Screening', description: 'CCE screening test roll number generation — the first stage of the CCE exam, following the same allocation pattern as One Paper MCQs.', papers: ['Screening Exam'], testTypeFilter: (tt) => /cce/i.test(tt) || /joint.competitive/i.test(tt) || /combined.competitive/i.test(tt) || /jce/i.test(tt) },
};

const DEFAULT_ROLL_PREFIXES = {
  'one-paper-mcqs': 'OPM',
  'two-paper-mcqs': 'TPM',
  'written-exams':  'WE',
  'cce-exams':      'CCE',
};

// Accepted exam_category values for each exam-type URL param.
// The DB exam_category values may not have a trailing 's', and CCE uses
// 'combined-competitive-exam' (the AJK advertisement/detail prefix) as well as
// 'joint-competitive-exam' in some installations — all variants are listed here.
const examCategoryAliases = {
  'one-paper-mcqs': new Set(['one-paper-mcq', 'one-paper-mcqs', 'one_paper_mcq', 'one_paper_mcqs']),
  'two-paper-mcqs': new Set(['two-paper-mcq', 'two-paper-mcqs', 'two_paper_mcq', 'two_paper_mcqs']),
  'written-exams':  new Set(['written-exam', 'written-exams', 'written_exam', 'written_exams']),
  'cce-exams':      new Set([
    'cce-exam', 'cce-exams', 'cce_exam', 'cce',
    'combined-competitive-exam', 'combined-competitive-exams', 'combined_competitive_exam', 'combined_competitive_exams',
    'joint-competitive-exam', 'joint_competitive_exam', 'jce',
  ]),
};


// Normalize IDs before comparing values returned from different APIs.
// Candidate API can return a numeric id, hash_id, ext_adv_id, or pivot id
// for the same post, while the advertisement API may expose another variant.
const normalizeId = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const uniqueIds = (values) => [...new Set(values.map(normalizeId).filter(Boolean))];

const normalizeLookupText = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const lookupKey = (prefix, value) => {
  const normalized = normalizeLookupText(value);
  return normalized ? `${prefix}:${normalized}` : '';
};

// Candidate and admin APIs do not always return the same post identifier.
// Include IDs plus stable business keys so applicant counts still match when
// one API returns hash_id and another returns ext_adv_id/numeric id.
const getCandidatePostIdentifiers = (app) => uniqueIds([
  // Candidate portal application shape
  app?.job_post?.ext_adv_id,
  app?.job_post?.hash_id,
  app?.job_post?.id,
  app?.job_post?.job_id,
  app?.job_post?.job_detail_id,
  app?.job_post?.ext_job_id,

  // Admin/received-application shape
  app?.job?.hash_id,
  app?.job?.id,
  app?.job?.job_detail_id,
  app?.job_detail?.hash_id,
  app?.job_detail?.id,
  app?.post?.hash_id,
  app?.post?.id,
  app?.post_id,
  app?.job_post_id,
  app?.job_id,
  app?.ext_adv_id,
  app?.job_detail_id,
  app?.advertisement_job_id,

  // Stable business keys — useful when the two APIs expose different IDs
  lookupKey(
    'case',
    app?.job_post?.case_number ??
      app?.job?.case_number ??
      app?.job_detail?.case_number ??
      app?.post?.case_number ??
      app?.case_number
  ),
  lookupKey(
    'post',
    app?.job_post?.designation ??
      app?.job_post?.post_title ??
      app?.job?.designation ??
      app?.job?.post_title ??
      app?.job_detail?.designation ??
      app?.job_detail?.post_title ??
      app?.post?.designation ??
      app?.post?.post_title ??
      app?.designation ??
      app?.post_title
  ),
]);

// Normalizes the applications response returned by the admin API endpoint
// used by getApplicationsByAdvertisement().
const extractAdminApplications = (response) => extractArray(
  response?.data?.applications?.data,
  response?.data?.applications,
  response?.data?.data?.applications?.data,
  response?.data?.data?.applications,
  response?.data?.data?.data,
  response?.data?.data,
  response?.applications?.data,
  response?.applications,
  response?.data,
  response,
);

// Convert an admin/received-application record into the same loose shape used
// by candidate-portal applications. Existing fields are preserved.
const normalizeApplicationForGeneration = (app) => {
  const personal = app?.snapshot_data ?? app?.personal_details ?? {};
  const candidate = app?.candidate ?? {};

  return {
    ...app,
    application_number:
      app?.application_number ??
      app?.application_no ??
      app?.applicationNumber ??
      '',
    snapshot_data: {
      ...personal,
      name:
        personal?.name ??
        personal?.candidate_name ??
        app?.candidate_name ??
        candidate?.name ??
        '',
      cnic:
        personal?.cnic ??
        personal?.candidate_cnic ??
        app?.candidate_cnic ??
        candidate?.cnic ??
        '',
      email:
        personal?.email ??
        personal?.candidate_email ??
        app?.candidate_email ??
        candidate?.email ??
        '',
      mobile_number:
        personal?.mobile_number ??
        personal?.mobile ??
        personal?.candidate_mobile ??
        app?.candidate_mobile ??
        candidate?.mobile_number ??
        candidate?.mobile ??
        '',
    },
    preferred_exam_cities: Array.isArray(app?.preferred_exam_cities)
      ? app.preferred_exam_cities
      : [],
    candidate: {
      ...candidate,
      documents: Array.isArray(candidate?.documents)
        ? candidate.documents
        : Array.isArray(app?.documents)
          ? app.documents
          : [],
    },
  };
};

const getJobIdentifiers = (job) => uniqueIds([
  job?.hash_id,
  job?.id,
  job?.ext_adv_id,
  job?.external_id,
  job?.job_detail_id,
  job?.pivot?.job_id,
  job?.pivot?.job_detail_id,
  job?.pivot?.ext_adv_id,
  lookupKey('case', job?.case_number),
  lookupKey('post', job?.designation ?? job?.post_title),
]);

const extractArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

const getAdvertisementJobs = (ad) => extractArray(
  ad?.job_details,
  ad?.jobDetails,
  ad?.jobs,
  ad?.posts,
  ad?.advertisement_jobs,
  ad?.advertisementJobs,
);

const extractApplicationsPage = (response) => {
  const payload = response?.data ?? response ?? {};

  const paginator =
    payload?.applications ??
    payload?.data?.applications ??
    payload?.data ??
    payload;

  const rows = extractArray(
    paginator?.data,
    paginator?.applications,
    paginator?.rows,
    payload?.applications?.data,
    payload?.data?.applications?.data,
  );

  return {
    rows,
    currentPage: Number(
      paginator?.current_page ??
      payload?.current_page ??
      1
    ) || 1,
    lastPage: Number(
      paginator?.last_page ??
      payload?.last_page ??
      1
    ) || 1,
  };
};

const addApplicationToIdentifierMap = (map, identifiers, applicationNumber) => {
  identifiers.forEach((identifier) => {
    if (!map[identifier]) map[identifier] = new Set();
    map[identifier].add(applicationNumber || `anonymous-${map[identifier].size}`);
  });
};

// Merge application sets for every identifier belonging to the same post.
// This remains correct even when some applications use numeric IDs and
// others use hash IDs or external advertisement-post IDs.
const countUniqueApplicationsForIdentifiers = (map, identifiers) => {
  const applications = new Set();
  identifiers.forEach((identifier) => {
    const values = map[identifier];
    if (values instanceof Set) values.forEach((value) => applications.add(value));
  });
  return applications.size;
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


const newWrittenSchedule = () => ({ id: Date.now() + Math.random(), date: '', startTime: '10:00', duration: 90, subjectId: '' });

// Returns 24-hour "HH:MM" — same format as the <input type="time"> start time —
// so it stays parseable downstream (slip views' to12Hour() and the backend's
// Carbon::createFromFormat('H:i', ...) both expect 24-hour input, not "1:00 PM").
const computeEndTime = (startTime, durationMinutes) => {
  if (!startTime || !durationMinutes) return '';
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const totalMinutes = h * 60 + m + Number(durationMinutes);
  const endH = Math.floor((totalMinutes / 60) % 24);
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

// 12-hour display formatting for the read-only "End Time" fields in this form.
const to12Hour = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

// The old one-shot flow's queue-job status poller lived here — the
// resumable batch flow polls RollNumberApi.getBatch()/getBatchRanges()
// instead (see refreshBatch() inside the component below), so this is no
// longer called from anywhere.

const RollNumberExamFlow = () => {
  const navigate = useNavigate();
  const { examType = 'one-paper-mcqs' } = useParams();
  const meta = examTypeMeta[examType] || examTypeMeta['one-paper-mcqs'];
  const { setBusy } = useGenerationGuard();

  // Read once per exam type — used only by the lazy useState initializers below.
  const stage3Snapshot = useMemo(() => readStage3Snapshot(examType), [examType]);
  const [stage, setStage] = useState(() => (stage3Snapshot ? 4 : 1));
  const [search, setSearch] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState(() => stage3Snapshot?.selectedPostIds || []);
  const [selectedCenterIds, setSelectedCenterIds] = useState([]);
  // Custom Selection: per-center roll-number range the admin types directly
  // (e.g. Center A: OPM-00001 -> OPM-05000, Center B: OPM-05001 -> OPM-05500)
  // instead of an auto-distributed pool — keyed by center.id.
  const [centerRanges, setCenterRanges] = useState({});
  const [generated, setGenerated] = useState(() => !!stage3Snapshot);
  const [allocationMethod, setAllocationMethod] = useState('district');
  const [centerSelectionMode, setCenterSelectionMode] = useState('auto');

  // ── Resumable batch flow state (Stage 2) ──────────────────────────────────
  // `batch` is the persistent generation-batch summary from the backend —
  // the actual source of truth for progress; nothing here is trusted as the
  // "real" state the way `batch.pending`/`batch.ready_for_slip_generation`
  // are (§9 Invariant 5 of the technical design).
  const [batch, setBatch] = useState(null);
  const [batchRanges, setBatchRanges] = useState(null);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [generatingRollNumbers, setGeneratingRollNumbers] = useState(false);
  const [allocatingCenters, setAllocatingCenters] = useState(false);
  const [generatingFinalSlips, setGeneratingFinalSlips] = useState(false);
  const batchPollRef = useRef(null);

  // Warn on tab close/refresh while a request to the batch API is actually
  // in flight — purely a courtesy against losing an in-progress click, NOT
  // a "don't close the browser" warning: the whole point of the resumable
  // batch flow is that closing the browser mid-job is safe and resumable.
  useEffect(() => {
    const busy = creatingBatch || generatingRollNumbers || allocatingCenters || generatingFinalSlips;
    if (!busy) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [creatingBatch, generatingRollNumbers, allocatingCenters, generatingFinalSlips]);

  // Stage 3 filter + manual-update state. Draft state is what the inputs
  // are bound to; it only takes effect (feeding s3FilteredCandidates below)
  // once Search is clicked — same deferred-apply convention as Stage 1's
  // post filter above.
  const [draftS3Search, setDraftS3Search] = useState('');
  const [draftS3District, setDraftS3District] = useState('');
  const [draftS3Gender, setDraftS3Gender] = useState('');
  const [draftS3CnicFilter, setDraftS3CnicFilter] = useState('');
  const [draftS3Preference, setDraftS3Preference] = useState('');
  const [s3Search, setS3Search] = useState('');
  const [s3District, setS3District] = useState('');
  const [s3Gender, setS3Gender] = useState('');
  const [s3CnicFilter, setS3CnicFilter] = useState('');
  const [s3Preference, setS3Preference] = useState('');

  const applyS3Filters = () => {
    setS3Search(draftS3Search);
    setS3District(draftS3District);
    setS3Gender(draftS3Gender);
    setS3CnicFilter(draftS3CnicFilter);
    setS3Preference(draftS3Preference);
  };
  const resetS3Filters = () => {
    setDraftS3Search(''); setDraftS3District(''); setDraftS3Gender(''); setDraftS3CnicFilter(''); setDraftS3Preference('');
    setS3Search(''); setS3District(''); setS3Gender(''); setS3CnicFilter(''); setS3Preference('');
  };
  const [s3SelectedIds, setS3SelectedIds] = useState(new Set());
  const [rollStartSeq, setRollStartSeq] = useState('');
  const [manualUpdateCenterId, setManualUpdateCenterId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [s3BackStage, setS3BackStage] = useState(() => stage3Snapshot?.s3BackStage ?? 3);
  const [scheduleDates, setScheduleDates] = useState(() => stage3Snapshot?.scheduleDates || meta.papers.map(() => ''));
  const [scheduleTimes, setScheduleTimes] = useState(() => meta.papers.map((_, i) => i === 1 ? '14:00' : '10:00'));
  const [scheduleDurations, setScheduleDurations] = useState(() => meta.papers.map((_, i) => i === 1 ? 120 : 90));
  const [rollPrefix, setRollPrefix] = useState(() => DEFAULT_ROLL_PREFIXES[examType] ?? '');
  // subjectId → { selected, date, startTime, duration }
  const [subjectSchedules, setSubjectSchedules] = useState({});
  const [writtenExamSubjects, setWrittenExamSubjects] = useState([]);
  const [testTypeSubjectsMap, setTestTypeSubjectsMap] = useState({}); // testTypeId → subject[]

  // Reset schedule state when exam type actually changes (same component,
  // different route param) — but NOT on first mount, which would otherwise
  // immediately wipe out scheduleDates just restored from a stage-3 snapshot.
  const prevExamTypeRef = useRef(examType);
  useEffect(() => {
    if (prevExamTypeRef.current === examType) return;
    prevExamTypeRef.current = examType;
    setScheduleDates(meta.papers.map(() => ''));
    setScheduleTimes(meta.papers.map((_, i) => i === 1 ? '14:00' : '10:00'));
    setScheduleDurations(meta.papers.map((_, i) => i === 1 ? 120 : 90));
    setRollPrefix(DEFAULT_ROLL_PREFIXES[examType] ?? '');
    setSubjectSchedules({});
  }, [examType]); // eslint-disable-line react-hooks/exhaustive-deps

  const [advertisements, setAdvertisements] = useState([]);
  const [centers, setCenters] = useState([]);
  const [examCities, setExamCities] = useState([]);
  const [generatedCandidates, setGeneratedCandidates] = useState(() => stage3Snapshot?.generatedCandidates || []);
  const [allCandidateApps, setAllCandidateApps] = useState([]);
  const [loading, setLoading] = useState(true);
  // Draft state is what the Stage 1 filter inputs are bound to; it only
  // takes effect (feeding filteredPosts below) once Search is clicked —
  // typing/selecting alone does nothing, matching AdvancedFilter's
  // deferApply convention used elsewhere in the admin. The cascading
  // Advertisement → Department → Post narrowing still reacts live off the
  // draft, since that only affects which options are offered next, not the
  // results table itself.
  const [draftFilterAdvertisement, setDraftFilterAdvertisement] = useState('all');
  const [draftFilterPost, setDraftFilterPost] = useState('all');
  const [draftFilterDepartment, setDraftFilterDepartment] = useState('all');
  const [draftSearch, setDraftSearch] = useState('');
  const [filterAdvertisement, setFilterAdvertisement] = useState('all');
  const [filterPost, setFilterPost] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [stage]);

  // Keep the stage-3 snapshot (used to restore this page after "View Slip" → Back)
  // up to date while the admin is on stage 3 — e.g. after a manual roll number
  // reassignment updates generatedCandidates.
  useEffect(() => {
    if (stage !== 4) return;
    try {
      sessionStorage.setItem(
        `${STAGE3_SNAPSHOT_PREFIX}${examType}`,
        JSON.stringify({ generatedCandidates, selectedPostIds, scheduleDates, s3BackStage })
      );
    } catch {}
  }, [stage, examType, generatedCandidates, selectedPostIds, scheduleDates, s3BackStage]);

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

  // The candidate portal API is slow and rate-limit-sensitive, and this call
  // runs alongside ~9 other requests in fetchData's Promise.all. Firing every
  // page at once (as before) plus no HTTP-status check meant a transient
  // timeout/429/5xx on any single page silently collapsed the whole result to
  // `[]` — the table would then look empty even though applications exist.
  // Each page now gets its own retry + status check, and pages are fetched in
  // small batches instead of all at once so a burst of parallel requests
  // doesn't get throttled or dropped by the portal.
  const fetchAllCandidateApps = useCallback(async () => {
    const headers = {
      Accept: 'application/json',
      'X-API-KEY': Config.candidateApiKey,
    };

    const fetchPage = async (page = 1) => {
      const url = `${Config.candidateApiUrl}/applications?per_page=100&page=${page}`;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await fetchWithTimeout(
            url,
            { headers, cache: 'no-store' },
            30000
          );

          if (!res.ok) {
            throw new Error(`Candidate applications API returned HTTP ${res.status}`);
          }

          const json = await res.json();
          const normalized = extractApplicationsPage(json);

          if (process.env.NODE_ENV !== 'production') {
            console.log(`[RollNumberExamFlow] Candidate applications page ${page}`, {
              rows: normalized.rows.length,
              currentPage: normalized.currentPage,
              lastPage: normalized.lastPage,
              rawResponse: json,
            });
          }

          return normalized;
        } catch (err) {
          if (attempt === 2) {
            console.warn(`Candidate API fetch failed (page ${page}):`, err?.message);
            return { rows: [], currentPage: page, lastPage: page };
          }
        }
      }

      return { rows: [], currentPage: page, lastPage: page };
    };

    const firstPage = await fetchPage(1);
    let allApps = [...firstPage.rows];

    if (firstPage.lastPage > 1) {
      const pageNumbers = Array.from(
        { length: firstPage.lastPage - 1 },
        (_, index) => index + 2
      );
      const concurrency = 3;

      for (let index = 0; index < pageNumbers.length; index += concurrency) {
        const batch = pageNumbers.slice(index, index + concurrency);
        const results = await Promise.all(batch.map(fetchPage));
        results.forEach((result) => {
          allApps = allApps.concat(result.rows);
        });
      }
    }

    const uniqueApps = [];
    const seenApps = new Set();

    allApps.forEach((app, index) => {
      const key =
        normalizeId(app?.application_number) ||
        normalizeId(app?.hash_id) ||
        normalizeId(app?.id) ||
        `application-${index}`;

      if (seenApps.has(key)) return;
      seenApps.add(key);
      uniqueApps.push(app);
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[RollNumberExamFlow] Total unique candidate applications:', uniqueApps.length);
      console.table(
        uniqueApps.slice(0, 20).map((app) => ({
          application_number: app?.application_number || '',
          post_name:
            app?.job_post?.designation ||
            app?.job_post?.post_title ||
            app?.designation ||
            app?.post_title ||
            '',
          post_identifiers: getCandidatePostIdentifiers(app).join(', '),
        }))
      );
    }

    return uniqueApps;
  }, [fetchWithTimeout]);

  // Guards against a slow, stale fetchData call (e.g. from a previous
  // examType before the admin switched tabs) resolving after a newer one and
  // clobbering fresher state with outdated data — only the fetch whose id
  // still matches the ref when it reaches a setState point is allowed to commit.
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    const isStale = () => requestId !== fetchIdRef.current;
    setLoading(true);
    try {
      const adminHeaders = {
        Accept: 'application/json',
        'X-API-KEY': Config.apiKey,
        Authorization: `Bearer ${AuthService.getToken()}`,
      };
      const candidateHeaders = { Accept: 'application/json', 'X-API-KEY': Config.candidateApiKey };

      const [adsResult, centersResult, testTypesRes, gradesRes, candidateApps, utilizationResult, citiesRes, writtenSubjectsRes, designationsRes] = await Promise.all([
        RollNumberApi.getAdvertisementsWithJobs(200).catch((e) => { console.error('[RollNumberExamFlow] getAdvertisementsWithJobs failed:', e?.message); return {}; }),
        RollNumberApi.getExamCenters(500),
        fetch(`${Config.apiUrl}/settings/test-types?per_page=200`, { headers: adminHeaders }).then(r => r.json()).catch(() => ({})),
        fetch(`${Config.apiUrl}/settings/grades?per_page=200`, { headers: adminHeaders }).then(r => r.json()).catch(() => ({})),
        fetchAllCandidateApps(),
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

        if (isStale()) return;
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

      // Count candidate applications against every post identifier returned by
      // the candidate API. Sets prevent duplicate counting when one application
      // contains multiple aliases for the same post.
      const jobPostApplicationsMap = {};       // identifier → Set(application_number)
      const generatedApplicationsMap = {};     // identifier → Set(application_number)
      const candidateAppsAvailable = Array.isArray(candidateApps) && candidateApps.length > 0;

      if (candidateAppsAvailable) {
        candidateApps.forEach((app, appIndex) => {
          const identifiers = getCandidatePostIdentifiers(app);
          if (identifiers.length === 0) return;

          const applicationKey = normalizeId(app.application_number) || `candidate-${appIndex}`;
          addApplicationToIdentifierMap(jobPostApplicationsMap, identifiers, applicationKey);

          if (generatedAppsSet.has(app.application_number)) {
            addApplicationToIdentifierMap(generatedApplicationsMap, identifiers, applicationKey);
          }
        });
      }
      if (isStale()) return;
      setAllCandidateApps(candidateAppsAvailable ? candidateApps : []);

      const allAds = extractArray(
        adsResult?.data?.data?.data,
        adsResult?.data?.data,
        adsResult?.data?.advertisements?.data,
        adsResult?.data?.advertisements,
        adsResult?.advertisements?.data,
        adsResult?.advertisements,
        adsResult?.data,
        adsResult,
      );

      const validCategories = examCategoryAliases[examType] ?? new Set([examType]);

      const matchedAds = allAds
        .map((ad) => {
          const jobs = getAdvertisementJobs(ad).filter((job) => {
            const pivotHt  = String(job.pivot?.test_type || '');
            const jobHt    = String(job.test_type || '');

            // 1. Direct exam_category match via alias set (handles 's' suffix + CCE naming)
            const pivotCat = (job.pivot?.test_type_exam_category || examCategoryMap[pivotHt] || '')
              .toLowerCase().replace(/[\s_]+/g, '-');
            const jobCat   = (job.resolved_test_type_exam_category || examCategoryMap[jobHt] || '')
              .toLowerCase().replace(/[\s_]+/g, '-');
            if (pivotCat && validCategories.has(pivotCat)) return true;
            if (jobCat   && validCategories.has(jobCat))   return true;

            // 2. Regex match on resolved name — deliberately NOT falling back to
            // the raw job.test_type/pivot.test_type reference itself. Those are
            // hash_id references, not names, and a corrupted/legacy value (e.g.
            // the literal string "MCQs Base" some old requisitions were saved
            // with) can coincidentally match one of these regexes (contains
            // "mcq"), silently mis-tagging the job into the wrong section. If
            // nothing resolved to a real TestType name, treat it as untagged
            // instead — it'll be picked up by the untagged-jobs fallback below.
            const resolved =
              job.pivot?.test_type_name ||
              job.resolved_test_type_name ||
              testTypeMap[pivotHt] ||
              testTypeMap[jobHt] ||
              '';
            return resolved ? meta.testTypeFilter(resolved) : false;
          });
          if (jobs.length === 0) return null;
          return { ad, jobs };
        })
        .filter(Boolean);

      // Debug: log as JSON string so values are immediately readable
      if (process.env.NODE_ENV !== 'production') {
        const dbg = getAdvertisementJobs(allAds[0]).slice(0, 2).map(j => ({
          designation: j.designation,
          designation_id: j.designation_id,
          designation_hash_id: j.designation_hash_id,
          job_hash_id: j.hash_id,
          job_id: j.id,
          test_type: j.test_type,
          pivot_test_type: j.pivot?.test_type,
        }));
        // console.group(`[RollNumberExamFlow] examType=${examType} matched ${matchedAds.length}/${allAds.length}`);
        // console.log('testTypeMap:', JSON.stringify(testTypeMap));
        // console.log('first ad jobs:', JSON.stringify(dbg, null, 2));
        // console.groupEnd();
      }

      // Fallback: many advertisements' jobs have never been tagged with ANY
      // test type at all (neither pivot.test_type nor job_details.test_type
      // set) — dropping the fallback entirely (as a previous fix did, to stop
      // Two Paper MCQs posts leaking into Written Exams) made every section
      // show nothing whenever a whole dataset was untagged. This fallback
      // only ever includes jobs with NO test type reference on either field
      // — a job explicitly tagged with a *different*, specific exam type is
      // never included here, so cross-contamination still can't happen.
      const untaggedAds = matchedAds.length > 0
        ? []
        : allAds
            .map((ad) => {
              const jobs = getAdvertisementJobs(ad).filter((job) => {
                const pivotHt = String(job.pivot?.test_type || '');
                const jobHt   = String(job.test_type || '');
                return !pivotHt && !jobHt;
              });
              if (jobs.length === 0) return null;
              return { ad, jobs };
            })
            .filter(Boolean);

      const adsToUse = matchedAds.length > 0 ? matchedAds : untaggedAds;

      const filtered = adsToUse.map(({ ad, jobs }) => {
        const adKey = ad.hash_id || String(ad.id);

        return {
          id: adKey,
          advertisement: ad.adv_number
            ? (/^advertisement\b/i.test(String(ad.adv_number).trim()) ? String(ad.adv_number).trim() : `Advertisement ${ad.adv_number}`)
            : `Advertisement #${ad.id}`,
          meta: meta.badge,
          posts: jobs.map((job) => {
            // A candidate application's `ext_adv_id` (from the portal's job_post)
            // can be the parent Advertisement's hash_id rather than this specific
            // JobDetail's hash_id (see backend RollNumberSlipService::
            // resolveLocalAdvertisementFromPortal). That's only safe to treat as
            // "this post" when the advertisement has exactly one post — otherwise
            // it would wrongly match applications meant for a sibling post.
            const jobIdentifiers = jobs.length === 1
              ? uniqueIds([...getJobIdentifiers(job), adKey, String(ad.id)])
              : getJobIdentifiers(job);
            const jobId = jobIdentifiers[0] || normalizeId(job.hash_id || job.id);
            const deptName = job.department_label || 'N/A';
            const rawScale = gradeMap[job.scale] || job.scale || '';
            const scaleDisplay = rawScale ? (rawScale.toUpperCase().startsWith('BPS') ? rawScale : `BPS-${rawScale}`) : '';

            const candidateApiTotal = countUniqueApplicationsForIdentifiers(
              jobPostApplicationsMap,
              jobIdentifiers
            );
            const candidateApiGenerated = countUniqueApplicationsForIdentifiers(
              generatedApplicationsMap,
              jobIdentifiers
            );

            // Prefer an exact post-level count from the admin API when the
            // candidate API is unavailable. Never divide advertisement totals
            // equally across posts because each post can have a different count.
            const backendPostTotal = Number(
              job.total_applications ??
              job.applications_count ??
              job.total_applicants ??
              job.applicants_count ??
              job.received_applications_count ??
              job.pivot?.total_applications ??
              job.pivot?.applications_count ??
              0
            );

            const totalCount = candidateApiTotal > 0
              ? candidateApiTotal
              : backendPostTotal;
            const generatedCount = candidateApiGenerated;
            const pendingCount = Math.max(0, totalCount - generatedCount);

            return {
              id: jobId,
              matchingIds: jobIdentifiers,
              post: job.designation || job.post_title || 'Untitled Post',
              caseNo: job.case_number ? `Case ${job.case_number} | ${scaleDisplay}` : scaleDisplay,
              scale: scaleDisplay,
              totalPosts: Number(job.pivot?.num_posts ?? job.num_posts) || 0,
              department: deptName,
              applicants: pendingCount,      // candidates without a roll number (used for capacity check)
              generatedCount,                // candidates with a roll number already
              totalApplicants: totalCount,
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

      if (process.env.NODE_ENV !== 'production') {
        console.table(
          filtered.flatMap((advertisement) =>
            advertisement.posts.map((post) => ({
              examType,
              advertisement: advertisement.advertisement,
              advertisementId: advertisement.id,
              post: post.post,
              postId: post.id,
              matchingIds: post.matchingIds?.join(', '),
              testTypeId: post.testTypeId,
              totalApplicants: post.totalApplicants,
              pendingApplicants: post.applicants,
              generatedCount: post.generatedCount,
            }))
          )
        );
      }

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
      if (!isStale()) handleApiError(err, { fallback: 'Failed to load data' });
    } finally {
      if (!isStale()) setLoading(false);
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

  // Show a post only if it has at least one application in total (pending or
  // already roll-numbered) — applies the same rule across One Paper MCQs,
  // Two Paper MCQs, Written Exams, and CCE Screening, since they all share
  // this component. Hide only when total applications are truly zero.
  //
  // This used to only apply when the external candidate-portal fetch
  // returned at least one application anywhere (hasCandidateData), as a
  // safety net so a transient portal outage wouldn't hide every post. But
  // `totalApplicants` already has its own safe fallback independent of that
  // fetch (candidateAppsAvailable ? totalCount : perPostFallback, sourced
  // from the admin backend's own advertisement application count — see
  // `perPostFallback` above) — so gating on hasCandidateData too meant that
  // whenever the portal fetch came back empty (including the very normal
  // case of genuinely zero applications system-wide), EVERY post showed
  // regardless of its real applicant count. Filtering directly on
  // totalApplicants removes that unconditional escape hatch.
  const postHasActivity = (post) => Number(post?.totalApplicants ?? post?.applicants ?? 0) > 0;

  const availableAdvertisements = useMemo(() =>
    advertisements.filter((ad) => ad.posts.some(postHasActivity)),
  [advertisements]);

  // Cascade: departments available under the currently selected advertisement
  const availableDepartments = useMemo(() => {
    const pool = draftFilterAdvertisement === 'all'
      ? allPosts
      : allPosts.filter((p) => p.advertisementId === draftFilterAdvertisement);
    return [...new Set(pool.filter(postHasActivity).map((p) => p.department).filter(Boolean))];
  }, [allPosts, draftFilterAdvertisement]);

  // Cascade: posts available under the currently selected advertisement + department
  const availablePosts = useMemo(() =>
    allPosts.filter((p) => {
      if (!postHasActivity(p)) return false;
      if (draftFilterAdvertisement !== 'all' && p.advertisementId !== draftFilterAdvertisement) return false;
      if (draftFilterDepartment !== 'all' && p.department !== draftFilterDepartment) return false;
      return true;
    }),
  [allPosts, draftFilterAdvertisement, draftFilterDepartment]);

  // Reset child filters when parent selection changes
  useEffect(() => { setDraftFilterDepartment('all'); setDraftFilterPost('all'); }, [draftFilterAdvertisement]);
  useEffect(() => { setDraftFilterPost('all'); }, [draftFilterDepartment]);

  const applyPostFilters = () => {
    setSearch(draftSearch);
    setFilterAdvertisement(draftFilterAdvertisement);
    setFilterDepartment(draftFilterDepartment);
    setFilterPost(draftFilterPost);
  };
  const resetPostFilters = () => {
    setDraftSearch(''); setDraftFilterAdvertisement('all'); setDraftFilterPost('all'); setDraftFilterDepartment('all');
    setSearch(''); setFilterAdvertisement('all'); setFilterPost('all'); setFilterDepartment('all');
  };

  const filteredPosts = useMemo(() => {
    return advertisements.map((ad) => {
      if (filterAdvertisement !== 'all' && ad.id !== filterAdvertisement) return null;
      const posts = ad.posts.filter((post) => {
        if (!postHasActivity(post)) return false;
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
      setStage(4);
    } catch (err) {
      toast.dismiss(tid);
      handleApiError(err, { fallback: 'Failed to load generated slips' });
    }
  }, [allCandidateApps, centers]);

  // ── Resumable batch flow ─────────────────────────────────────────────────
  // Resolves the concrete list of applications behind `selectedPosts`,
  // reusing every fallback this screen already relied on (candidate-portal
  // cache -> admin advertisement-applications endpoint -> single-post
  // advertisement-scoped fallback). Unrelated to roll number/center
  // allocation, so it's needed unchanged by the new flow — only what
  // happens AFTER this resolves has changed.
  const resolveSelectedApplications = async () => {
    const selectedPostIdentifierSet = new Set(
      selectedPosts.flatMap((post) =>
        uniqueIds([
          post.id,
          ...(post.matchingIds || []),
          lookupKey('case', post.caseNo),
          lookupKey('post', post.post),
        ])
      )
    );

    const isApplicationForSelectedPost = (app) =>
      getCandidatePostIdentifiers(app)
        .some((identifier) => selectedPostIdentifierSet.has(identifier));

    let matchedApps = allCandidateApps
      .filter(isApplicationForSelectedPost)
      .map(normalizeApplicationForGeneration);

    if (matchedApps.length === 0) {
      const selectedByAdvertisement = selectedPosts.reduce((groups, post) => {
        const advertisementId = normalizeId(post.advertisementId);
        if (!advertisementId) return groups;
        if (!groups[advertisementId]) groups[advertisementId] = [];
        groups[advertisementId].push(post);
        return groups;
      }, {});

      const adminFallbackApps = [];

      for (const [advertisementId, postsForAdvertisement] of Object.entries(selectedByAdvertisement)) {
        try {
          const response = await RollNumberApi.getApplicationsByAdvertisement(
            advertisementId,
            { per_page: 1000 }
          );
          const rows = extractAdminApplications(response);

          const allPostsForAdvertisement = allPosts.filter(
            (post) => normalizeId(post.advertisementId) === advertisementId
          );
          const mayUseAdvertisementScopedRows =
            postsForAdvertisement.length === 1 &&
            allPostsForAdvertisement.length === 1;

          rows.forEach((rawApp) => {
            const app = normalizeApplicationForGeneration(rawApp);
            const identifiers = getCandidatePostIdentifiers(app);
            const hasUsablePostIdentifier = identifiers.length > 0;
            const exactMatch = identifiers.some((identifier) =>
              selectedPostIdentifierSet.has(identifier)
            );

            if (exactMatch || (!hasUsablePostIdentifier && mayUseAdvertisementScopedRows)) {
              adminFallbackApps.push(app);
            }
          });
        } catch (error) {
          console.warn(
            `[RollNumberExamFlow] Could not load applications for advertisement ${advertisementId}:`,
            error?.message || error
          );
        }
      }

      matchedApps = adminFallbackApps;
    }

    if (matchedApps.length === 0 && selectedPosts.length === 1) {
      const onlyPost = selectedPosts[0];
      try {
        const response = await RollNumberApi.getApplicationsByAdvertisement(
          onlyPost.advertisementId,
          { per_page: 1000 }
        );
        const rows = extractAdminApplications(response)
          .map(normalizeApplicationForGeneration);

        const allPostsForAdvertisement = allPosts.filter(
          (post) => normalizeId(post.advertisementId) === normalizeId(onlyPost.advertisementId)
        );

        if (allPostsForAdvertisement.length === 1) {
          matchedApps = rows;
        }
      } catch (error) {
        console.warn('[RollNumberExamFlow] Final application fallback failed:', error);
      }
    }

    const seen = new Set();
    const uniqueApps = matchedApps.filter((app, index) => {
      const applicationNumber = normalizeId(app.application_number);
      const key = applicationNumber || normalizeId(app.id) || `application-${index}`;
      if (!applicationNumber || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueApps.length === 0) {
      console.group('[RollNumberExamFlow] No applications matched — diagnostic dump');
      console.log('selectedPosts:', selectedPosts.map((post) => ({
        post: post.post,
        id: post.id,
        advertisementId: post.advertisementId,
        matchingIds: post.matchingIds,
      })));
      console.log('selectedPostIdentifierSet:', [...selectedPostIdentifierSet]);
      console.log('allCandidateApps.length:', allCandidateApps.length);
      console.log('sample candidate identifiers:', allCandidateApps.slice(0, 10).map((app) => ({
        application_number: app.application_number,
        computedIdentifiers: getCandidatePostIdentifiers(app),
      })));
      console.groupEnd();
      toast.error('No applications found for the selected posts. The application records are not linked with the selected post identifier.');
      return null;
    }

    return uniqueApps;
  };

  // candidates[] auto-sync payload for one application — same shape
  // RollNumberGenerationService::syncMissingApplications() expects, ported
  // from the old flow's buildCandidate().
  const buildCandidateForSync = useCallback((app) => {
    const personal = app.snapshot_data || app.personal_details || {};
    const documents = app.candidate?.documents || app.documents || [];

    return {
      application_number: app.application_number,
      candidate_name: personal.name || personal.candidate_name || app.candidate_name || app.candidate?.name || '',
      candidate_cnic: personal.cnic || personal.candidate_cnic || app.candidate_cnic || app.candidate?.cnic || '',
      candidate_email: personal.email || personal.candidate_email || app.candidate_email || app.candidate?.email || '',
      candidate_mobile: personal.mobile_number || personal.mobile || personal.candidate_mobile || app.candidate_mobile || app.candidate?.mobile_number || app.candidate?.mobile || '',
      // Laravel validation requires both external identifiers to be strings.
      ext_adv_id: normalizeId(app.job_post?.ext_adv_id ?? app.ext_adv_id ?? app.job_detail_id ?? selectedPosts[0]?.id ?? ''),
      ext_advertisement_id: normalizeId(app.job_post?.ext_advertisement_id ?? app.ext_advertisement_id ?? app.advertisement_id ?? selectedPosts[0]?.advertisementId ?? ''),
      preferred_exam_cities: (app.preferred_exam_cities || [])
        .map((city) => typeof city === 'string' ? city : (city?.city || city?.name || ''))
        .filter(Boolean),
      personal_details: personal,
      documents: (Array.isArray(documents) ? documents : [])
        .map((document) => ({
          doc_type: document.doc_type || document.type || '',
          file_url: document.file_url || document.url || document.path || '',
        }))
        .filter((document) => document.doc_type && document.file_url),
    };
  }, [selectedPosts]);

  // Creates the persistent batch as soon as Stage 2 is entered — before any
  // schedule/center configuration — matching the resumable design's
  // "POST / Generate Roll Numbers" step happening first, ahead of center
  // allocation, with its own persistent record from that point on.
  const prepareBatch = useCallback(async () => {
    if (batch || creatingBatch) return;
    setCreatingBatch(true);
    setBusy(true, 'Preparing roll number batch…');
    try {
      const uniqueApps = await resolveSelectedApplications();
      if (!uniqueApps) { setStage(1); return; }

      const res = await RollNumberApi.createBatch({
        exam_type: examType,
        application_numbers: uniqueApps.map((a) => a.application_number),
        candidates: uniqueApps.map(buildCandidateForSync),
      });
      setBatch(res?.data || null);
    } catch (err) {
      handleApiError(err, { fallback: 'Failed to create batch' });
      setStage(1);
    } finally {
      setCreatingBatch(false);
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, creatingBatch, examType, selectedPosts]);

  useEffect(() => {
    if (stage === 2 && !batch && !creatingBatch) prepareBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const refreshBatch = useCallback(async () => {
    if (!batch?.hash_id) return;
    try {
      const [batchRes, rangesRes] = await Promise.all([
        RollNumberApi.getBatch(batch.hash_id),
        RollNumberApi.getBatchRanges(batch.hash_id).catch(() => null),
      ]);
      setBatch(batchRes?.data || null);
      if (rangesRes) setBatchRanges(rangesRes.data);
    } catch (err) {
      // Non-fatal — the next poll tick / manual refresh retries.
    }
  }, [batch?.hash_id]);

  // Poll only while a background job is genuinely running (§62) — never the
  // source of truth itself, just what keeps this screen fresh without a
  // manual reload while roll numbers/centers are being processed.
  useEffect(() => {
    clearTimeout(batchPollRef.current);
    const inProgress = batch && ['roll_numbers_generating', 'center_allocation_in_progress', 'slips_generating'].includes(batch.status);
    if (inProgress) {
      batchPollRef.current = setTimeout(refreshBatch, 3000);
    }
    return () => clearTimeout(batchPollRef.current);
  }, [batch, refreshBatch]);

  const handleGenerateRollNumbers = async (mode, startingNumber) => {
    if (!batch?.hash_id) return;
    setGeneratingRollNumbers(true);
    setBusy(true, 'Generating roll numbers…');
    try {
      await RollNumberApi.generateRollNumbers(batch.hash_id, { mode, starting_number: startingNumber });
      toast.success('Roll number generation started');
      await refreshBatch();
    } catch (err) {
      handleApiError(err, { fallback: 'Failed to generate roll numbers' });
    } finally {
      setGeneratingRollNumbers(false);
      setBusy(false);
    }
  };

  // Same papers/exam_date/attendance_time payload the old one-shot flow
  // built from these same schedule inputs — now sent to the new
  // allocate-center endpoints instead of generateSlips.
  const buildSchedulePayload = () => {
    const papers = examType === 'written-exams'
      ? writtenExamSchedules.map((sch) => ({
          label: availableSubjectsForSchedule.find((s) => s.id === sch.subjectId)?.name
              || writtenExamSubjects.find((s) => s.id === sch.subjectId)?.name
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
        })).filter((p) => p.date || p.time);

    const examDate = examType === 'written-exams' ? (writtenExamSchedules[0]?.date || null) : (scheduleDates[0] || null);
    const attendanceTime = examType === 'written-exams' ? (writtenExamSchedules[0]?.startTime || null) : (scheduleTimes[0] || null);

    return { papers, examDate, attendanceTime };
  };

  const validateSchedule = () => {
    if (examType === 'written-exams') {
      if (writtenExamSchedules.length === 0) { toast.error('Select at least one subject schedule'); return false; }
      for (const sch of writtenExamSchedules) {
        if (!sch.date) { toast.error('All subject schedules must have a date'); return false; }
        if (!sch.startTime) { toast.error('All subject schedules must have a start time'); return false; }
      }
    } else {
      for (let i = 0; i < meta.papers.length; i++) {
        if (!scheduleDates[i]) { toast.error(`${meta.papers[i]} Schedule: Start Date is required`); return false; }
        if (!scheduleTimes[i]) { toast.error(`${meta.papers[i]} Schedule: Start Time is required`); return false; }
      }
    }
    if (centerSelectionMode === 'custom' && selectedCenterIds.length === 0) {
      toast.error('Select at least one exam center');
      return false;
    }
    return true;
  };

  // "Auto Selection" (district/preference) — full server-side automatic
  // distribution across every active center, or across allocationMethod's
  // chosen strategy.
  const handleAllocateCenters = async () => {
    if (!batch?.hash_id || !validateSchedule()) return;
    const { papers, examDate, attendanceTime } = buildSchedulePayload();

    setAllocatingCenters(true);
    setBusy(true, 'Allocating exam centers…');
    try {
      await RollNumberApi.allocateAutomatic(batch.hash_id, {
        strategy: allocationMethod,
        exam_date: examDate,
        attendance_time: attendanceTime,
        papers: papers.length ? papers : undefined,
      });
      toast.success('Center allocation started');
      await refreshBatch();
    } catch (err) {
      handleApiError(err, { fallback: 'Failed to allocate centers' });
    } finally {
      setAllocatingCenters(false);
      setBusy(false);
    }
  };

  const updateCenterRange = (centerId, field, value) => {
    setCenterRanges((prev) => ({ ...prev, [centerId]: { ...(prev[centerId] || { start: '', end: '' }), [field]: value } }));
  };

  // Same numeric-suffix extraction the backend uses (CenterAllocationService::extractNumericPart)
  // — lets the range/capacity check work regardless of exam-type prefix (OPM/TPM/WE/CCE).
  const parseRollSeq = (roll) => {
    const m = String(roll || '').match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  };

  const rangeRequestedCount = (start, end) => {
    const s = parseRollSeq(start);
    const e = parseRollSeq(end);
    return (s !== null && e !== null && e >= s) ? (e - s + 1) : null;
  };

  // "Custom Selection" — the admin types an explicit roll-number range
  // directly against each center row (e.g. Center A: OPM-00001 -> OPM-05000),
  // one allocateCustom() call per filled-in row, instead of an
  // auto-distributed pool. Each call re-validates capacity server-side
  // (CenterAllocationService::allocateCustomRange) regardless of this
  // client-side pre-check, which only exists to fail fast with a clear
  // message before making any request.
  const handleAllocateCustomRanges = async () => {
    if (!batch?.hash_id || !validateSchedule()) return;

    const rows = centers.filter((c) => selectedCenterIds.includes(c.id) && centerRanges[c.id]?.start && centerRanges[c.id]?.end);
    if (rows.length === 0) {
      toast.error('Check at least one center and enter its start/end roll number.');
      return;
    }

    for (const c of rows) {
      const { start, end } = centerRanges[c.id];
      const requested = rangeRequestedCount(start, end);
      if (requested === null) {
        await showNotice({
          tone: 'warning',
          title: 'Invalid roll number range',
          message: `${c.center}: the start roll number must come before (or equal) the end roll number, and both must end with digits (e.g. start OPM-00001, end OPM-05000).`,
          details: [{ label: 'Start', value: start }, { label: 'End', value: end }],
        });
        return;
      }
      if (requested > c.capacity) {
        await showNotice({
          tone: 'warning',
          title: c.capacity === 0 ? 'Center is full' : 'Center capacity exceeded',
          message: c.capacity === 0
            ? `${c.center} is full — every seat is already allocated. Choose another center.`
            : `${c.center} does not have enough seats for this range. Reduce the range or choose another center.`,
          details: [
            { label: 'Center', value: c.center },
            { label: 'Total capacity', value: c.totalCapacity },
            { label: 'Already allocated', value: Math.max(0, (c.totalCapacity || 0) - c.capacity) },
            { label: 'Remaining capacity', value: c.capacity },
            { label: 'Requested allocation', value: requested },
          ],
        });
        return;
      }
    }

    const { papers, examDate, attendanceTime } = buildSchedulePayload();

    setAllocatingCenters(true);
    setBusy(true, 'Allocating exam centers…');
    try {
      for (const c of rows) {
        const { start, end } = centerRanges[c.id];
        await RollNumberApi.allocateCustom(batch.hash_id, {
          center_id: c.id,
          start_roll_number: start.trim(),
          end_roll_number: end.trim(),
          exam_date: examDate,
          attendance_time: attendanceTime,
          papers: papers.length ? papers : undefined,
        });
      }
      toast.success(`Centers allocated for ${rows.length} range${rows.length === 1 ? '' : 's'}`);
      setCenterRanges({});
      await refreshBatch();
    } catch (err) {
      handleApiError(err, { fallback: 'Failed to allocate centers' });
    } finally {
      setAllocatingCenters(false);
      setBusy(false);
    }
  };

  const handleGenerateFinalSlips = async () => {
    if (!batch?.hash_id) return;
    setGeneratingFinalSlips(true);
    setBusy(true, 'Generating roll number slips…');
    try {
      await RollNumberApi.generateFinalSlips(batch.hash_id);
      toast.success('Slip generation started');
      await refreshBatch();
    } catch (err) {
      handleApiError(err, { fallback: 'Failed to generate slips' });
    } finally {
      setGeneratingFinalSlips(false);
      setBusy(false);
    }
  };

  // Navigates to a dedicated full-page slip viewer route (in-app, not a
  // modal or a new browser tab) — consistent with how Advertisement detail
  // pages are viewed elsewhere in the app.
  const viewSlip = useCallback((rollNumber, applicationNumber) => {
    const query = applicationNumber ? `?application_number=${encodeURIComponent(applicationNumber)}` : '';
    navigate(`/dashboard/roll-numbers/slip/${encodeURIComponent(rollNumber)}${query}`);
  }, [navigate]);

  const downloadSlip = useCallback(async (applicationNumber) => {
    const tid = toast.loading('Preparing slip PDF…');
    try {
      const res = await RollNumberApi.downloadSlip(applicationNumber);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.dismiss(tid);
        handleApiError(err, { fallback: 'Failed to download slip' });
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

    // Governed by the SAME "Roll Number Prefix" control used for
    // generation (above), not silently inherited from whichever existing
    // candidate happens to be first in the batch — that previously meant
    // clearing the prefix and reassigning still produced prefixed numbers
    // whenever any other candidate in the batch still had one.
    const prefix = rollPrefix.trim();
    const padLen = Math.max(5, String(startSeq + s3SelectedList.length - 1).length);
    const newRolls = s3SelectedList.map((_, i) => {
      const seq = startSeq + i;
      return prefix ? `${prefix}-${String(seq).padStart(padLen, '0')}` : String(seq).padStart(padLen, '0');
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
      const updateMap = {};
      const failures = [];
      // One at a time, and each failure is caught individually — the
      // backend now rejects a roll number already claimed by someone else
      // (see claimRollNumberForReassignment), so a conflict partway through
      // a batch must not discard the candidates that already succeeded.
      for (let i = 0; i < s3SelectedList.length; i++) {
        try {
          await RollNumberApi.updateSlip(s3SelectedList[i].id, {
            roll_number: newRolls[i],
            exam_center_id: Number(manualUpdateCenterId),
          });
          updateMap[s3SelectedList[i].id] = { roll: newRolls[i], center: selectedCenter?.center || '' };
        } catch (err) {
          const reason = err?.errors?.roll_number?.[0] || err?.message || 'Update failed';
          failures.push({ name: s3SelectedList[i].name || s3SelectedList[i].id, reason });
        }
      }

      if (Object.keys(updateMap).length > 0) {
        setGeneratedCandidates(prev => prev.map(c => updateMap[c.id] ? { ...c, ...updateMap[c.id] } : c));
        setS3SelectedIds(prev => {
          const n = new Set(prev);
          Object.keys(updateMap).forEach(id => n.delete(id));
          return n;
        });
      }
      if (failures.length === 0) {
        setRollStartSeq('');
      }

      const successCount = Object.keys(updateMap).length;
      if (failures.length === 0) {
        toast.success(`Updated ${successCount} candidate${successCount !== 1 ? 's' : ''} successfully`);
      } else if (successCount > 0) {
        toast.error(`Updated ${successCount}, but ${failures.length} failed — ${failures[0].reason}`);
      } else {
        toast.error(failures[0].reason);
      }
    } finally {
      setUpdating(false);
    }
  }, [s3SelectedList, rollStartSeq, manualUpdateCenterId, generatedCandidates, s3SelectedIds, centers, rollPrefix]);

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
            <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={() => { clearStage3Snapshot(examType); navigate('/dashboard/roll-numbers'); }}><ArrowLeft size={15} /> Back</Button>
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

        {stage !== 4 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {['Select Posts', 'Roll No Generation', 'Center Allocation'].map((label, index) => {
              const step = index + 1;
              // Every tab past Step 1 locks while a batch operation is running
              // — without this, "Select Posts" stayed clickable mid-job and let
              // the admin jump back and change the post selection underneath
              // it. Steps 2/3 are progress indicators, not free navigation —
              // same as the old 2-step design.
              const isDisabled = step !== 1 || creatingBatch || generatingRollNumbers || allocatingCenters || generatingFinalSlips;
              return <button key={label} type="button" disabled={isDisabled} onClick={() => { if (!isDisabled) setStage(step); }} className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${stage === step ? 'border-emerald-700 bg-emerald-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} disabled:cursor-not-allowed`}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-xs">{step}</span>{label}</button>;
            })}
          </div>
        )}

        {stage === 1 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="1" title="Select Advertisement, Posts, Departments & Applicants" subtitle="Select the posts you want to include in this roll number generation batch." />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <TextField
                size="small" label="Search" value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') applyPostFilters(); }}
                className="lg:col-span-3" InputProps={{ startAdornment: <Search size={16} className="mr-2 text-slate-400" /> }}
              />
              <div className="lg:col-span-3">
                <SearchableSelect
                  label="Advertisement"
                  value={draftFilterAdvertisement}
                  onChange={(e) => setDraftFilterAdvertisement(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Advertisements' },
                    ...availableAdvertisements.map((ad) => ({ value: ad.id, label: ad.advertisement })),
                  ]}
                  placeholder="All Advertisements"
                />
              </div>
              <div className="lg:col-span-2">
                <SearchableSelect
                  label="Department"
                  value={draftFilterDepartment}
                  onChange={(e) => setDraftFilterDepartment(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Departments' },
                    ...availableDepartments.map((d) => ({ value: d, label: d })),
                  ]}
                  placeholder="All Departments"
                />
              </div>
              <div className="lg:col-span-2">
                <SearchableSelect
                  label="Post"
                  value={draftFilterPost}
                  onChange={(e) => setDraftFilterPost(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Posts' },
                    ...availablePosts.map((post) => ({ value: post.id, label: post.post })),
                  ]}
                  placeholder="All Posts"
                />
              </div>
              <Button className="h-10 gap-2 lg:col-span-1" onClick={applyPostFilters}><Search size={15} /> Search</Button>
              <Button variant="outline" className="h-10 gap-2 bg-white lg:col-span-1" onClick={resetPostFilters}><Filter size={15} /> Reset</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="w-[260px] px-4 py-3">Advertisement</th><th className="px-4 py-3">Designation / Post</th><th className="px-4 py-3">Department</th><th className="px-4 py-3 text-right"><div>Applicants</div></th></tr></thead>
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
                                <span className="font-bold text-slate-900 text-sm">{post.totalApplicants ?? 0}</span>
                                {(post.generatedCount > 0 || post.applicants !== post.totalApplicants) && (
                                  <span className="text-[11px] text-slate-500">
                                    Pending: {post.applicants ?? 0}
                                  </span>
                                )}
                                {post.generatedCount > 0 && (
                                  <button
                                    type="button"
                                    // onClick={(e) => { e.stopPropagation(); viewGeneratedForPost(post); }}
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 transition-colors"
                                  >
                                    <CheckCircle2 size={11} />
                                    {post.generatedCount} View
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
            <div className="flex justify-end"><Button className="gap-2" disabled={!selectedPosts.length} onClick={() => setStage(2)}>Next: Roll No Generation <ArrowRight size={15} /></Button></div>
          </CardContent></Card>
        )}

        {stage === 2 && (
          <div className="space-y-5">
            {(!batch || creatingBatch) ? (
              <Card className="rounded-lg"><CardContent className="flex justify-center p-10">
                <InlineLoader text="Preparing roll number batch…" variant="ring" size="lg" />
              </CardContent></Card>
            ) : (
              <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
                <StepHeader number="2" title="Generate Roll Numbers" subtitle="Review the range and generate roll numbers for the selected candidates." />

                <RollNumberProgressCard
                  summary={batch}
                  generatingSlips={generatingFinalSlips}
                  onContinueAllocation={() => setStage(3)}
                  onExport={async () => {
                    try {
                      const res = await RollNumberApi.exportBatch(batch.hash_id);
                      if (!res.ok) throw new Error('Export failed');
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `roll-numbers-batch-${batch.hash_id}.xlsx`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      handleApiError(err, { fallback: 'Export failed' });
                    }
                  }}
                  onResume={async () => {
                    try {
                      await RollNumberApi.resumeBatch(batch.hash_id);
                      toast.success('Batch resumed');
                      await refreshBatch();
                    } catch (err) {
                      handleApiError(err, { fallback: 'Failed to resume batch' });
                    }
                  }}
                  onGenerateSlips={handleGenerateFinalSlips}
                />

                {batch.roll_numbers_generated < batch.total && (
                  <RollNumberGenerationMode batch={batch} generating={generatingRollNumbers} onGenerate={handleGenerateRollNumbers} />
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    className="gap-2 bg-white"
                    disabled={generatingRollNumbers || allocatingCenters || generatingFinalSlips}
                    onClick={() => { setBatch(null); setBatchRanges(null); setStage(1); }}
                  >
                    <ArrowLeft size={15} /> Back to Post Selection
                  </Button>

                  {batch.roll_numbers_generated >= batch.total && batch.total > 0 && (
                    <Button className="gap-2" onClick={() => setStage(3)}>
                      Next: Center Allocation <ArrowRight size={15} />
                    </Button>
                  )}
                </div>
              </CardContent></Card>
            )}
          </div>
        )}

        {stage === 3 && (
          <div className="space-y-5">
            {(!batch || batch.roll_numbers_generated < batch.total || batch.total === 0) ? (
              <Card className="rounded-lg"><CardContent className="space-y-3 p-8 text-center">
                <AlertTriangle className="mx-auto text-amber-600" size={28} />
                <p className="font-semibold text-slate-800">Generate roll numbers before allocating centers.</p>
                <Button className="gap-2" onClick={() => setStage(2)}><ArrowLeft size={15} /> Back to Roll No Generation</Button>
              </CardContent></Card>
            ) : (
              <>
                {/* ── Center allocation — once roll numbers exist ── */}
                {!batch.ready_for_slip_generation && batch.status !== 'completed' && (
                  <Card className="rounded-lg" id="center-allocation-section"><CardContent className="space-y-5 p-5">
                    <StepHeader number="3" title="Center Allocation" subtitle="Select centers, configure schedule, then allocate." />

                    <fieldset disabled={allocatingCenters} className="contents">

                    {/* ── Selection mode ── */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        { value: 'auto',   label: 'Auto Selection',   desc: 'System automatically allocates candidates to centers based on the chosen method.' },
                        { value: 'custom', label: 'Custom Selection', desc: 'Manually type a roll-number range against each center.' },
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
                                          size="small" type="number"
                                          disabled={!isSelected}
                                          value={sch.duration}
                                          onChange={e => updateSubjectSchedule(subj.id, 'duration', Number(e.target.value))}
                                          InputLabelProps={{ shrink: true }}
                                          inputProps={{ min: 1 }}
                                          sx={{ width: 140 }}
                                        />
                                      </td>
                                      <td className="px-4 py-3 text-slate-500 text-sm">
                                        {isSelected ? (to12Hour(computeEndTime(sch.startTime, sch.duration)) || '—') : '—'}
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
                              <TextField
                                size="small" type="number"
                                label="Duration (Minutes) *"
                                value={scheduleDurations[index] ?? 90}
                                onChange={(e) => { const v = Number(e.target.value); setScheduleDurations((cur) => { const a = [...cur]; while (a.length <= index) a.push(90); a[index] = v; return a; }); }}
                                required
                                error={!scheduleDurations[index]}
                                helperText={!scheduleDurations[index] ? 'Required' : ''}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 1 }}
                              />
                              <TextField size="small" label="End Time" value={to12Hour(computeEndTime(scheduleTimes[index], scheduleDurations[index])) || '—'} InputProps={{ readOnly: true }} disabled InputLabelProps={{ shrink: true }} />
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

                    {/* ── Custom Selection: per-center roll-number range ── */}
                    {centerSelectionMode === 'custom' && (
                      <div className="space-y-4">
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                              <tr>
                                <th className="w-12 px-4 py-3"></th>
                                <th className="px-4 py-3">Center Name</th>
                                <th className="px-4 py-3">District</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-right">Allocated</th>
                                <th className="px-4 py-3 text-right">Remaining</th>
                                <th className="px-4 py-3">Start Roll No</th>
                                <th className="px-4 py-3">End Roll No</th>
                                <th className="px-4 py-3">Start Date</th>
                                <th className="px-4 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {centers.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No exam centers found</td></tr>}
                              {pagedCenters.map((center) => {
                                const range = centerRanges[center.id] || { start: '', end: '' };
                                const isChecked = selectedCenterIds.includes(center.id);
                                const requested = rangeRequestedCount(range.start, range.end);
                                const exceedsCapacity = requested !== null && requested > center.capacity;
                                return (
                                  <tr key={center.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3"><input type="checkbox" checked={isChecked} onChange={() => toggleCenter(center.id)} className="h-4 w-4 rounded border-slate-300 accent-emerald-800" /></td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{center.center}</td>
                                    <td className="px-4 py-3 text-slate-600">{center.district}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{center.totalCapacity}</td>
                                    <td className="px-4 py-3 text-right font-medium text-rose-600">{center.allocated}</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{center.capacity}</td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="text"
                                        placeholder="OPM-00001"
                                        value={range.start}
                                        disabled={!isChecked}
                                        onChange={(e) => updateCenterRange(center.id, 'start', e.target.value)}
                                        className="w-28 rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100 disabled:text-slate-400"
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="text"
                                        placeholder="OPM-05000"
                                        value={range.end}
                                        disabled={!isChecked}
                                        onChange={(e) => updateCenterRange(center.id, 'end', e.target.value)}
                                        className={`w-28 rounded border px-2 py-1 font-mono text-xs disabled:bg-slate-100 disabled:text-slate-400 ${exceedsCapacity ? 'border-rose-500 text-rose-700' : 'border-slate-300'}`}
                                      />
                                      {exceedsCapacity && (
                                        <div className="mt-1 text-[11px] font-semibold text-rose-600">Maximum capacity reached ({center.capacity} available)</div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700">{scheduleDates[0] || '—'}</td>
                                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${center.capacity === 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>{center.capacity === 0 ? 'Full' : 'Available'}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {centers.length > 0 && (
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>{centers.length} center{centers.length === 1 ? '' : 's'}</span>
                            <Pagination page={centersPage} totalPages={centersTotalPages} onChange={setCentersPage} />
                          </div>
                        )}
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Check a center, then type its roll-number range (e.g. <span className="font-mono font-semibold">OPM-00001</span> to <span className="font-mono font-semibold">OPM-05000</span>). Each checked row with a range is allocated separately — repeat for as many centers as needed until every candidate is allocated.
                        </div>
                      </div>
                    )}

                    {/* ── Footer navigation ── */}
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      {centerSelectionMode === 'auto' ? (
                        <Button
                          className="gap-2"
                          disabled={
                            allocatingCenters ||
                            (examType === 'written-exams'
                              ? writtenExamSchedules.length === 0
                              : (scheduleDates.some((d) => !d) || scheduleTimes.some((t) => !t))
                            )
                          }
                          onClick={handleAllocateCenters}
                        >
                          <Send size={15} /> {allocatingCenters ? 'Allocating…' : 'Allocate Centers'}
                        </Button>
                      ) : (
                        <Button
                          className="gap-2"
                          disabled={
                            allocatingCenters ||
                            (examType === 'written-exams'
                              ? writtenExamSchedules.length === 0
                              : (scheduleDates.some((d) => !d) || scheduleTimes.some((t) => !t))
                            ) ||
                            selectedCenterIds.every((id) => !centerRanges[id]?.start || !centerRanges[id]?.end) ||
                            selectedCenterIds.some((id) => {
                              const r = centerRanges[id];
                              if (!r?.start || !r?.end) return false;
                              const requested = rangeRequestedCount(r.start, r.end);
                              const center = centers.find((c) => c.id === id);
                              return requested !== null && center && requested > center.capacity;
                            })
                          }
                          onClick={handleAllocateCustomRanges}
                        >
                          <Send size={15} /> {allocatingCenters ? 'Allocating…' : 'Allocate Ranges'}
                        </Button>
                      )}
                    </div>

                    </fieldset>

                    {batchRanges && <PendingRangeCard ranges={batchRanges} />}

                    {batch.pending > 0 && batch.allocation_mode && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {batch.pending} candidate{batch.pending !== 1 ? 's' : ''} still pending allocation.{' '}
                        <button type="button" className="font-semibold underline" onClick={() => navigate(`/dashboard/roll-numbers/batches/${batch.hash_id}`)}>
                          Continue in Batch Details
                        </button> for further custom-range/center tools.
                      </div>
                    )}
                  </CardContent></Card>
                )}

                {/* ── Ready to generate slips ── */}
                {batch.ready_for_slip_generation && (
                  <Card className="rounded-lg"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="font-bold text-emerald-900">Ready for slip generation</p>
                      <p className="text-sm text-slate-500">Every candidate has a roll number and an allocated center.</p>
                    </div>
                    <Button className="gap-2" disabled={generatingFinalSlips} onClick={handleGenerateFinalSlips}>
                      <Send size={15} /> {generatingFinalSlips ? 'Generating…' : 'Generate Roll Number Slip'}
                    </Button>
                  </CardContent></Card>
                )}

                {/* ── Complete ── */}
                {batch.status === 'completed' && (
                  <Card className="rounded-lg"><CardContent className="space-y-3 p-8 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-600" size={36} />
                    <p className="text-lg font-bold text-emerald-900">Roll number slips generated</p>
                    <p className="text-sm text-slate-500">
                      {batch.slips_generated} slip{batch.slips_generated !== 1 ? 's' : ''} {batch.slips_generated !== 1 ? 'are' : 'is'} now available under Unpublished Roll Slips.
                    </p>
                    <Button onClick={() => navigate('/dashboard/roll-numbers')}>View Unpublished Roll Slips</Button>
                  </CardContent></Card>
                )}

                <Button variant="outline" className="gap-2 bg-white" disabled={allocatingCenters} onClick={() => setStage(2)}>
                  <ArrowLeft size={15} /> Back to Roll No Generation
                </Button>
              </>
            )}
          </div>
        )}

        {stage === 4 && (
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
                  {(draftS3Search || draftS3District || draftS3Gender || draftS3CnicFilter || draftS3Preference || s3Search || s3District || s3Gender || s3CnicFilter || s3Preference) && (
                    <button
                      type="button"
                      onClick={resetS3Filters}
                      className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      <X size={12} /> Clear All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <TextField
                    size="small" label="Search" placeholder="Name, CNIC, Ref ID"
                    value={draftS3Search} onChange={(e) => setDraftS3Search(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') applyS3Filters(); }}
                    InputProps={{ startAdornment: <Search size={14} className="mr-2 text-slate-400" /> }}
                  />
                  <SearchableSelect
                    label="District / Zone"
                    value={draftS3District}
                    onChange={(e) => setDraftS3District(e.target.value)}
                    options={s3UniqueDistricts.map(d => ({ value: d, label: d }))}
                    placeholder="All Districts"
                  />
                  <SearchableSelect
                    label="Gender"
                    value={draftS3Gender}
                    onChange={(e) => setDraftS3Gender(e.target.value)}
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                    ]}
                    placeholder="All Genders"
                  />
                  <TextField
                    size="small" label="CNIC" placeholder="e.g. 3110470679173"
                    value={draftS3CnicFilter} onChange={(e) => setDraftS3CnicFilter(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') applyS3Filters(); }}
                  />
                  <SearchableSelect
                    label="Preference"
                    value={draftS3Preference}
                    onChange={(e) => setDraftS3Preference(e.target.value)}
                    options={examCities.map(p => ({ value: p, label: p }))}
                    placeholder="All Preferences"
                  />
                  <Button className="h-10 gap-2" onClick={applyS3Filters}><Search size={14} /> Search</Button>
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
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white px-3" onClick={() => viewSlip(c.roll, c.id)}>
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
                <p className="mb-3 text-xs text-slate-500">
                  Uses the <span className="font-semibold text-slate-700">Roll Number Prefix</span> set above —
                  {rollPrefix.trim()
                    ? <> new numbers will look like <span className="font-mono font-semibold text-slate-700">{rollPrefix.trim()}-{String(parseInt(rollStartSeq, 10) || 1).padStart(5, '0')}</span></>
                    : <> new numbers will have <span className="font-semibold text-slate-700">no prefix</span> (e.g. <span className="font-mono font-semibold text-slate-700">{String(parseInt(rollStartSeq, 10) || 1).padStart(5, '0')}</span>)</>}
                  . Clear or set it above to change this before updating.
                </p>
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
                  <SearchableSelect
                    label="Exam Center"
                    value={manualUpdateCenterId}
                    onChange={(e) => setManualUpdateCenterId(e.target.value)}
                    options={centers.map(c => ({ value: c.id, label: c.center + (c.district ? ` — ${c.district}` : '') }))}
                    placeholder="Select Center"
                    hint="Center to assign to selected candidates"
                  />
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
                <Button variant="outline" className="gap-2 bg-white" onClick={() => { clearStage3Snapshot(examType); setStage(s3BackStage); }}>
                  <ArrowLeft size={15} /> {s3BackStage === 1 ? 'Back to Posts' : 'Back to Allocation'}
                </Button>
                <Button variant="outline" className="gap-2 bg-white" onClick={() => { clearStage3Snapshot(examType); navigate('/dashboard/roll-numbers'); }}>
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
