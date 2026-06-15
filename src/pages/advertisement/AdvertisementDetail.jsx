import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  Download, 
  Info, 
  Briefcase, 
  Users, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  Globe,
  ChevronDown,
  Layout,
  ExternalLink,
  ClipboardList,
  Layers,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import AdvertisementApi from '../../api/advertisementApi';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';

import AuthService from 'services/authService';

const STATUS_BADGES = {
  active:              { label: 'Active',             className: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  temporary_closed:    { label: 'Temporary Closed',   className: 'bg-amber-50 border-amber-100 text-amber-700' },
  permanently_closed:  { label: 'Permanently Closed', className: 'bg-red-50 border-red-100 text-red-700' },
  reopen:              { label: 'Reopen',             className: 'bg-blue-50 border-blue-100 text-blue-700' },
  extend_date:         { label: 'Extended',           className: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
};

const AdvertisementDetail = () => {
  /* ── HOOKS & STATE ── */
  const { id } = useParams();
  const navigate = useNavigate();
  const [advertisement, setAdvertisement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [districtOptions, setDistrictOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [testTypeOptions, setTestTypeOptions] = useState([]);

  const API_ROOT = Config.apiUrl.replace('/api/v1', '').replace('/v1', '');
  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  /* ── DATA FETCHING ── */
  useEffect(() => {
    fetchAdvertisementDetails();
    fetchDistricts();
    fetchGrades();
    fetchTestTypes();
  }, [id]);

  const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/grades?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "X-API-KEY": API_KEY,
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
    } catch (error) {
      console.error("Error fetching grades:", error);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/districts`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "X-API-KEY": API_KEY,
        },
      });
      const result = await response.json();
      if (result.success) {
        setDistrictOptions(result.data.data.map((d) => ({
          id: d.hash_id,
          name: d.name,
        })));
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchTestTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/tests`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "X-API-KEY": API_KEY,
        },
      });
      const result = await response.json();
      if (result.success) {
        const list = result.data?.data ?? result.data ?? [];
        setTestTypeOptions(list.map((t) => ({
          id: t.hash_id || String(t.id),
          name: t.test_name,
        })));
      }
    } catch (error) {
      console.error("Error fetching test types:", error);
    }
  };

  const fetchAdvertisementDetails = async () => {
    setLoading(true);
    try {
      const result = await AdvertisementApi.getById(id);
      if (result.success) {
        setAdvertisement(result.data);
        if (result.data.job_details?.length > 0) {
          setSelectedJobId(result.data.job_details[0].hash_id);
        }
      } else {
        toast.error(result.message || 'Failed to load advertisement details');
        navigate('/dashboard/advertisement-records');
      }
    } catch (error) {
      toast.error(error.message || 'Error loading details');
      navigate('/dashboard/advertisement-records');
    } finally {
      setLoading(false);
    }
  };

  /* ── HELPERS & MEMO ── */
  const selectedJob = useMemo(() => {
    return advertisement?.job_details?.find(j => j.hash_id === selectedJobId) || null;
  }, [advertisement, selectedJobId]);

  const getDistrictName = (hashId) => {
    if (!hashId || districtOptions.length === 0) return hashId || "N/A";
    const district = districtOptions.find((d) => d.id === hashId);
    return district ? district.name : hashId;
  };

  // Resolve a stored scale value (hash_id, number, or string) to the
  // human-readable grade name (e.g. "BPS-17"). The grade name already
  // includes the "BPS-"/"BS-" prefix, so it's rendered as-is.
  const getScaleName = (rawScale) => {
    if (rawScale === null || rawScale === undefined || rawScale === '') return 'N/A';
    if (typeof rawScale === 'object') {
      return rawScale.name || rawScale.hash_id || rawScale.id || 'N/A';
    }
    const str = String(rawScale).trim();
    const matched = gradeOptions.find((g) => g.id === str || g.name === str);
    return matched ? matched.name : str;
  };

  const LEGACY_TEST_TYPE_NAMES = { '1': 'MCQs', '2': 'Written Exam' };

  const getTestTypeName = (testType) => {
    if (!testType) return 'N/A';
    if (LEGACY_TEST_TYPE_NAMES[testType]) return LEGACY_TEST_TYPE_NAMES[testType];
    const test = testTypeOptions.find((t) => t.id === testType);
    return test ? test.name : testType;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_ROOT}/${path}`;
  };

  const parseTerms = (terms) => {
    if (Array.isArray(terms)) return terms;
    try {
      return JSON.parse(terms);
    } catch {
      return [];
    }
  };

  /* ── RENDER HELPERS ── */
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <InlineLoader text="Fetching advertisement record..." variant="ring" size="lg" />
      </div>
    );
  }

  if (!advertisement) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Record Not Found</h2>
        <button 
          onClick={() => navigate('/dashboard/advertisement-records')}
          className="mt-4 px-6 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg font-bold hover:from-emerald-900 hover:to-emerald-950 transition-all shadow-md"
        >
          Return to List
        </button>
      </div>
    );
  }

  const termsList = parseTerms(advertisement.terms_conditions);

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ── HEADER SECTION ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate('/dashboard/advertisement-records')}
              className="p-2.5 bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all border border-slate-200"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-widest border border-emerald-100">
                  {advertisement.hash_id}
                </span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border ${
                  (STATUS_BADGES[advertisement.status] || STATUS_BADGES.active).className
                }`}>
                  {(STATUS_BADGES[advertisement.status] || STATUS_BADGES.active).label}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{advertisement.adv_number}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Closing Date</span>
              <div className="text-sm font-black text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-red-50 rounded-lg"><Clock size={14} className="text-red-600" /></div>
                {formatDate(advertisement.closing_date)}
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Adv. Date</span>
              <div className="text-sm font-black text-slate-700 flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 rounded-lg"><Calendar size={14} className="text-emerald-700" /></div>
                {formatDate(advertisement.adv_date)}
              </div>
            </div>
            {advertisement.status === 'extend_date' && advertisement.extend_date && (
              <>
                <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Extend Date</span>
                  <div className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 rounded-lg"><Clock size={14} className="text-amber-600" /></div>
                    {formatDate(advertisement.extend_date)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── POST SELECTOR ── */}
        <div className="relative z-10">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Select Post to View Details</label>
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-700">
              <Briefcase size={20} />
            </div>
            <select 
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-12 py-4 text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:border-emerald-700 transition-all cursor-pointer shadow-sm group-hover:border-emerald-300"
            >
              {advertisement.job_details?.map((job) => (
                <option key={job.hash_id} value={job.hash_id}>
                  {job.designation} ({getScaleName(job.scale)}) — {job.num_posts} Positions
                </option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-emerald-700 transition-colors">
              <ChevronDown size={20} />
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT CARD ── */}
        <AnimatePresence mode="wait">
          {selectedJob && (
            <motion.div
              key={selectedJob.hash_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* CARD TOP: JOB SUMMARY */}
              <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 p-8 md:p-10 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                        Position Details
                      </span>
                      <span className="text-emerald-200/60 font-bold text-xs uppercase tracking-widest">
                        Ref: {selectedJob.hash_id}
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{selectedJob.designation}</h2>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
                        <Layers size={16} className="text-emerald-300" />
                        <span className="text-sm font-bold">{getScaleName(selectedJob.scale)}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
                        <Users size={16} className="text-blue-300" />
                        <span className="text-sm font-bold">{selectedJob.num_posts} Posts</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
                        <Building2 size={16} className="text-amber-300" />
                        <span className="text-sm font-bold truncate max-w-[200px]">{selectedJob.department?.name || selectedJob.department || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[180px] flex flex-col items-center shadow-lg">
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">Application Fee</p>
                    <p className="text-2xl font-black tracking-tight">PKR {Number(selectedJob.pivot?.fee).toLocaleString()}</p>
                    <div className="mt-4 px-4 py-1.5 bg-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">
                      Active
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD BODY */}
              <div className="p-8 md:p-10 space-y-12">
                
                {/* 1. STATS GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Vacancy Date', value: selectedJob.vacancy_date || 'N/A', icon: Calendar, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { label: 'Test Type', value: getTestTypeName(selectedJob.pivot?.test_type), icon: FileText, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { label: 'Approval Status', value: selectedJob.status?.toUpperCase(), icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { label: 'Workflow Status', value: selectedJob.current_status?.replace('_', ' ')?.toUpperCase() || 'N/A', icon: Layout, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
                        <stat.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                        <p className="text-sm font-bold text-slate-800">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. REQUIREMENTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Academic */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 bg-emerald-700 text-white rounded-lg flex items-center justify-center shadow-sm">
                        <GraduationCap size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Academic & Experience</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-6 space-y-4 border border-slate-100 shadow-sm">
                      <DetailItem label="Primary Qualification" value={selectedJob.qualification?.academic_qualification} />
                      <DetailItem label="Degree Equivalence" value={selectedJob.qualification?.degree_equivalence} />
                      <DetailItem label="Experience" value={`${selectedJob.qualification?.experience_length} Years (${selectedJob.qualification?.experience_type === "4" ? "Professional" : "General"})`} />
                      <DetailItem label="Institute" value={selectedJob.qualification?.training_institute} />
                    </div>
                  </div>

                  {/* Eligibility */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 bg-emerald-700 text-white rounded-lg flex items-center justify-center shadow-sm">
                        <ShieldCheck size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Eligibility Criteria</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-6 space-y-4 border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age Limit</span>
                        <span className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                          {selectedJob.eligibility?.min_age} - {selectedJob.eligibility?.max_age} Years
                        </span>
                      </div>
                      <DetailItem label="Nationality" value={selectedJob.eligibility?.nationality} />
                      <DetailItem label="Gender Basis" value={selectedJob.eligibility?.gender_basis} />
                      <DetailItem label="Domicile" value={getDistrictName(selectedJob.eligibility?.domicile)} />
                    </div>
                  </div>
                </div>

                {/* 3. DISTRICT TABLE */}
                {selectedJob.multiple_posts?.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 bg-emerald-700 text-white rounded-lg flex items-center justify-center shadow-sm">
                        <Globe size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">District-Wise Posts</h3>
                    </div>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
                          <tr>
                            <th className="px-8 py-4">District/Unit</th>
                            <th className="px-8 py-4 text-center">Quota</th>
                            <th className="px-8 py-4 text-right">Posts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                          {selectedJob.multiple_posts.map((mp, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-4 text-slate-900">{getDistrictName(mp.district)}</td>
                              <td className="px-8 py-4 text-center text-xs">{mp.quota || 'Open Merit'}</td>
                              <td className="px-8 py-4 text-right font-bold text-emerald-700">{mp.post}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. ATTACHMENTS & REMARKS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-6 border-t border-slate-100">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 bg-emerald-700 text-white rounded-lg flex items-center justify-center shadow-sm">
                        <Download size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Official Attachments</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Service Rules', key: 'service_rules' },
                        { label: 'Syllabus', key: 'syllabus' },
                        { label: 'Requisition Form', key: 'requisition_form' },
                        { label: 'Annex-A Form', key: 'annex_a_form' },
                        { label: 'Other Attachment', key: 'other_attachment' },
                      ].map((doc, i) => {
                        const url = getFileUrl(selectedJob[doc.key]);
                        return (
                          <a 
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                              url 
                                ? 'bg-white text-slate-700 border-slate-200 hover:border-emerald-700 hover:bg-emerald-50 group shadow-sm'
                                : 'bg-slate-50 text-slate-300 border-slate-100 pointer-events-none'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${url ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100'}`}>
                                <ClipboardList size={16} />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-tight">{doc.label}</span>
                            </div>
                            {url && <ExternalLink size={14} className="text-slate-400 group-hover:text-emerald-700" />}
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Info size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Post Remarks</h3>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-2xl min-h-[140px] shadow-sm">
                      {selectedJob.remarks ? (
                        <p className="text-xs text-amber-900 font-bold leading-relaxed italic">{selectedJob.remarks}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic font-medium text-center pt-10">No specific remarks for this post.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FOOTER SECTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
          {/* Notes */}
          {advertisement.important_notes && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="p-1 bg-emerald-50 rounded-md"><Info size={14} className="text-emerald-700" /></div>
                Advertisement Notes
              </h4>
              <p className="text-sm text-slate-600 font-bold leading-relaxed">{advertisement.important_notes}</p>
            </div>
          )}

          {/* Terms */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="p-1 bg-emerald-50 rounded-md"><CheckCircle size={14} className="text-emerald-700" /></div>
              Terms & Conditions
            </h4>
            <div className="space-y-4">
              {termsList.map((term, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0 transition-colors group-hover:bg-emerald-800 group-hover:text-white">
                    {i + 1}
                  </div>
                  <p className="text-xs text-slate-700 font-bold leading-relaxed pt-1">{term}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="flex justify-between items-start py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">{label}</span>
    <span className="text-sm font-bold text-slate-800 text-right max-w-[220px]">{value || 'N/A'}</span>
  </div>
);

export default AdvertisementDetail;
