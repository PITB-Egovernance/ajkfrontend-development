import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import DeptRequisitionApi from 'api/deptRequisitionApi';
import { extractFilePath, getPersistedDraftFilePath } from 'utils';

const DeptRequisitionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    fetchRequisition();
    fetchDistricts();
    fetchGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        setDistrictOptions(
          result.data.data.map((d) => ({
            id: d.hash_id,
            name: d.name,
          }))
        );
      }
    } catch (error) {}
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
            .map((g) => ({ id: g.hash_id || g.id, name: g.name }))
        );
      }
    } catch (error) {}
  };

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

  const getQuotaDisplay = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = Number(String(value).replace('%', '').trim());
    if (Number.isNaN(num)) return String(value);
    return `${num}%`;
  };

  const formatDomicile = (raw) => {
    if (raw === null || raw === undefined || raw === '') return 'N/A';
    if (Array.isArray(raw)) {
      const names = raw.map((d) => getDistrictName(d)).filter(Boolean);
      return names.length ? names.join(', ') : 'N/A';
    }
    const str = String(raw).trim();
    if (!str) return 'N/A';
    if (str.includes(',')) {
      return str.split(',').map((s) => getDistrictName(s.trim())).filter(Boolean).join(', ');
    }
    return getDistrictName(str);
  };

  const formatMeritType = (value) => {
    if (!value) return 'N/A';
    return String(value)
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isOpenMerit = requisition
    ? ((requisition.eligibility?.merit_type ?? requisition.merit_type) === 'open_merit')
    : false;

  const fetchRequisition = async () => {
    setLoading(true);
    try {
      const result = await DeptRequisitionApi.getById(id);
      const responseData = result.data || result;
      const data = responseData.requisition || responseData;

      if (result.success || result.status === 200 || data) {
        const step1 = responseData.step1 || data.step1 || data.step1_basic_info || {};
        const step2 = responseData.step2 || data.step2 || data.step2_qualifications || {};
        const step3 = responseData.step3 || data.step3 || data.step3_eligibility || {};
        const step3Districts = responseData.step3_district_quota
          || data.step3_district_quota
          || data.step3?.multiple_posts
          || [];

        const normalized = {
          hash_id: data.hash_id ?? data.id ?? id,
          designation:     data.designation     ?? step1.designation,
          scale:           data.scale           ?? step1.scale,
          num_posts:       data.num_posts       ?? step1.num_posts,
          vacancy_date:    data.vacancy_date    ?? step1.vacancy_date,
          department: (() => {
            if (data.department && typeof data.department === 'object') {
              return { name: data.department.name || data.department.department_name || '' };
            }
            if (typeof data.department === 'string' && data.department) {
              return { name: data.department };
            }
            if (step1.department && typeof step1.department === 'object') {
              return { name: step1.department.name || step1.department.department_name || '' };
            }
            if (typeof step1.department === 'string' && step1.department) {
              return { name: step1.department };
            }
            return { name: '' };
          })(),
          quota_percentage: data.quota_percentage ?? data.quotaPercentage ?? step1.quota_percentage,
          quota_promotion:  data.quota_promotion  ?? step1.quota_promotion,
          service_rules:   extractFilePath(data.service_rules ?? step1.service_rules) || getPersistedDraftFilePath(id, 'service_rules'),
          service_rules_text: data.service_rules_text ?? step1.service_rules_text ?? null,
          syllabus:        extractFilePath(data.syllabus ?? step1.syllabus) || getPersistedDraftFilePath(id, 'syllabus'),
          qualification: (() => {
            const direct = data.qualification;
            if (direct && typeof direct === 'object') {
              return {
                academic_qualification:   direct.academic_qualification   ?? step2.academic_qualification,
                equivalent_qualification:  direct.equivalent_qualification ?? step2.equivalent_qualification,
                authority_certificate:     direct.authority_certificate    ?? step2.authority_certificate,
                degree_equivalence:        direct.degree_equivalence       ?? step2.degree_equivalence,
                any_other_qualification:   direct.any_other_qualification  ?? step2.any_other_qualification,
                training_institute:        direct.training_institute       ?? step2.training_institute,
                experience_type:           direct.experience_type          ?? step2.experience_type,
                experience_length:         direct.experience_length        ?? step2.experience_length,
                min_qualification:         direct.min_qualification        ?? step2.min_qualification,
              };
            }
            return {
              academic_qualification:   data.academic_qualification   ?? step2.academic_qualification,
              equivalent_qualification:  data.equivalent_qualification ?? step2.equivalent_qualification,
              authority_certificate:     data.authority_certificate    ?? step2.authority_certificate,
              degree_equivalence:        data.degree_equivalence       ?? step2.degree_equivalence,
              any_other_qualification:   data.any_other_qualification  ?? step2.any_other_qualification,
              training_institute:        data.training_institute       ?? step2.training_institute,
              experience_type:           data.experience_type          ?? step2.experience_type,
              experience_length:         data.experience_length        ?? step2.experience_length,
              min_qualification:         data.min_qualification        ?? step2.min_qualification,
            };
          })(),
          eligibility: (() => {
            const direct = data.eligibility;
            if (direct && typeof direct === 'object') {
              return {
                min_age:           direct.min_age           ?? step3.min_age,
                max_age:           direct.max_age           ?? step3.max_age,
                age_relaxation:    direct.age_relaxation    ?? step3.age_relaxation,
                relaxation_reason: direct.relaxation_reason ?? step3.relaxation_reason,
                relaxation_years:  direct.relaxation_years  ?? step3.relaxation_years,
                nationality:       direct.nationality       ?? step3.nationality,
                domicile: (() => {
                  const d = direct.domicile;
                  if (Array.isArray(d)) return d;
                  if (d && typeof d === 'object') return d.id || d.hash_id || d.name || d.district_name || d;
                  if (typeof d === 'string' && d) return d;
                  return step3.domicile ? (Array.isArray(step3.domicile) ? step3.domicile : String(step3.domicile).split(',').map((s) => s.trim()).filter(Boolean)) : [];
                })(),
                other_conditions: direct.other_conditions ?? step3.other_conditions,
                gender_basis:      direct.gender_basis      ?? step3.gender_basis,
                merit_type:        direct.merit_type        ?? step3.merit_type,
              };
            }
            return {
              min_age:           data.min_age           ?? step3.min_age,
              max_age:           data.max_age           ?? step3.max_age,
              age_relaxation:    data.age_relaxation    ?? step3.age_relaxation,
              relaxation_reason: data.relaxation_reason ?? step3.relaxation_reason,
              relaxation_years:  data.relaxation_years  ?? step3.relaxation_years,
              nationality:       data.nationality       ?? step3.nationality,
              domicile: (() => {
                const d = data.domicile;
                if (Array.isArray(d)) return d;
                if (d && typeof d === 'object') return d.id || d.hash_id || d.name || d.district_name || d;
                if (typeof d === 'string' && d) return d;
                return step3.domicile ? (Array.isArray(step3.domicile) ? step3.domicile : String(step3.domicile).split(',').map((s) => s.trim()).filter(Boolean)) : [];
              })(),
              other_conditions: data.other_conditions ?? step3.other_conditions,
              gender_basis:      data.gender_basis      ?? step3.gender_basis,
              merit_type:        data.merit_type         ?? step3.merit_type,
            };
          })(),
          multiple_posts: Array.isArray(step3Districts) && step3Districts.length > 0
            ? (step3Districts[0] && typeof step3Districts[0] === 'object'
                ? step3Districts
                : step3Districts[0].districts.map((districtId, i) => ({
                    district: districtId,
                    quota:    step3Districts[0].quotas?.[i] || 'N/A',
                    post:     step3Districts[0].posts?.[i]  || 'N/A',
                  })))
            : (data.multiple_posts || []),
        };

        setRequisition(normalized);
      } else {
        throw new Error(result.message || 'Invalid response');
      }
    } catch (err) {
      toast.error(err.message || 'Error loading requisition details');
      navigate('/department/requisitions');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDate = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date();
    return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
  };

  const getDistrictName = (hashId) => {
    if (!hashId) return 'N/A';
    if (districtOptions.length > 0) {
      const district = districtOptions.find((d) => d.id === hashId);
      if (district) return district.name;
    }
    return String(hashId);
  };

  const exportToPDF = () => {
    if (!requisition) {
      toast.error('No requisition data to export');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 14;
      const marginRight = 14;
      const contentWidth = pageWidth - marginLeft - marginRight;
      let yPosition = 20;

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const header1 = 'AZAD JAMMU AND KASHMIR PUBLIC SERVICE COMMISSION, MUZAFFARABAD';
      doc.text(header1, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 7;
      doc.setFontSize(11);
      const header2 = 'Subject: Requisition for Direct Recruitment in Government/Semi Government/Autonomous Bodies';
      const splitHeader = doc.splitTextToSize(header2, contentWidth);
      doc.text(splitHeader, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += splitHeader.length * 5 + 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Requisition No. ______________________ Dated: ${getCurrentDate()}`, marginLeft, yPosition);
      
      yPosition += 8;

      doc.setFontSize(8);
      const instructions = [
        '1. This form should be very carefully filled as it is strictly in accordance with the information supplied there that the commission will advertise the post(s).',
        '2. Entries should be neatly made and any additions and alterations therein should invariably be attested by a competent authority.',
        '3. The form should be signed by the concerned Administrative Secretary to the Government.'
      ];
      instructions.forEach(inst => {
        const split = doc.splitTextToSize(inst, contentWidth);
        doc.text(split, marginLeft, yPosition);
        yPosition += split.length * 4;
      });

      yPosition += 3;

      const baseUrl = Config.apiUrl.replace('/api/v1', '').replace('/v1', '');
      const serviceRulesUrl = requisition.service_rules ? `${baseUrl}/${requisition.service_rules}` : null;
      const syllabusUrl = requisition.syllabus ? `${baseUrl}/${requisition.syllabus}` : null;

      const tableData = [
        ['1', '(i) Designation or nomenclature of the Post(s)\n(ii) Scale of the Post\n(iii) Department & Class of Service\n(iv) Percentage of quota fixed\n(v) Number of posts to be filled\n(vi) Date(s) of availability of vacancy(s)', `(i) ${requisition.designation || 'N/A'}\n(ii) ${getScaleName(requisition.scale)}\n(iii) ${(typeof requisition.department === 'object' ? requisition.department?.name : requisition.department) || 'N/A'}\n(iv) Direct: ${getQuotaDisplay(requisition.quota_percentage)} | Promotion: ${getQuotaDisplay(requisition.quota_promotion)}\n(v) ${requisition.num_posts || 'N/A'}\n(vi) Details in Annex "A"`],
        ['2', 'Service Rules for the Post(s) to be filled', (serviceRulesUrl ? serviceRulesUrl : 'No service rule file uploaded yet') + (requisition.service_rules_text ? `\n\n${requisition.service_rules_text}` : '')],
        ['3', 'Approved syllabus for the Post(s) to be filled', syllabusUrl ? syllabusUrl : 'No syllabus file uploaded yet'],
        ['4', 'Qualification Required:\n(i) Required Qualification\n(ii) Equivalent qualification authority\n(iii) Name degree of equivalence\n(iv) Any other Qualification\n(v) Training with institute name', `(i) ${requisition.qualification?.academic_qualification || 'N/A'}\n(ii) ${requisition.qualification?.equivalent_qualification || 'N/A'}\n(iii) ${requisition.qualification?.degree_equivalence || 'N/A'}\n(iv) ${requisition.qualification?.any_other_qualification || 'N/A'}\n(v) ${requisition.qualification?.training_institute || 'N/A'}`],
        ['5', 'Experience:\n(i) Type of experience required\n(ii) Length of experience\n(iii) Minimum required qualification', `(i) ${requisition.qualification?.experience_type || 'N/A'}\n(ii) ${requisition.qualification?.experience_length || 'N/A'}\n(iii) ${requisition.qualification?.min_qualification || 'N/A'}`],
        ['6', 'Age Limit:\n(i) Minimum\n(ii) Maximum\n(iii) Relaxation, if any', `(i) ${requisition.eligibility?.min_age || 'N/A'}\n(ii) ${requisition.eligibility?.max_age || 'N/A'}\n(iii) ${requisition.eligibility?.age_relaxation || 'N/A'}`],
        ['7', 'Nationality', requisition.eligibility?.nationality || 'N/A'],
        ['8', 'Domicile (Name Districts/Units)', formatDomicile(requisition?.eligibility?.domicile)],
        ['10', 'Any other condition of qualification', requisition.eligibility?.other_conditions || 'N/A'],
        ['11', 'Gender Specific/Quota basis/Open Merit', isOpenMerit ? 'Open Merit' : (requisition.eligibility?.gender_basis || 'N/A')]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245] },
          1: { cellWidth: 75, valign: 'top' },
          2: { cellWidth: 97, valign: 'top' }
        },
        margin: { left: marginLeft, right: marginRight },
        didDrawCell: (data) => {
          if (data.column.index !== 2) return;
          const rowIndex = data.row.index;
          const url = rowIndex === 1 ? serviceRulesUrl : rowIndex === 2 ? syllabusUrl : null;
          if (url) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
          }
        },
      });

      yPosition = doc.lastAutoTable.finalY + 5;

      const hasMultiplePosts = requisition.multiple_posts && requisition.multiple_posts.length > 0;
      if (isOpenMerit || hasMultiplePosts) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('9. Detail of District wise quota for the posts:', marginLeft, yPosition);
        yPosition += 4;

        const districtData = isOpenMerit
          ? [[formatMeritType(requisition.eligibility?.merit_type ?? requisition.merit_type), requisition.multiple_posts && requisition.multiple_posts.length > 0 ? requisition.multiple_posts.map(p => getDistrictName(p.district)).join(', ') : districtOptions.map(d => d.name).join(', ') || 'All AJK Districts', String(requisition.num_posts || 'N/A')]]
          : requisition.multiple_posts.map(post => [formatMeritType(requisition.eligibility?.merit_type ?? requisition.merit_type), getDistrictName(post.district), post.post || 'N/A']);

        autoTable(doc, {
          startY: yPosition,
          head: [['Quota', 'District/Unit', 'Posts']],
          body: districtData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
          headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
          margin: { left: marginLeft, right: marginRight }
        });

        yPosition = doc.lastAutoTable.finalY + 5;
      }

      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('It is certified that:', marginLeft, yPosition);
      yPosition += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const certifications = [
        '(i) The data given as mentioned above along with Annex "A" is correct in accordance with the official record and no vacant post is left un-mentioned till today in this requisition form.',
        '(ii) That no vacant post under above mentioned category is left behind, which is still not filled on permanent basis through PSC and that all vacant posts fall vacant till today are incorporated in this requisition.',
        '(iii) That the department is strictly following the Rule (3) of AJ&K Public Service Commission (Procedure) Rules, 1994 & decision of Supreme Court of Azad Jammu and Kashmir.'
      ];
      
      certifications.forEach(cert => {
        const split = doc.splitTextToSize(cert, contentWidth);
        doc.text(split, marginLeft, yPosition);
        yPosition += split.length * 4 + 2;
      });

      yPosition += 10;
      doc.setFontSize(9);
      doc.text('Signature of Administrative Secretary', pageWidth - 70, yPosition);
      yPosition += 4;
      doc.text('of the Department', pageWidth - 70, yPosition);
      yPosition += 4;
      doc.text(`Date: ${getCurrentDate()}`, pageWidth - 70, yPosition);
      yPosition += 4;
      doc.text('Stamp: ______________________', pageWidth - 70, yPosition);

      doc.save(`Requisition_Detail_${requisition.hash_id}_${Date.now()}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      toast.error('Failed to export PDF: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <InlineLoader text="Loading requisition details..." variant="ring" size="lg" />
      </div>
    );
  }

  if (!requisition) {
    return <div className="text-center py-8 text-slate-600">No requisition found.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate('/department/requisitions')} className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={18} /> Back to List
        </button>
        <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg transition-colors hover:shadow-lg">
          <Download size={18} /> Export PDF
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-center text-2xl font-bold text-black mb-1 uppercase">AZAD JAMMU AND KASHMIR PUBLIC SERVICE COMMISSION, MUZAFFARABAD</h2>
        <h3 className="text-center text-base text-black mb-5 font-medium">Subject: Requisition for Direct Recruitment in Government/Semi Government/Autonomous Bodies under Public Service Commission Act 1986</h3>

        <p className="text-sm mb-2"><b>Requisition No.</b> ______________________ &nbsp;&nbsp;&nbsp; <b>Dated: </b> {getCurrentDate()}</p>

        <div className="text-xs leading-relaxed mb-4">
          <p>1. This form should be very carefully filled as it is strictly in accordance with the information supplied there that the commission will advertise the post(s).</p>
          <p>2. Entries should be neatly made and any additions and alterations therein should invariably be attested by a competent authority.</p>
          <p>3. The form should be signed by the concerned Administrative Secretary to the Government.</p>
        </div>

        <table className="w-full border-collapse border border-black mb-4">
          <tbody>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">1</td>
              <td className="border border-black p-1 align-top text-sm w-1/2">
                (i) Designation or nomenclature of the Post(s)<br />
                (ii) Scale of the Post.<br />
                (iii) Department & Class of Service<br />
                (iv) Percentage of quota fixed<br />
                (v) Number of posts to be filled<br />
                (vi) Date(s) of availability of vacancy(s)
              </td>
              <td className="border border-black p-1 align-top text-sm">
                (i) {requisition.designation || 'N/A'}<br />
                (ii) {getScaleName(requisition.scale)}<br />
                (iii) {(typeof requisition.department === 'object' ? requisition.department?.name : requisition.department) || 'N/A'}<br />
                (iv) {getQuotaDisplay(requisition.quota_percentage)} (Promotion) | {getQuotaDisplay(requisition.quota_promotion)} (Direct)<br />
                (v) {requisition.num_posts || 'N/A'}<br />
                (vi) Details in Annex "A"
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">2</td>
              <td className="border border-black p-1 align-top text-sm">Service Rules for the Post(s) to be filled</td>
              <td className="border border-black p-1 align-top text-sm">
                {requisition.service_rules ? (
                  <a href={`${Config.apiUrl.replace('/api/v1', '').replace('/v1', '')}/${requisition.service_rules}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">View Service Rules</a>
                ) : 'No service rule file uploaded yet'}
                {requisition.service_rules_text && <div className="mt-2 whitespace-pre-wrap">{requisition.service_rules_text}</div>}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">3</td>
              <td className="border border-black p-1 align-top text-sm">Approved syllabus for the Post(s) to be filled</td>
              <td className="border border-black p-1 align-top text-sm">
                {requisition.syllabus ? (
                  <a href={`${Config.apiUrl.replace('/api/v1', '').replace('/v1', '')}/${requisition.syllabus}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">View Syllabus</a>
                ) : 'No syllabus file uploaded yet'}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">4</td>
              <td className="border border-black p-1 align-top text-sm">
                <b>Qualification Required:</b><br />
                (i) Required Qualification<br />
                (ii) Equivalent qualification authority<br />
                (iii) Name degree of equivalence<br />
                (iv) Any other Qualification<br />
                (v) Training with institute name
              </td>
              <td className="border border-black p-1 align-top text-sm">
                (i) {requisition.qualification?.academic_qualification || 'N/A'}<br />
                (ii) {requisition.qualification?.equivalent_qualification || 'N/A'}<br />
                (iii) {requisition.qualification?.degree_equivalence || 'N/A'}<br />
                (iv) {requisition.qualification?.any_other_qualification || 'N/A'}<br />
                (v) {requisition.qualification?.training_institute || 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">5</td>
              <td className="border border-black p-1 align-top text-sm">
                <b>Experience:</b><br />
                (i) Type of experience required<br />
                (ii) Length of experience<br />
                (iii) Minimum required qualification
              </td>
              <td className="border border-black p-1 align-top text-sm">
                (i) {requisition.qualification?.experience_type || 'N/A'}<br />
                (ii) {requisition.qualification?.experience_length || 'N/A'}<br />
                (iii) {requisition.qualification?.min_qualification || 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">6</td>
              <td className="border border-black p-1 align-top text-sm">
                <b>Age Limit</b><br />
                (i) Minimum<br />
                (ii) Maximum<br />
                (iii) Relaxation, if any
              </td>
              <td className="border border-black p-1 align-top text-sm">
                (i) {requisition.eligibility?.min_age || 'N/A'}<br />
                (ii) {requisition.eligibility?.max_age || 'N/A'}<br />
                (iii) {requisition.eligibility?.age_relaxation || 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">7</td>
              <td className="border border-black p-1 align-top text-sm">Nationality</td>
              <td className="border border-black p-1 align-top text-sm">{requisition.eligibility?.nationality || 'N/A'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">8</td>
              <td className="border border-black p-1 align-top text-sm">Domicile (Name Districts/Units)</td>
              <td className="border border-black p-1 align-top text-sm">{formatDomicile(requisition?.eligibility?.domicile)}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">9</td>
              <td className="border border-black p-1 align-top text-sm">Detail of District wise quota for the posts requisitioned here.</td>
              <td className="border border-black p-1 align-top text-sm">
                Total Posts: {requisition.num_posts || 'N/A'}
                {isOpenMerit ? (
                  <table className="w-full border-collapse border border-black mt-2">
                    <thead>
                      <tr>
                        <th className="border border-black p-1 text-center bg-gray-100 text-xs">Quota</th>
                        <th className="border border-black p-1 text-center bg-gray-100 text-xs">District/Unit</th>
                        <th className="border border-black p-1 text-center bg-gray-100 text-xs">Posts</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-1 text-center text-xs">{formatMeritType(requisition.eligibility?.merit_type ?? requisition.merit_type)}</td>
                        <td className="border border-black p-1 text-center text-xs">
                          {requisition.multiple_posts && requisition.multiple_posts.length > 0
                            ? requisition.multiple_posts.map(p => getDistrictName(p.district)).join(', ')
                            : districtOptions.map(d => d.name).join(', ') || 'All AJK Districts'}
                        </td>
                        <td className="border border-black p-1 text-center text-xs">{requisition.num_posts || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  requisition.multiple_posts && requisition.multiple_posts.length > 0 && (
                    <table className="w-full border-collapse border border-black mt-2">
                      <thead>
                        <tr>
                          <th className="border border-black p-1 text-center bg-gray-100 text-xs">Quota</th>
                          <th className="border border-black p-1 text-center bg-gray-100 text-xs">District/Unit</th>
                          <th className="border border-black p-1 text-center bg-gray-100 text-xs">Posts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requisition.multiple_posts.map((post, index) => (
                          <tr key={index}>
                            <td className="border border-black p-1 text-center text-xs">{formatMeritType(requisition.eligibility?.merit_type ?? requisition.merit_type)}</td>
                            <td className="border border-black p-1 text-center text-xs">{getDistrictName(post.district)}</td>
                            <td className="border border-black p-1 text-center text-xs">{post.post ?? 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">10</td>
              <td className="border border-black p-1 align-top text-sm">Any other condition of qualification</td>
              <td className="border border-black p-1 align-top text-sm">{requisition.eligibility?.other_conditions || 'N/A'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 align-top w-8 text-center font-bold bg-gray-100">11</td>
              <td className="border border-black p-1 align-top text-sm">Gender Specific/Quota basis/Open Merit</td>
              <td className="border border-black p-1 align-top text-sm">{isOpenMerit ? 'Open Merit' : (requisition.eligibility?.gender_basis || 'N/A')}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 text-sm leading-relaxed">
          <p className="mb-2"><b>It is certified that:-</b></p>
          <p className="mb-2">(i) The data given as mentioned above along with Annex "A" is correct in accordance with the official record and no vacant post is left un-mentioned till today in this requisition form.</p>
          <p className="mb-2">(ii) That no vacant post under above mentioned category is left behind, which is still not filled on permanent basis through PSC and that all vacant posts fall vacant till today are incorporated in this requisition.</p>
          <p className="mb-2">(iii) That the department is strictly following the Rule (3) of AJ&K Public Service Commission (Procedure) Rules, 1994 & decision of Supreme Court of Azad Jammu and Kashmir.</p>
        </div>

        <div className="mt-10 text-right text-sm leading-relaxed">
          Signature of Administrative Secretary<br />
          of the Department<br />
          Date: ______________________<br />
          Stamp: ______________________
        </div>
      </div>

      <div className="text-center mt-6">
        <button onClick={() => navigate('/department/requisitions')} className="flex items-center gap-2 px-6 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors mx-auto">
          <ArrowLeft size={18} /> Back to Requisitions
        </button>
      </div>
    </motion.div>
  );
};

export default DeptRequisitionDetail;