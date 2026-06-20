import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdvertisementApi from '../../api/advertisementApi';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { formatDate } from 'utils/dateUtils';

const STATUS_BADGES = {
  active:              { label: 'Active',             className: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  published:           { label: 'Published',          className: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
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
  const getDistrictName = (hashId) => {
    if (!hashId || districtOptions.length === 0) return hashId || "N/A";
    const district = districtOptions.find((d) => d.id === hashId);
    return district ? district.name : hashId;
  };

  const getScaleName = (rawScale) => {
    if (rawScale === null || rawScale === undefined || rawScale === '') return 'N/A';
    if (typeof rawScale === 'object') {
      return rawScale.name || rawScale.hash_id || rawScale.id || 'N/A';
    }
    const str = String(rawScale).trim();
    const matched = gradeOptions.find((g) => g.id === str || g.name === str);
    return matched ? matched.name : str;
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

  const getRomanNumeral = (num) => {
    const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'];
    return roman[num - 1] || String(num);
  };

  const getQualificationText = (job) => {
    const q = job.qualification;
    if (!q) return 'N/A';
    const parts = [];
    if (q.academic_qualification) {
      parts.push(q.academic_qualification);
    }
    if (q.degree_equivalence) {
      parts.push(`Degree Equivalence: ${q.degree_equivalence}`);
    }
    if (q.experience_length) {
      const expType = q.experience_type === "4" ? "Professional" : "General";
      parts.push(`Experience: ${q.experience_length} Years (${expType})`);
    }
    if (q.training_institute) {
      parts.push(`Training Institute: ${q.training_institute}`);
    }
    return parts.join(' | ');
  };

  const getAttachmentLinks = (job) => {
    const links = [];
    if (job.service_rules) links.push({ label: 'Service Rules', url: getFileUrl(job.service_rules) });
    if (job.syllabus) links.push({ label: 'Syllabus', url: getFileUrl(job.syllabus) });
    if (job.requisition_form) links.push({ label: 'Requisition Form', url: getFileUrl(job.requisition_form) });
    if (job.annex_a_form) links.push({ label: 'Annex-A Form', url: getFileUrl(job.annex_a_form) });
    if (job.other_attachment) links.push({ label: 'Other Attachment', url: getFileUrl(job.other_attachment) });
    return links;
  };

  const hasAttachments = (job) => {
    return !!(job.service_rules || job.syllabus || job.requisition_form || job.annex_a_form || job.other_attachment);
  };

  const groupedJobs = useMemo(() => {
    if (!advertisement?.job_details) return [];
    const map = {};
    advertisement.job_details.forEach((job) => {
      // Prioritize string check to prevent any optional chaining issues on primitive types
      let deptName = 'Other Department';
      if (typeof job.department === 'string' && job.department.trim() !== '') {
        deptName = job.department;
      } else if (job.department && typeof job.department === 'object') {
        deptName = job.department.department_name || job.department.name || 'Other Department';
      } else if (job.department_name) {
        deptName = job.department_name;
      }

      const deptId = (job.department && typeof job.department === 'object')
        ? (job.department.hash_id || job.department.id || deptName)
        : deptName;

      if (!map[deptId]) {
        map[deptId] = {
          name: deptName,
          jobs: [],
          totalPosts: 0
        };
      }
      map[deptId].jobs.push(job);
      map[deptId].totalPosts += Number(job.num_posts || 0);
    });

    const sortedGroups = Object.values(map);

    // Sort departments alphabetically (case-insensitive) by department name
    sortedGroups.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // Sort jobs within each department alphabetically (case-insensitive) by designation
    sortedGroups.forEach((group) => {
      group.jobs.sort((a, b) => {
        const desA = a.designation || '';
        const desB = b.designation || '';
        return desA.localeCompare(desB, undefined, { sensitivity: 'base' });
      });
    });

    return sortedGroups;
  }, [advertisement]);

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
    <div className="p-6 min-h-screen adv-sheet-container">
      <style>{`
        .adv-sheet-container {
          background: #e9ebe9;
          color: #1a1a1a;
          font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 12.5px;
          line-height: 1.5;
        }
        .adv-sheet {
          background: #ffffff;
          width: 210mm;
          min-height: 297mm;
          margin: 14px auto;
          padding: 18mm 16mm;
          box-shadow: 0 1px 8px rgba(0,0,0,.15);
          box-sizing: border-box;
        }
        .adv-sheet * {
          box-sizing: border-box;
        }
        .adv-masthead {
          text-align: center;
          border-bottom: 3px double #14532d;
          padding-bottom: 12px;
        }
        .adv-crest-img {
          width: 60px;
          height: 60px;
          margin: 0 auto 8px;
          display: block;
          object-fit: contain;
        }
        .adv-gov {
          font-size: 11px;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #555;
        }
        .adv-org {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          font-weight: 700;
          color: #14532d;
          margin: 3px 0 1px;
          letter-spacing: .01em;
        }
        .adv-seat {
          font-size: 11.5px;
          color: #555;
        }
        .adv-web {
          font-size: 11.5px;
          color: #14532d;
          font-weight: 600;
        }
        .adv-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          background: #14532d;
          color: #fff;
          padding: 8px 16px;
          border-radius: 3px;
        }
        .adv-bar .adv-no {
          font-family: Georgia, serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: .04em;
        }
        .adv-bar .deadline {
          font-size: 12px;
          text-align: right;
          color: #fff;
        }
        .adv-bar .deadline b {
          display: block;
          font-size: 14px;
          font-weight: 700;
        }
        h3.adv-block-title {
          font-family: Georgia, serif;
          font-size: 15px;
          color: #14532d;
          margin: 22px 0 8px;
          padding-bottom: 4px;
          border-bottom: 1.5px solid #8a958a;
          text-transform: uppercase;
          letter-spacing: .06em;
        }
        ol.adv-notes, ol.adv-terms {
          margin: 0;
          padding-left: 0;
          counter-reset: item;
          list-style: none;
        }
        ol.adv-notes > li, ol.adv-terms > li {
          counter-increment: item;
          position: relative;
          padding: 6px 0 6px 30px;
          border-bottom: 1px dotted #cdd3cd;
        }
        ol.adv-notes > li::before, ol.adv-terms > li::before {
          content: counter(item, decimal-leading-zero);
          position: absolute;
          left: 0;
          top: 6px;
          font-family: Georgia, serif;
          font-weight: 700;
          color: #9a7b1e;
          font-size: 12px;
        }
        ol.adv-terms > li:last-child, ol.adv-notes > li:last-child {
          border-bottom: none;
        }
        .adv-dept {
          margin-top: 18px;
        }
        .adv-dept-head {
          font-family: Georgia, serif;
          font-size: 15px;
          color: #fff;
          background: #14532d;
          margin: 0 0 10px;
          padding: 7px 12px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .adv-dept-head .adv-dept-no {
          background: #fff;
          color: #14532d;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex: 0 0 auto;
        }
        .adv-dept-head .adv-dept-total {
          margin-left: auto;
          font-family: "Segoe UI", sans-serif;
          font-size: 11px;
          font-weight: 600;
          background: rgba(255,255,255,.18);
          padding: 2px 9px;
          border-radius: 11px;
          letter-spacing: .03em;
        }
        .adv-post {
          border: 1px solid #8a958a;
          border-radius: 4px;
          margin: 0 0 12px;
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .adv-post-head {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #e8f0ea;
          padding: 7px 12px;
          border-bottom: 1px solid #8a958a;
        }
        .adv-post-title {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }
        .adv-post-title .sn {
          font-family: Georgia, serif;
          font-weight: 700;
          color: #14532d;
        }
        .adv-post-title .ptitle {
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .adv-post-title .cadre {
          font-size: 10.5px;
          color: #9a7b1e;
          border: 1px solid #9a7b1e;
          padding: 0 6px;
          border-radius: 9px;
          font-weight: 600;
        }
        .adv-post-title .bps {
          font-size: 10.5px;
          font-weight: 700;
          color: #fff;
          background: #14532d;
          padding: 1px 8px;
          border-radius: 9px;
        }
        .adv-post-vacancies {
          margin-left: auto;
          text-align: center;
          line-height: 1;
          flex: 0 0 auto;
        }
        .adv-post-vacancies .vac-num {
          display: block;
          font-family: Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          color: #14532d;
        }
        .adv-post-vacancies .vac-lbl {
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #555;
        }
        table.adv-meta {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        table.adv-meta td {
          width: 33.33%;
          padding: 6px 12px;
          border: 1px solid #cdd3cd;
          vertical-align: top;
        }
        table.adv-meta tr:first-child td {
          border-top: none;
        }
        table.adv-meta tr:last-child td {
          border-bottom: none;
        }
        table.adv-meta td:first-child {
          border-left: none;
        }
        table.adv-meta td:last-child {
          border-right: none;
        }
        .adv-m-lbl {
          display: block;
          font-size: 9px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #555;
        }
        .adv-m-val {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .adv-qual {
          padding: 8px 12px;
          border-top: 1px solid #8a958a;
          background: #fff;
        }
        .adv-qual .q-lbl {
          display: block;
          font-size: 9px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #14532d;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .adv-qual p {
          margin: 0;
          font-size: 11.5px;
          text-align: justify;
          color: #1a1a1a;
        }
        .adv-post-note {
          padding: 6px 12px;
          background: #fff7e6;
          border-top: 1px solid #cdd3cd;
          font-size: 11px;
          color: #555;
        }
        .adv-post-note span {
          font-weight: 700;
          color: #9a7b1e;
          margin-right: 6px;
          text-transform: uppercase;
          font-size: 9.5px;
          letter-spacing: .08em;
        }
        .adv-signoff {
          margin-top: 26px;
          display: flex;
          justify-content: flex-end;
        }
        .adv-signoff .sig {
          text-align: center;
        }
        .adv-signoff .sig .line {
          border-top: 1px solid #1a1a1a;
          width: 200px;
          margin: 34px 0 4px;
        }
        .adv-signoff .sig .role {
          font-weight: 700;
          color: #1a1a1a;
        }
        .adv-signoff .sig .org2 {
          font-size: 11px;
          color: #555;
        }
        .adv-signoff .sig .date {
          font-size: 11px;
          color: #555;
          margin-top: 2px;
        }
        .adv-disclaimer {
          margin-top: 18px;
          padding: 10px 12px;
          border: 1px dashed #8a958a;
          background: #fafafa;
          font-size: 10.5px;
          color: #555;
          border-radius: 4px;
        }
        .adv-disclaimer b {
          color: #1a1a1a;
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          aside, nav, header, footer, .no-print, .sticky, button, [role="navigation"], [class*="sidebar"], [class*="navbar"], .fixed.inset-0, [class*="backdrop-blur"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            opacity: 0 !important;
          }
          #root,
          .min-h-screen,
          div.flex-1,
          div[style*="margin-left"],
          main,
          .adv-sheet-container,
          .max-w-5xl {
            margin: 0 !important;
            padding: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            background-color: #fff !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            display: block !important;
            position: static !important;
            float: none !important;
          }
          .adv-sheet {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
          }
          .adv-dept {
            break-inside: auto;
            page-break-inside: auto;
          }
          .adv-post {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .adv-dept-head, h3.adv-block-title {
            break-after: avoid;
            page-break-after: avoid;
          }
          .adv-meta, .adv-qual, .adv-post-note {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .adv-signoff, .adv-disclaimer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="mx-auto" style={{ maxWidth: '210mm' }}>
        {/* ── TOOLBAR SECTION (no-print) ── */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6" style={{ position: 'sticky', top: '72px', zIndex: 20 }}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard/advertisement-records')}
              className="p-2 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-all border border-slate-200"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  ID: {advertisement.hash_id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  advertisement.publish_date
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : (STATUS_BADGES[advertisement.status] || STATUS_BADGES.active).className
                }`}>
                  {advertisement.publish_date ? 'Published' : (STATUS_BADGES[advertisement.status] || STATUS_BADGES.active).label}
                </span>
                {advertisement.secretary_name && (
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    Secretary: {advertisement.secretary_name}
                  </span>
                )}
                {advertisement.publish_date && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                    Published: {formatDate(advertisement.publish_date)}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-black text-slate-800">{advertisement.adv_number}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-sm shadow transition-all"
            >
              <Download size={16} /> Print Advertisement
            </button>
          </div>
        </div>

        {/* ── MAIN A4 SHEET VIEW ── */}
        <div className="adv-sheet">
          <div className="adv-masthead">
            <img 
              src="/assets/img/favicon/Logo.png" 
              alt="Azad Jammu & Kashmir Crest" 
              className="adv-crest-img" 
            />
            <div className="adv-gov">Government of Azad Jammu &amp; Kashmir</div>
            <div className="adv-org">Azad Jammu &amp; Kashmir Public Service Commission</div>
            <div className="adv-seat">Jalalabad, Muzaffarabad</div>
            <div className="adv-web">https://ajkpsc.punjab.gov.pk/</div>
            <div className="adv-bar">
              <div className="adv-no">{advertisement.adv_number}</div>
              <div className="deadline">
                Last date for receipt of applications
                <b>{formatDate(advertisement.closing_date)}</b>
              </div>
            </div>
          </div>

          <h3 className="adv-block-title">Important Note</h3>
          <ol className="adv-notes">
            {advertisement.important_notes ? (
              <li style={{ whiteSpace: 'pre-line' }}>{advertisement.important_notes}</li>
            ) : (
              <li>
                Applicants must apply <strong>online only</strong> through the Commission’s official website{' '}
                <strong>https://ajkpsc.punjab.gov.pk/</strong>. The application must be complete in all respects and the candidate
                must possess the prescribed qualification / eligibility under the rules. Incomplete applications, or
                those received after the last date, will not be entertained.
              </li>
            )}
          </ol>

          <h3 className="adv-block-title">Posts &amp; Eligibility</h3>

          {groupedJobs.map((dept, deptIdx) => (
            <section key={deptIdx} className="adv-dept">
              <div className="adv-dept-lead">
                <h2 className="adv-dept-head">
                  <span className="adv-dept-no">{deptIdx + 1}</span>
                  {dept.name}
                  <span className="adv-dept-total">
                    {dept.totalPosts} {dept.totalPosts === 1 ? 'post' : 'posts'}
                  </span>
                </h2>

                {dept.jobs.map((job, jobIdx) => (
                  <article key={jobIdx} className="adv-post">
                    <header className="adv-post-head">
                      <div className="adv-post-title">
                        <span className="sn">({getRomanNumeral(jobIdx + 1)})</span>
                        <span className="ptitle">{job.designation}</span>
                        <span className="bps">{getScaleName(job.scale)}</span>
                      </div>
                      <div className="adv-post-vacancies">
                        <span className="vac-num">{String(job.num_posts).padStart(2, '0')}</span>
                        <span className="vac-lbl">{job.num_posts === 1 ? 'Post' : 'Posts'}</span>
                      </div>
                    </header>
                    <table className="adv-meta">
                      <tbody>
                        <tr>
                          <td>
                            <span className="adv-m-lbl">Case No.</span>
                            <span className="adv-m-val">{job.hash_id || 'N/A'}</span>
                          </td>
                          <td>
                            <span className="adv-m-lbl">Quota</span>
                            <span className="adv-m-val">
                              {(() => {
                                const mt = job.eligibility?.merit_type || '';
                                if (mt === 'open_merit') return 'Open Merit';
                                if (mt === 'quota_wise') return 'Quota Base';
                                return job.multiple_posts?.length > 0 ? 'Quota Base' : 'Open Merit';
                              })()}
                            </span>
                          </td>
                          <td>
                            <span className="adv-m-lbl">Age Limit</span>
                            <span className="adv-m-val">
                              {job.eligibility?.min_age && job.eligibility?.max_age
                                ? `${job.eligibility.min_age} \u2013 ${job.eligibility.max_age} years`
                                : 'N/A'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <span className="adv-m-lbl">Fee</span>
                            <span className="adv-m-val">
                              {job.pivot?.fee ? `Rs. ${Number(job.pivot.fee).toLocaleString()}/-` : 'Rs. 505/-'}
                            </span>
                          </td>
                          <td>
                            <span className="adv-m-lbl">Gender</span>
                            <span className="adv-m-val">{job.eligibility?.gender_basis || 'Male/Female'}</span>
                          </td>
                        </tr>
                        {(() => {
                          const mt = job.eligibility?.merit_type || '';
                          const isMerit = mt === 'open_merit' || (!mt && !(job.multiple_posts?.length > 0));
                          return (
                            <tr>
                              <td colSpan={3}>
                                <span className="adv-m-lbl">District/Unit</span>
                                <span className="adv-m-val">
                                  {job.multiple_posts?.length > 0
                                    ? job.multiple_posts.map(mp => `${getDistrictName(mp.district)} ${mp.post || ''}`).join(', ')
                                    : districtOptions.map(d => d.name).join(', ') || 'All AJK Districts'}
                                </span>
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                    <div className="adv-qual">
                      <span className="adv-q-lbl">Qualification</span>
                      <p>{getQualificationText(job)}</p>
                    </div>

                    {job.remarks && (
                      <div className="adv-post-note">
                        <span>Note</span>
                        {job.remarks}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}

          <h3 className="adv-block-title">Terms &amp; Conditions</h3>
          <ol className="adv-terms">
            {termsList.length > 0 ? (
              termsList.map((term, i) => (
                <li key={i}>{term}</li>
              ))
            ) : (
              <li>No specific terms &amp; conditions provided.</li>
            )}
          </ol>

          <div className="adv-signoff">
            <div className="sig">
              <div className="line"></div>
              <div className="role">{advertisement.secretary_name ? `${advertisement.secretary_name}` : 'Secretary'}</div>
              <div className="org2">Secretary, AJ&K Public Service Commission</div>
              <div className="date">Dated: {advertisement.publish_date ? formatDate(advertisement.publish_date) : formatDate(advertisement.adv_date)}</div>
            </div>
          </div>

          <div className="adv-disclaimer">
            <b>Note:</b> This is an English-language, reformatted version prepared from the original bilingual
            (Urdu/English) advertisement for ease of reading. The Terms &amp; Conditions have been translated from Urdu.
            In case of any difference, the <b>original advertisement issued by the AJK Public Service Commission</b> shall
            prevail. Please verify the closing date, fee, bank account details and other particulars on the official
            website <b>https://ajkpsc.punjab.gov.pk/</b> before applying.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertisementDetail;

