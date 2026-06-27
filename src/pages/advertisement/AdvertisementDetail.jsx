import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdvertisementApi from '../../api/advertisementApi';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { formatDate } from 'utils/dateUtils';

const AdvertisementDetail = () => {
  /* ── HOOKS & STATE ── */
  const { id } = useParams();
  const navigate = useNavigate();
  const [advertisement, setAdvertisement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [testTypeOptions, setTestTypeOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [secretarySignature, setSecretarySignature] = useState(null);

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
    fetchSubjects();
    fetchSecretarySignature();
  }, [id]);

  const resolveSignatureImage = (path) => {
    if (!path) return null;
    const imagePath = String(path).trim();
    if (!imagePath) return null;
    if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('data:')) return imagePath;
    return `${API_ROOT}/${imagePath.replace(/^\/+/, '')}`;
  };

  const getDesignationName = (designation) => {
    if (!designation) return '';
    if (typeof designation === 'object') {
      return designation.name || designation.designation_name || designation.title || '';
    }
    return String(designation);
  };

  const fetchSecretarySignature = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/digital-signature?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      const records = result.data?.data ?? result.data ?? [];
      const secretary = (Array.isArray(records) ? records : []).find((record) => {
        const designation = getDesignationName(
          record.designation ?? record.designation_name
        ).trim().toLowerCase();
        const status = String(record.status ?? 'active').trim().toLowerCase();
        return designation === 'secretary' && status === 'active';
      });

      setSecretarySignature(
        secretary
          ? {
              name: secretary.name || '',
              image: resolveSignatureImage(secretary.image ?? secretary.image_url),
            }
          : null
      );
    } catch {
      setSecretarySignature(null);
    }
  };

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
            .map((g) => ({ id: String(g.hash_id || g.id), name: g.name }))
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
        const list = result.data?.data ?? result.data ?? [];
        setDistrictOptions(list.map((d) => ({
          id: String(d.hash_id || d.id),
          name: d.name,
        })));
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchTestTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/test-types?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "X-API-KEY": API_KEY,
        },
      });
      const result = await response.json();
      if (result.success || result.status === 200) {
        const list = result.data?.data ?? result.data ?? [];
        setTestTypeOptions(list.map((t) => ({
          id: String(t.hash_id || t.id),
          numeric_id: t.id ? String(t.id) : '',
          hash_id: t.hash_id ? String(t.hash_id) : '',
          name: t.name || t.test_name || t.title || 'N/A',
        })));
      }
    } catch (error) {
      console.error("Error fetching test types:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/subjects?per_page=500`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "X-API-KEY": API_KEY,
        },
      });
      const result = await response.json();
      if (result.success || result.status === 200) {
        const list = result.data?.data ?? result.data ?? [];
        setSubjectOptions(
          list.map((s) => ({
            id: String(s.id),
            hash_id: s.hash_id ? String(s.hash_id) : '',
            name: s.subject_name || s.name || s.title || 'N/A',
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
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

  const toTitleCase = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    return String(value)
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getTestTypeName = (rawTestType) => {
    if (!rawTestType) return 'N/A';

    if (typeof rawTestType === 'object') {
      return (
        rawTestType.test_name ||
        rawTestType.name ||
        rawTestType.title ||
        rawTestType.hash_id ||
        rawTestType.id ||
        'N/A'
      );
    }

    const str = String(rawTestType).trim();

    const matched = testTypeOptions.find((t) =>
      String(t.id) === str ||
      String(t.numeric_id) === str ||
      String(t.hash_id) === str ||
      String(t.name).toLowerCase() === str.toLowerCase()
    );

    return matched ? matched.name : toTitleCase(str);
  };

  const getCceStageName = (rawStage) => {
    if (!rawStage) return 'N/A';

    const stageMap = {
      screening: 'Screening',
      screening_test: 'Screening',
      written: 'Written Test',
      written_test: 'Written Test',
      written_exam: 'Written Test',
    };

    const key = String(rawStage).trim().toLowerCase();
    return stageMap[key] || toTitleCase(rawStage);
  };

  const getSubjectName = (subject) => {
    if (!subject) return 'N/A';

    if (subject.subject_name) return subject.subject_name;
    if (subject.name) return subject.name;

    const subjectId = subject.id ? String(subject.id) : '';
    const subjectHashId = subject.hash_id ? String(subject.hash_id) : '';
    const subjectIdFromApi = subject.subject_id ? String(subject.subject_id) : '';

    const matched = subjectOptions.find((s) =>
      (subjectId && String(s.id) === subjectId) ||
      (subjectId && String(s.hash_id) === subjectId) ||
      (subjectHashId && String(s.hash_id) === subjectHashId) ||
      (subjectHashId && String(s.id) === subjectHashId) ||
      (subjectIdFromApi && String(s.id) === subjectIdFromApi) ||
      (subjectIdFromApi && String(s.hash_id) === subjectIdFromApi)
    );

    return matched?.name || subjectHashId || subjectIdFromApi || subjectId || 'N/A';
  };

  // Build a map of job_id → subjects from advertisement job_subjects.
  // Subject name is resolved from relation first, then /settings/subjects API fallback.
  const subjectsByJob = useMemo(() => {
    const rows = advertisement?.job_subjects || advertisement?.jobSubjects || [];
    if (!Array.isArray(rows) || rows.length === 0) return {};

    const map = {};

    rows.forEach((js) => {
      const possibleJobKeys = [
        js.job_id,
        js.job?.id,
        js.job?.hash_id,
        js.job_hash_id,
      ].filter((v) => v !== null && v !== undefined && v !== '');

      possibleJobKeys.forEach((key) => {
        const jId = String(key);

        if (!map[jId]) map[jId] = [];

        map[jId].push({
          id: js.subject_id ? String(js.subject_id) : '',
          subject_id: js.subject_id ? String(js.subject_id) : '',
          hash_id: js.subject?.hash_id
            ? String(js.subject.hash_id)
            : (js.subject_hash_id ? String(js.subject_hash_id) : ''),
          subject_name: js.subject?.subject_name || js.subject?.name || '',
          name: js.subject?.subject_name || js.subject?.name || '',
          marks: js.marks ?? js.total_marks ?? '',
        });
      });
    });

    return map;
  }, [advertisement]);

  const getJobSubjects = (job) => {
    const possibleKeys = [
      job.id,
      job.job_id,
      job.hash_id,
      job.pivot?.job_id,
      job.pivot?.id,
    ]
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map((v) => String(v));

    for (const key of possibleKeys) {
      if (subjectsByJob[key]?.length) return subjectsByJob[key];
    }

    return [];
  };

  const getDistrictName = (hashId) => {
    if (!hashId || districtOptions.length === 0) return hashId || "N/A";
    const district = districtOptions.find((d) => String(d.id) === String(hashId));
    return district ? district.name : hashId;
  };

  const getScaleName = (rawScale) => {
    if (rawScale === null || rawScale === undefined || rawScale === '') return 'N/A';
    if (typeof rawScale === 'object') {
      return rawScale.name || rawScale.hash_id || rawScale.id || 'N/A';
    }
    const str = String(rawScale).trim();
    const matched = gradeOptions.find((g) => String(g.id) === str || String(g.name) === str);
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

  const groupedJobs = useMemo(() => {
    if (!advertisement?.job_details) return [];

    const map = {};

    advertisement.job_details.forEach((job) => {
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
          totalPosts: 0,
        };
      }

      map[deptId].jobs.push(job);
      map[deptId].totalPosts += Number(job.num_posts || 0);
    });

    const sortedGroups = Object.values(map);

    sortedGroups.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

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

  // Running serial number across ALL departments/posts (1, 2, 3 ...).
  // Reset on every render; the JSX maps execute top-to-bottom in order.
  let serialNo = 0;

  return (
    <div className="p-6 min-h-screen adv-sheet-container">
      <style>{`
        .adv-sheet-container {
          background: #e9ebe9;
          color: #1a1a1a;
          font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 12px;
          line-height: 1.32;
        }
        .adv-sheet {
          background: #ffffff;
          width: 210mm;
          margin: 8px auto;
          border-collapse: collapse;
          box-shadow: 0 1px 8px rgba(0,0,0,.15);
        }
        .adv-print-cell {
          padding: 0;
        }
        .adv-print-inner {
          display: flex;
          flex-direction: column;
          min-height: 297mm;
          padding: 4mm 11mm 9mm;
          box-sizing: border-box;
        }
        .adv-footer {
          margin-top: auto;
        }
        /* Top/bottom margin spacers are print-only. */
        .adv-print-pad,
        .adv-print-foot {
          display: none;
        }
        .adv-sheet * {
          box-sizing: border-box;
        }
        .adv-masthead {
          position: relative;
          text-align: center;
          border-bottom: 2px solid #14532d;
          padding-bottom: 8px;
        }
        .adv-mast-info {
          position: absolute;
          top: 0;
          left: 0;
          text-align: left;
        }
        .adv-mast-info .adv-name {
          font-size: 12.5px;
          font-weight: 800;
          color: #14532d;
          line-height: 1.2;
          white-space: nowrap;
        }
        .adv-mast-info .adv-dates {
          font-size: 9.5px;
          color: #888;
          margin-top: 2px;
          line-height: 1.4;
          white-space: nowrap;
        }
        .adv-mast-info .adv-dates b {
          color: #1a1a1a;
          font-weight: 700;
        }
        .adv-mast-actions {
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
        }
        .adv-print-btn,
        .adv-apply-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          padding: 4px 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: #fff;
          white-space: nowrap;
          transition: background .15s ease, color .15s ease;
        }
        .adv-print-btn {
          background: #047857;
        }
        .adv-print-btn:hover {
          background: #065f46;
        }
        .adv-apply-btn {
          background: #9a7b1e;
        }
        .adv-apply-btn:hover {
          background: #7d6418;
        }
        .adv-mast-center {
          text-align: center;
        }
        .adv-crest-img {
          width: 52px;
          height: 52px;
          margin: 0 auto 3px;
          display: block;
          object-fit: contain;
        }
        .adv-title {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 13px;
          font-weight: 700;
          color: #14532d;
          letter-spacing: .01em;
          white-space: nowrap;
        }
        .adv-dept-center {
          text-align: center;
          font-family: Georgia, serif;
          font-size: 14px;
          font-weight: 700;
          color: #14532d;
          text-transform: uppercase;
          letter-spacing: .04em;
          // margin: 7px 0 0;
          background: #cdded2;
          padding: 5px 8px;
          border: 1px solid #8a958a;
          border-bottom: none;
          border-radius: 4px 4px 0 0;
        }
        .adv-dept-center + .adv-post {
          border-top: none;
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }
        .adv-dept-center .adv-dept-total {
          font-family: "Segoe UI", sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: #555;
          text-transform: none;
          letter-spacing: 0;
        }
        table.adv-req {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        table.adv-req th {
          background: #14532d;
          color: #fff;
          font-size: 9px;
          letter-spacing: .08em;
          text-transform: uppercase;
          font-weight: 700;
          padding: 3px 8px;
          border: 1px solid #8a958a;
          text-align: center;
        }
        /* table-layout: fixed takes column widths from the first (header) row. */
        table.adv-req th:nth-child(1) { width: 7%; }
        table.adv-req th:nth-child(2) { width: 12%; }
        table.adv-req th:nth-child(3) { width: 39%; }
        table.adv-req th:nth-child(4) { width: 42%; }
        table.adv-req td {
          border: 1px solid #cdd3cd;
          padding: 5px 8px;
          vertical-align: top;
          font-size: 11px;
        }
        table.adv-req td.sr-col {
          text-align: center;
          vertical-align: middle;
          font-family: Georgia, serif;
          font-weight: 700;
          font-size: 11px;
          color: #9a7b1e;
        }
        table.adv-req td.case-col {
          text-align: center;
          vertical-align: middle;
          font-family: Georgia, serif;
          font-weight: 700;
          font-size: 10px;
          color: #14532d;
          word-break: break-all;
        }
        table.adv-req td.desc-col { text-align: left; }
        table.adv-req td.qual-col { text-align: justify; }
        table.adv-req th:first-child,
        table.adv-req td:first-child {
          border-left: none;
        }
        table.adv-req th:last-child,
        table.adv-req td:last-child {
          border-right: none;
        }
        .adv-req .kv {
          display: block;
          margin-bottom: 2px;
        }
        .adv-req .kv b {
          color: #14532d;
          font-weight: 700;
        }
        .adv-districts {
          padding: 5px 10px;
          border-top: 1px solid #cdd3cd;
          background: #f4f7f4;
          font-size: 11px;
          color: #1a1a1a;
        }
        .adv-districts .d-lbl {
          font-weight: 700;
          color: #14532d;
          text-transform: uppercase;
          font-size: 9.5px;
          letter-spacing: .08em;
          margin-right: 6px;
        }
        h3.adv-block-title {
          font-family: Georgia, serif;
          font-size: 14px;
          color: #14532d;
          margin: 12px 0 6px;
          padding-bottom: 3px;
          border-bottom: 1.5px solid #8a958a;
          text-transform: uppercase;
          letter-spacing: .06em;
        }
        .adv-important-note {
          margin: 8px 0;
          padding: 6px 0;
          font-size: 11px;
          color: #1a1a1a;
          text-align: justify;
          white-space: pre-line;
        }
        .adv-important-note b {
          color: #9a7b1e;
          text-transform: uppercase;
          letter-spacing: .04em;
          font-size: 10.5px;
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
          padding: 4px 0 4px 28px;
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
          margin: 0 0 8px;
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .adv-post-head {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #e8f0ea;
          padding: 5px 10px;
          border-top: 1px solid #8a958a;
          border-bottom: 1px solid #8a958a;
          position: relative;
        }
        .adv-post-title {
          display: flex;
          align-items: baseline;
          justify-content: center;
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
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
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
        .adv-qual .q-lbl,
        .adv-qual .adv-q-lbl {
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
          width: 220px;
        }
        .adv-signoff .sig .signature-image {
          display: block;
          width: 180px;
          height: 72px;
          object-fit: contain;
          margin: 0 auto 4px;
        }
        .adv-signoff .sig .line {
          border-top: 1px solid #1a1a1a;
          width: 200px;
          margin: 4px auto;
        }
        .adv-signoff .sig .line.no-signature {
          margin-top: 76px;
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
          /* margin: 0 leaves the browser NO room to draw its header/footer
             (the localhost URL + page number), so they never print. Page
             margins are instead recreated below with a CSS table so they
             repeat on EVERY page (top + bottom + sides). */
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
          .adv-sheet, .adv-sheet * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          aside, nav, header, footer, .no-print, .sticky, button, [role="navigation"], [class*="sidebar"], [class*="navbar"], .fixed.inset-0, [class*="backdrop-blur"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            opacity: 0 !important;
          }
          .adv-post-head {
            display: flex !important;
            width: auto !important;
            height: auto !important;
            overflow: visible !important;
            opacity: 1 !important;
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
          /* Real <table>: the browser repeats <thead> at the top and <tfoot>
             at the bottom of EVERY printed page, so the empty spacer rows
             become consistent top + bottom margins on page 1, 2, 3 ...
             Side margins come from the content cell's L/R padding. This is
             reliable in Chrome where display:table-* on divs is not. */
          .adv-sheet {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
          }
          .adv-print-pad,
          .adv-print-foot {
            display: table-header-group !important;
          }
          /* Top margin spacer — repeats on EVERY page. */
          .adv-print-pad-cell {
            height: 14mm !important;
            line-height: 14mm !important;
            font-size: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          /* Bottom margin spacer — repeats on EVERY page. */
          .adv-print-foot {
            display: table-footer-group !important;
          }
          .adv-print-foot-cell {
            height: 12mm !important;
            line-height: 12mm !important;
            font-size: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          .adv-print-body {
            display: table-row-group !important;
          }
          /* Side margins on every page. */
          .adv-print-cell {
            padding: 0 14mm !important;
          }
          .adv-print-inner {
            display: block !important;
            min-height: 0 !important;
            padding: 0 !important;
          }
          /* Keep a department band glued to its first post (no orphan heading). */
          .adv-dept {
            break-inside: auto;
            page-break-inside: auto;
          }
          .adv-dept-lead {
            break-inside: auto;
            page-break-inside: auto;
          }
          .adv-dept-center {
            break-after: avoid;
            page-break-after: avoid;
          }
          h3.adv-block-title {
            break-after: avoid;
            page-break-after: avoid;
          }
          /* A single post never splits across pages. */
          .adv-post {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .adv-req, .adv-districts, .adv-post-note {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Signature/note: stay intact, drop to the bottom of the last page,
             and never start a fresh page on their own — pull the preceding
             content (terms / last post) along so there is no blank page. */
          .adv-footer {
            margin-top: auto;
            break-inside: avoid;
            page-break-inside: avoid;
            break-before: avoid;
            page-break-before: avoid;
          }
          .adv-signoff, .adv-disclaimer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="mx-auto" style={{ maxWidth: '210mm' }}>
        {/* ── MAIN A4 SHEET VIEW ──
            A real <table> so the browser repeats <thead>/<tfoot> on every
            printed page, producing consistent top/bottom margins without any
            browser header/footer (URL or page number). Hidden on screen. */}
        <table className="adv-sheet">
          <thead className="adv-print-pad" aria-hidden="true">
            <tr>
              <td className="adv-print-pad-cell">&nbsp;</td>
            </tr>
          </thead>
          <tfoot className="adv-print-foot" aria-hidden="true">
            <tr>
              <td className="adv-print-foot-cell">&nbsp;</td>
            </tr>
          </tfoot>

          <tbody className="adv-print-body">
            <tr>
            <td className="adv-print-cell">
            <div className="adv-print-inner">
            <div className="adv-masthead">
            <div className="adv-mast-info">
              <div className="adv-name">
                {advertisement.advertisement_name || advertisement.adv_number}
              </div>
              <div className="adv-dates">
                Closing Date: <b>{formatDate(advertisement.closing_date)}</b>
              </div>
            </div>

            <div className="adv-mast-center">
              <img
                src="/assets/img/favicon/Logo.png"
                alt="Azad Jammu & Kashmir Crest"
                className="adv-crest-img"
              />
              <div className="adv-title">
                Azad Government of the State of Jammu &amp; Kashmir, Jalalabad, Muzaffarabad
              </div>
            </div>

            <div className="adv-mast-actions no-print">
              <button onClick={() => window.print()} className="adv-print-btn">
                <Download size={14} /> Print Advertisement
              </button>
            </div>
          </div>

          {(advertisement.important_notes ||
            'The application must be complete in all respects and the candidate must possess the prescribed qualification / eligibility under the rules. Incomplete applications, or those received after the last date, will not be entertained.') && (
            <p className="adv-important-note">
              <b>Important Note:</b>{' '}
              {advertisement.important_notes ||
                'The application must be complete in all respects and the candidate must possess the prescribed qualification / eligibility under the rules. Incomplete applications, or those received after the last date, will not be entertained.'}
            </p>
          )}

          {groupedJobs.map((dept, deptIdx) => (
            <section key={deptIdx} className="adv-dept">
              {dept.jobs.map((job, jobIdx) => {
                  const jobSubjects = getJobSubjects(job);
                  const examTypeName = getTestTypeName(
                    job.pivot?.test_type ||
                    job.test_type ||
                    job.exam_test_type ||
                    job.exam_type
                  );
                  const isCceExamType = /cce|combined|competitive/i.test(
                    examTypeName
                  );

                  const cceStageName = getCceStageName(
                    job.pivot?.cce_stage ||
                    job.cce_stage ||
                    job.exam_stage
                  );

                  const quotaLabel = (() => {
                    const mt = job.eligibility?.merit_type || '';
                    if (mt === 'open_merit') return 'Open Merit';
                    if (mt === 'quota_wise') return 'Quota Base';
                    return job.multiple_posts?.length > 0 ? 'Quota Base' : 'Open Merit';
                  })();
                  const isOpenQuota = quotaLabel === 'Open Merit';
                  const currentSerial = ++serialNo;

                  const districtsNote =
                    job.multiple_posts?.length > 0
                      ? job.multiple_posts
                          .map((mp) => `${getDistrictName(mp.district)} ${mp.post || ''}`.trim())
                          .join(', ')
                      : districtOptions.map((d) => d.name).join(', ') || 'All AJK Districts';

                  return (
                    <article key={jobIdx} className="adv-post">
                      {/* Department band only on the first post of the dept,
                          flush at the top so it reads as this card's header. */}
                      {jobIdx === 0 && (
                        <div className="adv-dept-center">
                          {dept.name}{' '}
                          <span className="adv-dept-total">
                            ({dept.totalPosts} {dept.totalPosts === 1 ? 'post' : 'posts'})
                          </span>
                        </div>
                      )}
                      <header className="adv-post-head">
                        <div className="adv-post-title">
                          <span className="ptitle">{job.designation}</span>
                          <span className="bps">{getScaleName(job.scale)}</span>
                        </div>

                        <div className="adv-post-vacancies">
                          <span className="vac-num">
                            {String(job.num_posts || 0).padStart(2, '0')}
                          </span>
                          <span className="vac-lbl">
                            {Number(job.num_posts) === 1 ? 'Post' : 'Posts'}
                          </span>
                        </div>
                      </header>

                      <table className="adv-req">
                        <thead>
                          <tr>
                            <th>Sr No</th>
                            <th>Case No</th>
                            <th>Description</th>
                            <th>Qualification</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="sr-col">{currentSerial}</td>

                            <td className="case-col">{job.hash_id || 'N/A'}</td>

                            <td className="desc-col">
                              <span className="kv">
                                <b>Quota:</b> {quotaLabel}
                              </span>
                              <span className="kv">
                                <b>Age Limit:</b>{' '}
                                {job.eligibility?.min_age && job.eligibility?.max_age
                                  ? `${job.eligibility.min_age} \u2013 ${job.eligibility.max_age} years`
                                  : 'N/A'}
                              </span>
                              <span className="kv">
                                <b>Gender:</b>{' '}
                                {job.eligibility?.gender_basis || 'Male/Female'}
                              </span>
                              <span className="kv">
                                <b>Exam Type:</b> {examTypeName}
                                {isCceExamType ? ` (${cceStageName})` : ''}
                              </span>
                              <span className="kv">
                                <b>Fee:</b>{' '}
                                {job.pivot?.fee
                                  ? `Rs. ${Number(job.pivot.fee).toLocaleString()}/-`
                                  : 'Rs. 505/-'}
                              </span>
                            </td>

                            <td className="qual-col">
                              {getQualificationText(job)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {!isOpenQuota && (
                        <div className="adv-districts">
                          <span className="d-lbl">Districts/Units</span>
                          {districtsNote}
                        </div>
                      )}

                      {job.remarks && (
                        <div className="adv-post-note">
                          <span>Note</span>
                          {job.remarks}
                        </div>
                      )}
                    </article>
                  );
                })}
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

          <div className="adv-footer">
            <div className="adv-signoff">
              <div className="sig">
                {secretarySignature?.image && (
                  <img
                    src={secretarySignature.image}
                    alt="Secretary digital signature"
                    className="signature-image"
                  />
                )}
                <div className={`line ${secretarySignature?.image ? '' : 'no-signature'}`}></div>

                <div className="role">
                  {advertisement.secretary_name || secretarySignature?.name || 'Secretary'}
                </div>

                <div className="org2">Secretary</div>

                <div className="date">
                  Dated:{' '}
                  {advertisement.publish_date
                    ? formatDate(advertisement.publish_date)
                    : formatDate(advertisement.adv_date)}
                </div>
              </div>
            </div>

            <div className="adv-disclaimer">
              <b>Note:</b> This is an English-language, reformatted version prepared from the original bilingual
              (Urdu/English) advertisement for ease of reading. The Terms &amp; Conditions have been translated from Urdu.
              In case of any difference, the <b>original advertisement</b> shall prevail. Please verify the closing date,
              fee, bank account details and other particulars before applying.
            </div>
          </div>
            </div>
            </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdvertisementDetail;
