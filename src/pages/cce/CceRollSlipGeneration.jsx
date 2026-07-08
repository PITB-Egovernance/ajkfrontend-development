import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, MenuItem } from '@mui/material';
import { Stamp, ArrowLeft, ArrowRight, Users, MapPin, CheckCircle2, Search, Filter, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import CceScreeningApi from 'api/cceScreeningApi';
import CceDateSheetApi from 'api/cceDateSheetApi';
import RollNumberApi from 'api/rollNumberApi';
import { buildCandidateDateSheetGroups, flattenPapers, isDateSheetComplete, formatPaperTime } from 'utils/cceDateSheet';

const STATUS_STYLES = {
  pending:    'text-slate-400',
  generating: 'text-indigo-600',
  done:       'text-emerald-600 font-semibold',
  error:      'text-red-600 font-semibold',
};

// ── AJK district → exam-center zone mapping ───────────────────────────────
// Ported verbatim from RollNumberExamFlow.jsx (Roll Number Management →
// exam/cce-exams) so "Auto Selection" behaves identically here.
const DISTRICT_ZONE_MAP = {
  '02': 'muzaffarabad', 'muzaffarabad': 'muzaffarabad',
  '01': 'muzaffarabad', 'neelum': 'muzaffarabad',
  '03': 'muzaffarabad', 'jehlum valley': 'muzaffarabad', 'jhelum valley': 'muzaffarabad',
  '12': 'muzaffarabad', 'refugees (1989)': 'muzaffarabad', 'refugee (1989)': 'muzaffarabad',
  '13': 'muzaffarabad', 'special persons': 'muzaffarabad',
  '06': 'rawalakot', 'poonch': 'rawalakot', 'rawalakot': 'rawalakot',
  '04': 'rawalakot', 'bagh': 'rawalakot',
  '07': 'rawalakot', 'sudhnoti': 'rawalakot',
  '05': 'rawalakot', 'haveli': 'rawalakot',
  '10': 'mirpur', 'mirpur': 'mirpur',
  '09': 'mirpur', 'bhimber': 'mirpur',
  '08': 'mirpur', 'kotli': 'mirpur',
  '11': 'mirpur',
  'refugees settled in pakistan (1947)': 'mirpur',
  'refugees settled in paskistan (1947)': 'mirpur',
};
const ZONE_ORDER  = ['muzaffarabad', 'rawalakot', 'mirpur'];
const ZONE_LABELS = { muzaffarabad: 'Muzaffarabad', rawalakot: 'Rawalakot', mirpur: 'Mirpur' };

const resolveDistrictZone = (meta) => {
  const raw = [meta?.domicile_district].filter(Boolean).map((v) => String(v).toLowerCase().trim());
  for (const v of raw) {
    if (DISTRICT_ZONE_MAP[v]) return DISTRICT_ZONE_MAP[v];
    for (const [key, zone] of Object.entries(DISTRICT_ZONE_MAP)) {
      if (v.includes(key) || key.includes(v)) return zone;
    }
  }
  return 'muzaffarabad';
};

const resolvePreferenceZone = (meta) => {
  const cities = (meta?.preferred_exam_cities || [])
    .map((c) => (typeof c === 'string' ? c : (c?.city || '')).toLowerCase().trim())
    .filter(Boolean);
  for (const city of cities) {
    if (DISTRICT_ZONE_MAP[city]) return DISTRICT_ZONE_MAP[city];
    for (const [key, zone] of Object.entries(DISTRICT_ZONE_MAP)) {
      if (city.includes(key) || key.includes(city)) return zone;
    }
  }
  return resolveDistrictZone(meta);
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

const CceRollSlipGeneration = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState(1);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [stage]);

  const [loading, setLoading] = useState(true);
  // Flat pool of CCE candidates across every CCE advertisement — each row
  // carries which advertisement/post it belongs to so Stage 1 can group them
  // into "posts" the same way Roll Number Management groups applications.
  const [candidates, setCandidates] = useState([]);
  const [masterRowsByAd, setMasterRowsByAd] = useState({});
  const [selectionsByRoll, setSelectionsByRoll] = useState({});

  // Stage 1 — search/filter + post selection
  const [search, setSearch] = useState('');
  const [filterAdvertisement, setFilterAdvertisement] = useState('all');
  const [filterPost, setFilterPost] = useState('all');
  const [selectedPostKeys, setSelectedPostKeys] = useState([]);

  // Stage 2 — center allocation + generation
  const [examCenters, setExamCenters] = useState([]);
  const [centerUtilization, setCenterUtilization] = useState({});
  const [selectedCenterIds, setSelectedCenterIds] = useState([]);
  const [centerSelectionMode, setCenterSelectionMode] = useState('auto');
  const [allocationMethod, setAllocationMethod] = useState('district');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState([]);
  const [generatedSlips, setGeneratedSlips] = useState([]);

  // Every CCE advertisement's master date sheet + submitted candidates,
  // loaded once up front — mirrors the reference page's "load everything,
  // then let the admin filter/select" model instead of a single-advertisement
  // picker.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const adsRes = await CceScreeningApi.advertisements();
        const adList = Array.isArray(adsRes?.data) ? adsRes.data : [];

        const perAd = await Promise.all(adList.map(async (ad) => {
          const adId = ad.hash_id || ad.id;
          const adTitle = ad.adv_number || ad.title || `Advertisement #${ad.id}`;
          const [masterRes, candRes] = await Promise.all([
            CceDateSheetApi.getMasterDateSheet(adId).catch(() => ({ data: [] })),
            CceDateSheetApi.getEligibleCandidatesFromPortal({ advertisementId: adId, perPage: 500, page: 1 }).catch(() => ({ data: [] })),
          ]);
          const masterRows = Array.isArray(masterRes?.data) ? masterRes.data : [];
          const candPayload = candRes?.data;
          const candList = Array.isArray(candPayload) ? candPayload : (candPayload ? [candPayload] : []);
          return { adId, adTitle, masterRows, candList };
        }));

        const masterMap = {};
        const flatCandidates = [];
        perAd.forEach(({ adId, adTitle, masterRows, candList }) => {
          masterMap[adId] = masterRows;
          candList.forEach((c) => flatCandidates.push({ ...c, advertisementId: adId, advertisementTitle: adTitle }));
        });
        setMasterRowsByAd(masterMap);
        setCandidates(flatCandidates);

        const selEntries = await Promise.all(flatCandidates.map(async (c) => {
          try {
            const res = await CceDateSheetApi.getSubjectSelection(c.roll_number);
            return [c.roll_number, res?.data ?? null];
          } catch (err) {
            return [c.roll_number, null];
          }
        }));
        setSelectionsByRoll(Object.fromEntries(selEntries));
      } catch (err) {
        toast.error(err?.message || 'Failed to load CCE candidates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [centersRes, utilRes] = await Promise.all([
          RollNumberApi.getExamCenters(),
          RollNumberApi.getCenterUtilization().catch(() => ({ data: {} })),
        ]);
        const list = centersRes?.data?.data ?? centersRes?.data ?? [];
        setExamCenters(Array.isArray(list) ? list : []);
        setCenterUtilization(utilRes?.data ?? {});
      } catch (err) {
        // Non-fatal — the picker just stays empty until the page is retried.
      }
    })();
  }, []);

  // Compulsory papers + only each candidate's own selected optional papers,
  // scheduled from their own advertisement's master date sheet.
  const candidateRows = useMemo(() => candidates.map((c) => {
    const masterRows = masterRowsByAd[c.advertisementId] || [];
    const groups = buildCandidateDateSheetGroups(masterRows, selectionsByRoll[c.roll_number]?.selections);
    const papers = flattenPapers(groups);
    return {
      ...c,
      papers,
      papersCount: papers.length,
      complete: isDateSheetComplete(papers),
      postKey: `${c.advertisementId}::${c.post_name || '—'}`,
    };
  }), [candidates, masterRowsByAd, selectionsByRoll]);

  // Posts aggregated across every advertisement — the unit Stage 1 selects,
  // same as Roll Number Management's post table (there scoped to the general
  // application system; here scoped to actual CCE subject-selection data).
  const posts = useMemo(() => {
    const byKey = {};
    candidateRows.forEach((c) => {
      if (!byKey[c.postKey]) {
        byKey[c.postKey] = {
          key: c.postKey,
          advertisementId: c.advertisementId,
          advertisementTitle: c.advertisementTitle,
          postName: c.post_name || '—',
          applicants: 0,
          complete: 0,
        };
      }
      byKey[c.postKey].applicants += 1;
      if (c.complete) byKey[c.postKey].complete += 1;
    });
    return Object.values(byKey);
  }, [candidateRows]);

  const advertisementOptions = useMemo(() => {
    const seen = new Map();
    posts.forEach((p) => { if (!seen.has(p.advertisementId)) seen.set(p.advertisementId, p.advertisementTitle); });
    return [...seen.entries()];
  }, [posts]);

  const postOptions = useMemo(
    () => posts.filter((p) => filterAdvertisement === 'all' || p.advertisementId === filterAdvertisement),
    [posts, filterAdvertisement]
  );

  const postGroups = useMemo(() => {
    const byAd = {};
    posts
      .filter((p) => filterAdvertisement === 'all' || p.advertisementId === filterAdvertisement)
      .filter((p) => filterPost === 'all' || p.key === filterPost)
      .filter((p) => !search
        || p.postName.toLowerCase().includes(search.toLowerCase())
        || p.advertisementTitle.toLowerCase().includes(search.toLowerCase()))
      .forEach((p) => { (byAd[p.advertisementTitle] ||= []).push(p); });
    return Object.entries(byAd).map(([advertisementTitle, items]) => ({ advertisementTitle, items }));
  }, [posts, filterAdvertisement, filterPost, search]);

  const togglePost = (key) => setSelectedPostKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const resetFilters = () => { setSearch(''); setFilterAdvertisement('all'); setFilterPost('all'); };

  const selectedPosts = posts.filter((p) => selectedPostKeys.includes(p.key));
  const selectedCandidateRows = candidateRows.filter((c) => selectedPostKeys.includes(c.postKey));
  const completeCandidateRows = selectedCandidateRows.filter((c) => c.complete);
  const generatedCount = progress.filter((p) => p.status === 'done').length;

  // Active centers normalized to the same shape Roll Number Management's own
  // `centers` state uses — "district" here is really the center's city.
  const normalizedCenters = useMemo(() => examCenters
    .filter((c) => (c.status ?? 'active') === 'active')
    .map((c) => {
      const numericId = c.id != null ? c.id : null;
      const totalCapacity = Number(c.capacity) || 0;
      const allocated = Number(centerUtilization[numericId] ?? 0);
      return {
        id: numericId,
        center: c.name || '',
        district: c.city || c.district || '',
        totalCapacity,
        allocated,
        remaining: Math.max(0, totalCapacity - allocated),
      };
    }),
  [examCenters, centerUtilization]);

  const selectedCenters = normalizedCenters.filter((c) => selectedCenterIds.includes(c.id));
  const selectedCapacity = selectedCenters.reduce((sum, c) => sum + c.remaining, 0);
  const capacityShortage = Math.max(0, completeCandidateRows.length - selectedCapacity);
  const capacityPassed = selectedCenterIds.length > 0 && capacityShortage === 0;

  const zoneCenterLookup = useMemo(() => {
    const lookup = {};
    ZONE_ORDER.forEach((zone) => {
      const found = normalizedCenters.find((c) =>
        c.center.toLowerCase().includes(zone) || c.district.toLowerCase().includes(zone));
      if (found) lookup[zone] = found;
    });
    return lookup;
  }, [normalizedCenters]);

  // Every ReceivedApplication for a given advertisement, fetched straight
  // from the admin DB (no candidate-portal round trip) — the source for both
  // roll_number → application_number resolution and each candidate's
  // domicile_district / preferred_exam_cities (auto-allocation only).
  const fetchApplicationsForAdvertisement = async (adId) => {
    try {
      const res = await RollNumberApi.getApplicationsByAdvertisement(adId, { per_page: 1000 });
      return res?.data?.applications?.data ?? [];
    } catch (err) {
      return [];
    }
  };

  const handleGenerate = async () => {
    if (centerSelectionMode === 'custom') {
      if (selectedCenterIds.length === 0) { toast.error('Select at least one exam center'); return; }
      if (!capacityPassed) { toast.error(`Center capacity is short by ${capacityShortage} seats. Select more centers.`); return; }
    }
    if (completeCandidateRows.length === 0) return;

    setGenerating(true);
    setGeneratedSlips([]);
    setProgress(completeCandidateRows.map((r) => ({ roll_number: r.roll_number, candidate_name: r.candidate?.name, status: 'pending', error: null, center: null })));
    const slips = [];

    try {
      const distinctAdIds = [...new Set(completeCandidateRows.map((r) => r.advertisementId))];
      const applications = (await Promise.all(distinctAdIds.map(fetchApplicationsForAdvertisement))).flat();
      const appNumberByRoll = Object.fromEntries(
        applications.filter((a) => a.roll_number).map((a) => [String(a.roll_number).toLowerCase(), a.application_number])
      );
      const metaByAppNumber = Object.fromEntries(applications.map((a) => [a.application_number, {
        domicile_district:     a.domicile_district,
        preferred_exam_cities: a.preferred_exam_cities || [],
      }]));
      const resolveAppNumber = (rollNumber) => appNumberByRoll[String(rollNumber).toLowerCase()];

      let centerByRoll;
      if (centerSelectionMode === 'auto') {
        const resolver = allocationMethod === 'preference' ? resolvePreferenceZone : resolveDistrictZone;
        centerByRoll = Object.fromEntries(completeCandidateRows.map((row) => {
          const zone = resolver(metaByAppNumber[resolveAppNumber(row.roll_number)]);
          return [row.roll_number, { zone, center: zoneCenterLookup[zone] }];
        }));
      } else {
        // Only the first checked center is actually used for generation —
        // the rest just count toward the capacity check, same as Roll
        // Number Management's custom mode.
        const center = normalizedCenters.find((c) => c.id === selectedCenterIds[0]);
        centerByRoll = Object.fromEntries(completeCandidateRows.map((row) => [row.roll_number, { zone: null, center }]));
      }

      for (const row of completeCandidateRows) {
        const allocation = centerByRoll[row.roll_number];
        if (!allocation?.center?.id) {
          setProgress((prev) => prev.map((p) => (p.roll_number === row.roll_number ? {
            ...p,
            status: 'error',
            error: allocation?.zone
              ? `No exam center found for the ${ZONE_LABELS[allocation.zone] || allocation.zone} zone`
              : 'No exam center selected',
          } : p)));
          continue;
        }

        setProgress((prev) => prev.map((p) => (p.roll_number === row.roll_number ? { ...p, status: 'generating', center: allocation.center.center } : p)));
        try {
          const applicationNumber = resolveAppNumber(row.roll_number);
          if (!applicationNumber) throw new Error('Not yet linked to an admin application record');

          const papers = row.papers.map((paper) => ({
            label: paper.subject_name + (paper.paper_label ? ` — ${paper.paper_label}` : ''),
            date:  paper.paper_date,
            time:  formatPaperTime(paper.paper_time),
          }));

          // eslint-disable-next-line no-await-in-loop
          const genRes = await RollNumberApi.generateSlips({
            application_numbers: [applicationNumber],
            exam_center_id:      Number(allocation.center.id),
            exam_type:            'cce-exams',
            papers,
            allocation_method:   centerSelectionMode === 'auto' ? allocationMethod : undefined,
            auto_allocate:       centerSelectionMode === 'auto',
          });
          const generationId = genRes?.data?.generation_id;

          let finalStatus = null;
          for (let attempt = 0; attempt < 20; attempt += 1) {
            // eslint-disable-next-line no-await-in-loop
            const statusRes = await RollNumberApi.getGenerationStatus(generationId);
            finalStatus = statusRes?.data;
            if (finalStatus?.status === 'completed' || finalStatus?.status === 'failed') break;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          if (finalStatus?.status !== 'completed') {
            throw new Error(finalStatus?.message || 'Timed out waiting for generation to finish');
          }
          slips.push({
            roll_number:        row.roll_number,
            candidate_name:     row.candidate?.name,
            candidate_cnic:     row.candidate?.cnic,
            application_number: applicationNumber,
            center:             allocation.center.center,
          });
          setProgress((prev) => prev.map((p) => (p.roll_number === row.roll_number ? { ...p, status: 'done' } : p)));
        } catch (err) {
          setProgress((prev) => prev.map((p) => (p.roll_number === row.roll_number ? { ...p, status: 'error', error: err?.message } : p)));
        }
      }

      setGeneratedSlips(slips);
      if (slips.length > 0) setStage(3);
    } catch (err) {
      toast.error(err?.message || 'Failed to generate roll no slips');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadSlip = async (applicationNumber, rollNumber) => {
    try {
      const res = await RollNumberApi.downloadSlip(applicationNumber);
      if (!res.ok) throw new Error('Failed to download slip');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rollNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message || 'Failed to download slip');
    }
  };

  const failedProgress = progress.filter((p) => p.status === 'error');

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2"><Stamp size={24} className="text-emerald-800" /></div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">CCE Subjects Roll No Slip</h1>
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">CCE Exams</span>
              </div>
              <p className="text-sm text-slate-500">Allocate an exam center and generate roll no slips using each candidate's own CCE date sheet.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={() => navigate('/dashboard/cce/date-sheet/candidate')}>
            <ArrowLeft size={15} /> Back
          </Button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-10 flex justify-center">
            <InlineLoader text="Loading CCE candidates..." variant="ring" size="lg" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4"><Stamp size={32} className="text-slate-400" /></div>
            <p className="text-base font-semibold text-slate-700">No eligible CCE candidates found</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">Candidates must have passed CCE screening, have a generated roll number, and have submitted their subject selection.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="rounded-lg border-blue-200 bg-blue-50"><CardContent className="flex items-center gap-3 p-4"><Users size={24} className="text-blue-700" /><div><p className="text-xs font-semibold text-blue-700">Selected Applicants</p><p className="text-2xl font-bold text-blue-950">{selectedCandidateRows.length}</p></div></CardContent></Card>
              <Card className="rounded-lg border-emerald-200 bg-emerald-50"><CardContent className="flex items-center gap-3 p-4"><MapPin size={24} className="text-emerald-700" /><div><p className="text-xs font-semibold text-emerald-700">Selected Capacity</p><p className="text-2xl font-bold text-emerald-950">{selectedCapacity}</p></div></CardContent></Card>
              <Card className="rounded-lg border-violet-200 bg-violet-50"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 size={24} className="text-violet-700" /><div><p className="text-xs font-semibold text-violet-700">Generated</p><p className="text-2xl font-bold text-violet-950">{generatedCount}</p></div></CardContent></Card>
            </div>

            {stage !== 3 && (
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 text-sm font-semibold">
                <button type="button" onClick={() => setStage(1)} className={`px-4 py-3 text-left transition-colors ${stage === 1 ? 'bg-emerald-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>1&nbsp;&nbsp;Select Posts</button>
                <button
                  type="button"
                  onClick={() => selectedPostKeys.length > 0 && setStage(2)}
                  disabled={selectedPostKeys.length === 0}
                  className={`px-4 py-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${stage === 2 ? 'bg-emerald-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  2&nbsp;&nbsp;Center Allocation &amp; Generate
                </button>
              </div>
            )}

            {stage === 1 ? (
              <Card className="border border-slate-200">
                <CardContent className="p-5 space-y-5">
                  <StepHeader
                    number="1"
                    title="Select Advertisement, Posts &amp; Applicants"
                    subtitle="Select the CCE posts you want to include in this roll-slip generation batch."
                  />

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    <TextField
                      size="small"
                      label="Search"
                      placeholder="Search post or advertisement"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="lg:col-span-5"
                      InputProps={{ startAdornment: <Search size={16} className="mr-2 text-slate-400" /> }}
                    />
                    <TextField
                      select size="small" label="Advertisement" value={filterAdvertisement}
                      onChange={(e) => { setFilterAdvertisement(e.target.value); setFilterPost('all'); }}
                      className="lg:col-span-4"
                    >
                      <MenuItem value="all">All Advertisements</MenuItem>
                      {advertisementOptions.map(([id, title]) => <MenuItem key={id} value={id}>{title}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Post" value={filterPost} onChange={(e) => setFilterPost(e.target.value)} className="lg:col-span-2">
                      <MenuItem value="all">All Posts</MenuItem>
                      {postOptions.map((p) => <MenuItem key={p.key} value={p.key}>{p.postName}</MenuItem>)}
                    </TextField>
                    <Button variant="outline" className="gap-2 bg-white lg:col-span-1" onClick={resetFilters}><Filter size={15} /> Reset</Button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Designation / Post</th>
                          <th className="px-4 py-3 text-right">Applicants</th>
                          <th className="px-4 py-3 text-right">Date Sheet Complete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {postGroups.map(({ advertisementTitle, items }) => (
                          <React.Fragment key={advertisementTitle}>
                            <tr className="bg-emerald-50/60">
                              <td colSpan={3} className="px-4 py-1.5 text-xs font-bold uppercase text-emerald-800">{advertisementTitle}</td>
                            </tr>
                            {items.map((p) => (
                              <tr key={p.key} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <label className="flex cursor-pointer items-center gap-3">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-slate-300 accent-emerald-800"
                                      checked={selectedPostKeys.includes(p.key)}
                                      onChange={() => togglePost(p.key)}
                                    />
                                    <span className="font-semibold text-slate-900">{p.postName}</span>
                                  </label>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">{p.applicants}</td>
                                <td className="px-4 py-3 text-right font-semibold text-emerald-700">{p.complete} / {p.applicants}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-4">
                    <div><p className="text-xs font-semibold text-emerald-700">Selected Posts</p><p className="text-lg font-bold text-emerald-950">{selectedPosts.length}</p></div>
                    <div><p className="text-xs font-semibold text-emerald-700">Applicants</p><p className="text-lg font-bold text-emerald-950">{selectedCandidateRows.length}</p></div>
                    <div><p className="text-xs font-semibold text-emerald-700">Date Sheet Complete</p><p className="text-lg font-bold text-emerald-950">{completeCandidateRows.length}</p></div>
                    <div><p className="text-xs font-semibold text-emerald-700">Roll Slip Rule</p><p className="text-lg font-bold text-emerald-950">One roll number</p></div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setStage(2)} disabled={selectedPostKeys.length === 0} className="gap-2">
                      Next: Center Allocation <ArrowRight size={15} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : stage === 2 ? (
              <Card className="border border-slate-200">
                <CardContent className="p-5 space-y-5">
                  <StepHeader
                    number="2"
                    title="Center Allocation &amp; Generate Roll No Slips"
                    subtitle={`${completeCandidateRows.length} of ${selectedCandidateRows.length} selected candidate${selectedCandidateRows.length === 1 ? '' : 's'} ready — papers and schedule already come from the CCE date sheet, only the center needs allocating.`}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { value: 'auto', label: 'Auto Selection', desc: 'System automatically allocates candidates to centers based on the chosen method.' },
                      { value: 'custom', label: 'Custom Selection', desc: 'Manually select exam centers and control capacity allocation.' },
                    ].map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${centerSelectionMode === value ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <input
                          type="radio"
                          name="centerSelectionMode"
                          value={value}
                          checked={centerSelectionMode === value}
                          onChange={() => setCenterSelectionMode(value)}
                          className="mt-1 accent-emerald-700"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">{label}</span>
                          <span className="block text-xs text-slate-500 mt-0.5">{desc}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {centerSelectionMode === 'auto' ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Center Allocation Method</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[{ value: 'district', label: 'By District' }, { value: 'preference', label: 'By Preference' }].map(({ value, label }) => (
                          <label
                            key={value}
                            className={`flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer text-sm font-medium transition-colors ${allocationMethod === value ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            <input
                              type="radio"
                              name="allocationMethod"
                              value={value}
                              checked={allocationMethod === value}
                              onChange={() => setAllocationMethod(value)}
                              className="accent-emerald-700"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                          <thead className="sticky top-0">
                            <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50">
                              <th className="py-2 px-3 w-8"></th>
                              <th className="py-2 px-3">Center Name</th>
                              <th className="py-2 px-3">District</th>
                              <th className="py-2 px-3">Total</th>
                              <th className="py-2 px-3">Allocated</th>
                              <th className="py-2 px-3">Remaining</th>
                            </tr>
                          </thead>
                          <tbody>
                            {normalizedCenters.map((c) => (
                              <tr key={c.id} className="border-b border-slate-100">
                                <td className="py-2 px-3">
                                  <input
                                    type="checkbox"
                                    className="accent-emerald-700"
                                    checked={selectedCenterIds.includes(c.id)}
                                    onChange={() => setSelectedCenterIds((prev) => (
                                      prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                    ))}
                                  />
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-800">{c.center}</td>
                                <td className="py-2 px-3 text-slate-500">{c.district}</td>
                                <td className="py-2 px-3 text-slate-500">{c.totalCapacity}</td>
                                <td className="py-2 px-3 text-slate-500">{c.allocated}</td>
                                <td className="py-2 px-3 text-slate-500">{c.remaining}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className={`rounded-lg border px-4 py-2 text-sm font-semibold ${capacityPassed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                        {capacityPassed
                          ? `Capacity check passed — ${selectedCapacity} seats for ${completeCandidateRows.length} candidates.`
                          : `Center capacity is short by ${capacityShortage} seats. Select more centers.`}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button variant="outline" className="gap-2 bg-white" disabled={generating} onClick={() => setStage(1)}>
                      <ArrowLeft size={15} /> Back to Posts
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={generating || completeCandidateRows.length === 0 || (centerSelectionMode === 'custom' && !capacityPassed)}
                      className="flex items-center gap-2"
                    >
                      <Stamp size={14} /> {generating ? 'Generating…' : `Generate Roll No Slip${completeCandidateRows.length > 1 ? 's' : ''} (${completeCandidateRows.length})`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-slate-200">
                <CardContent className="p-5 space-y-5">
                  <StepHeader
                    number="3"
                    title="Generated Roll No Slips"
                    subtitle={`${generatedSlips.length} roll no slip${generatedSlips.length === 1 ? '' : 's'} generated successfully — same roll number, updated schedule.`}
                  />

                  {failedProgress.length > 0 && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      <p className="font-semibold">{failedProgress.length} candidate{failedProgress.length === 1 ? '' : 's'} could not be generated:</p>
                      <ul className="mt-1 list-disc pl-5">
                        {failedProgress.map((p) => (
                          <li key={p.roll_number}><span className="font-mono">{p.roll_number}</span> — {p.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Roll Number</th>
                          <th className="px-4 py-3">Candidate</th>
                          <th className="px-4 py-3">CNIC</th>
                          <th className="px-4 py-3">Exam Center</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {generatedSlips.map((s) => (
                          <tr key={s.roll_number} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-bold text-emerald-800">{s.roll_number}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{s.candidate_name}</td>
                            <td className="px-4 py-3 text-slate-500">{s.candidate_cnic}</td>
                            <td className="px-4 py-3 text-slate-500">{s.center}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="gap-1 bg-white" onClick={() => navigate(`/dashboard/roll-numbers/slip/${s.roll_number}`)}>
                                  <Eye size={13} /> View
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1 bg-white" onClick={() => handleDownloadSlip(s.application_number, s.roll_number)}>
                                  <Download size={13} /> Download
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <Button variant="outline" className="gap-2 bg-white" onClick={() => setStage(2)}>
                      <ArrowLeft size={15} /> Back to Allocation
                    </Button>
                    <Button variant="outline" className="gap-2 bg-white" onClick={() => navigate('/dashboard/roll-numbers')}>
                      View All Slips <ArrowRight size={15} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {stage !== 3 && progress.length > 0 && (
              <Card className="border border-slate-200">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Generation Progress</p>
                  <div className="space-y-2">
                    {progress.map((p) => (
                      <div key={p.roll_number} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
                        <span className="font-mono text-slate-700">{p.roll_number}</span>
                        <span className="text-slate-500 flex-1 px-4 truncate">{p.candidate_name}</span>
                        <span className="text-xs text-slate-400 px-2 truncate max-w-[140px]">{p.center || ''}</span>
                        <span className={STATUS_STYLES[p.status] || 'text-slate-500'}>
                          {p.status}{p.error ? ` — ${p.error}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CceRollSlipGeneration;
