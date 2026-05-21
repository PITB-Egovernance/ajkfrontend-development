import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Award,
  Filter,
  Trophy,
  Users,
  UserCheck,
  RefreshCw,
  Clock,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useParams, useNavigate } from 'react-router-dom';
import Button from 'components/ui/Button';
import { Card } from 'components/ui/Card';
import Input from 'components/ui/Input';
import { toast } from 'react-hot-toast';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';

/**
 * AwardListPage (v2.3) - Interview Secretary Merit List Builder
 * Implements strict scoring: Part-A (25) + Part-B (30) = 55.00
 */
const AwardListPage = () => {
  const { jobId: urlJobId } = useParams();
  const navigate = useNavigate();

  // Selection State
  const [jobs, setJobs] = useState([]);
  const [districts] = useState(['all', 'Muzaffarabad', 'Mirpur', 'Poonch', 'Bagh', 'Bhimber', 'Kotli', 'Sudhnoti', 'Hattian', 'Haveli', 'Neelum']);

  const [selectedJob, setSelectedJob] = useState(urlJobId || '');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastDocDate, setLastDocDate] = useState(new Date().toISOString().split('T')[0]);

  // Data State
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingRows, setSavingRows] = useState({});
  const saveTimers = React.useRef({});
  const latestAwardsRef = React.useRef(awards);

  // Keep ref in sync
  useEffect(() => {
    latestAwardsRef.current = awards;
  }, [awards]);

  const fetchJobs = React.useCallback(async () => {
    try {
      const res = await AdvertisementApi.getAll(1);
      const ads = res.data?.data || res.data || [];
      // Flat map advertisements to extract all individual job details
      const allJobs = ads.flatMap(adv => (adv.job_details || adv.jobDetails || []).map(job => ({
        ...job,
        display_name: `${job.designation} (${adv.adv_number})`
      })));
      setJobs(allJobs);
    } catch (err) {
      toast.error('Failed to load job posts');
    }
  }, []);

  const handleLoadList = React.useCallback(async (targetId = selectedJob) => {
    if (!targetId) return;

    setLoading(true);
    try {
      const res = await ResultsApi.getAwards(targetId, selectedDistrict);
      if (res.data && res.data.length > 0) {
        setAwards(res.data);
        setIsInitialized(true);
        // Sync header dates if they exist in the first record
        if (res.data[0].interview_date) setInterviewDate(res.data[0].interview_date.split('T')[0]);
        if (res.data[0].last_doc_date) setLastDocDate(res.data[0].last_doc_date.split('T')[0]);
        toast.success(`Loaded ${res.data.length} candidates`);
      } else {
        setIsInitialized(false);
        setAwards([]);
        if (targetId === selectedJob) {
          toast.error('No award list found for this criteria. Please initialize.');
        }
      }
    } catch (err) {
      toast.error('Failed to load award list');
    } finally {
      setLoading(false);
    }
  }, [selectedJob, selectedDistrict]);

  useEffect(() => {
    fetchJobs();
    if (urlJobId) {
      handleLoadList(urlJobId);
    }
  }, [urlJobId, fetchJobs, handleLoadList]);

  const handleInitialize = async () => {
    if (!selectedJob || !selectedDistrict || !interviewDate || !lastDocDate) {
      toast.error('Please fill all fields to initialize the list');
      return;
    }

    setLoading(true);
    try {
      const data = await ResultsApi.initializeAwards({
        job_post_id: selectedJob,
        district: selectedDistrict,
        interview_date: interviewDate,
        last_doc_date: lastDocDate
      });

      if (data.success) {
        toast.success(`Created list for ${data.data.created} eligible candidates`);
        handleLoadList();
      } else {
        toast.error(data.message || 'Initialization failed');
      }
    } catch (err) {
      toast.error('Failed to initialize award list');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (id, field, value) => {
    let val = value;
    if (field !== 'remarks' && field !== 'status' && field !== 'pathway') {
      val = parseFloat(value);
      if (isNaN(val)) val = '';
    }

    setAwards(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };

        if (field === 'pathway') {
          if (value === 'traditional') {
            updated.bs_4yr_obt = '';
            updated.bs_4yr_total = '';
          } else {
            updated.grad_obt = '';
            updated.grad_total = '';
            updated.masters_obt = '';
            updated.masters_total = '';
          }
        }

        // Live calculation logic in React
        const matricObt = parseFloat(updated.matric_obt) || 0;
        const matricTotal = parseFloat(updated.matric_total) || 0;
        const marks_matric = matricTotal > 0 ? Math.min((matricObt / matricTotal) * 2.0, 2.0) : 0.0;

        const interObt = parseFloat(updated.inter_obt) || 0;
        const interTotal = parseFloat(updated.inter_total) || 0;
        const marks_intermediate = interTotal > 0 ? Math.min((interObt / interTotal) * 3.0, 3.0) : 0.0;

        const bsObt = parseFloat(updated.bs_4yr_obt) || 0;
        const bsTotal = parseFloat(updated.bs_4yr_total) || 0;
        let pathWeight = 0.0;

        if (bsTotal > 0 || updated.pathway === 'bs') {
          pathWeight = bsTotal > 0 ? Math.min((bsObt / bsTotal) * 15.0, 15.0) : 0.0;
          updated.marks_graduation = 0.0;
          updated.marks_masters = 0.0;
        } else {
          const gradObt = parseFloat(updated.grad_obt) || 0;
          const gradTotal = parseFloat(updated.grad_total) || 0;
          updated.marks_graduation = gradTotal > 0 ? Math.min((gradObt / gradTotal) * 4.0, 4.0) : 0.0;

          const mastersObt = parseFloat(updated.masters_obt) || 0;
          const mastersTotal = parseFloat(updated.masters_total) || 0;
          updated.marks_masters = mastersTotal > 0 ? Math.min((mastersObt / mastersTotal) * 11.0, 11.0) : 0.0;

          pathWeight = updated.marks_graduation + updated.marks_masters;
        }

        updated.marks_bu_position = Math.min(parseFloat(updated.board_position_marks) || 0, 1.0);
        updated.marks_additional = Math.min(parseFloat(updated.mphil_phd_marks) || 0, 2.0);

        updated.part_a_total = parseFloat(Math.min(
          marks_matric + marks_intermediate + pathWeight + updated.marks_bu_position + updated.marks_additional,
          25.00
        ).toFixed(2));

        updated.mcq_test_marks = parseFloat(Math.min(parseFloat(updated.mcq_test_marks) || 0, 45.00).toFixed(2));
        updated.interview_marks = parseFloat(Math.min(parseFloat(updated.interview_marks) || 0, 30.00).toFixed(2));
        updated.part_b_total = updated.interview_marks;

        updated.grand_total = parseFloat(Math.min(updated.part_a_total + updated.mcq_test_marks + updated.part_b_total, 100.00).toFixed(2));

        return updated;
      }
      return item;
    }));

    // Auto-Save Logic (Debounced)
    if (saveTimers.current[id]) {
      clearTimeout(saveTimers.current[id]);
    }

    saveTimers.current[id] = setTimeout(async () => {
      const award = latestAwardsRef.current.find(a => a.id === id);
      if (!award) return;

      const payload = {
        matric_obt: award.matric_obt === '' ? null : parseFloat(award.matric_obt) || 0,
        matric_total: award.matric_total === '' ? null : parseFloat(award.matric_total) || 0,
        inter_obt: award.inter_obt === '' ? null : parseFloat(award.inter_obt) || 0,
        inter_total: award.inter_total === '' ? null : parseFloat(award.inter_total) || 0,
        grad_obt: award.grad_obt === '' ? null : parseFloat(award.grad_obt) || 0,
        grad_total: award.grad_total === '' ? null : parseFloat(award.grad_total) || 0,
        masters_obt: award.masters_obt === '' ? null : parseFloat(award.masters_obt) || 0,
        masters_total: award.masters_total === '' ? null : parseFloat(award.masters_total) || 0,
        bs_4yr_obt: award.bs_4yr_obt === '' ? null : parseFloat(award.bs_4yr_obt) || 0,
        bs_4yr_total: award.bs_4yr_total === '' ? null : parseFloat(award.bs_4yr_total) || 0,
        board_position_marks: parseFloat(award.board_position_marks) || 0,
        mphil_phd_marks: parseFloat(award.mphil_phd_marks) || 0,
        mcq_test_marks: parseFloat(award.mcq_test_marks) || 0,
        interview_marks: parseFloat(award.interview_marks) || 0,
        status: award.status,
        remarks: award.remarks,
      };

      setSavingRows(prev => ({ ...prev, [id]: true }));
      try {
        const res = await ResultsApi.patchAward(id, payload, award.version);
        setAwards(prev => prev.map(a => a.id === id ? { ...a, version: res.data.version } : a));
      } catch (err) {
        if (err.status === 409) {
          toast.error(`Conflict for ${award.application?.candidate_name}. Please refresh.`);
        } else {
          console.error('Auto-save error:', err);
        }
      } finally {
        setSavingRows(prev => ({ ...prev, [id]: false }));
      }
    }, 1500);
  };

  const handleDownloadTemplate = async () => {
    if (!selectedJob) return;
    try {
      toast.loading('Generating Pre-filled Template...', { id: 'temp-download' });
      const blob = await ResultsApi.downloadAwardTemplate(selectedJob, selectedDistrict);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Interview_Award_Template_${selectedJob}_${selectedDistrict}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded successfully!', { id: 'temp-download' });
    } catch (err) {
      toast.error('Failed to download template', { id: 'temp-download' });
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_post_id', selectedJob);
    formData.append('district', selectedDistrict);

    setLoading(true);
    try {
      toast.loading('Importing and recalculating...', { id: 'csv-import' });
      const res = await ResultsApi.importAwards(formData);
      if (res.success) {
        toast.success(res.message, { id: 'csv-import' });
        if (res.errors && res.errors.length > 0) {
          console.warn('Import skipped rows:', res.errors);
          toast.error(`${res.errors.length} rows failed to import. Check console/details.`, { duration: 6000 });
        }
        handleLoadList();
      } else {
        toast.error(res.message || 'Import failed', { id: 'csv-import' });
      }
    } catch (err) {
      toast.error('Failed to import CSV file', { id: 'csv-import' });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleAutoRank = () => {
    const sorted = [...awards].sort((a, b) => {
      if (b.grand_total !== a.grand_total) return b.grand_total - a.grand_total;
      if (b.part_a_total !== a.part_a_total) return b.part_a_total - a.part_a_total;
      return (a.id || 0) - (b.id || 0);
    });

    setAwards(sorted.map((item, index) => ({
      ...item,
      merit_rank: index + 1
    })));

    toast.success('Ranks auto-computed!');
  };

  const handleExportCSV = () => {
    if (!awards.length) return;

    const headers = [
      'Rank', 'Roll Number', 'Candidate Name',
      'Matric Obt', 'Matric Total', 'Intermediate Obt', 'Intermediate Total',
      'BA/BSc Obt', 'BA/BSc Total', 'MA/MSc Obt', 'MA/MSc Total',
      'BS 4-Year Obt', 'BS 4-Year Total', 'Board Position (0 or 1)', 'M.Phil or PhD',
      'Academic Total (A)', 'MCQs Test Marks (B)', 'Interview Marks (C)', 'Grand Total', 'Status'
    ];

    const csvContent = [
      headers.join(','),
      ...awards.map(row => [
        row.merit_rank || '-',
        row.application?.application_number || 'TBD',
        `"${row.application?.candidate_name}"`,
        row.matric_obt ?? '',
        row.matric_total ?? '',
        row.inter_obt ?? '',
        row.inter_total ?? '',
        row.grad_obt ?? '',
        row.grad_total ?? '',
        row.masters_obt ?? '',
        row.masters_total ?? '',
        row.bs_4yr_obt ?? '',
        row.bs_4yr_total ?? '',
        row.board_position_marks ?? 0,
        row.mphil_phd_marks ?? 0,
        row.part_a_total || 0,
        row.mcq_test_marks || 0,
        row.interview_marks || 0,
        row.grand_total || 0,
        row.status || 'Provisional'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Award_List_${selectedJob}_${selectedDistrict}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported');
  };

  const handleExportPDF = () => {
    if (!awards.length) return;

    const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape for wider table
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Azad Jammu & Kashmir Public Service Commission', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Interview Award List (Standard Layout)', pageWidth / 2, 22, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 26, pageWidth - 15, 26);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Post:', 15, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(currentJob?.designation || 'N/A', 30, 35);

    doc.setFont('helvetica', 'bold');
    doc.text('District:', 120, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedDistrict || 'All', 140, 35);

    doc.setFont('helvetica', 'bold');
    doc.text('Interview Date:', 15, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(interviewDate || '-', 45, 42);

    doc.setFont('helvetica', 'bold');
    doc.text('Printed On:', 120, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString(), 145, 42);

    const tableData = awards.map(row => [
      row.merit_rank || '-',
      row.application?.application_number || 'TBD',
      row.application?.candidate_name,
      row.part_a_total || '0.00',
      row.mcq_test_marks || '0.00',
      row.interview_marks || '0.00',
      row.grand_total || '0.00',
      (row.status || 'Provisional').toUpperCase()
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Rank', 'Roll No', 'Candidate Name', 'Academic (A) [25]', 'Written (B) [45]', 'Interview (C) [30]', 'Grand Total [100]', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' },
        5: { cellWidth: 30, halign: 'center' },
        6: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 30, halign: 'center' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 30;
    doc.line(15, finalY, 65, finalY);
    doc.text('Interview Secretary', 25, finalY + 5);

    doc.line(pageWidth - 65, finalY, pageWidth - 15, finalY);
    doc.text('Chairman / Member', pageWidth - 55, finalY + 5);

    doc.save(`Award_List_${selectedJob}.pdf`);
    toast.success('PDF Exported');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await ResultsApi.submitAwards({
        job_post_id: selectedJob,
        awards: awards.map(a => ({
          application_id: a.application_id,
          matric_obt: a.matric_obt ?? null,
          matric_total: a.matric_total ?? null,
          inter_obt: a.inter_obt ?? null,
          inter_total: a.inter_total ?? null,
          grad_obt: a.grad_obt ?? null,
          grad_total: a.grad_total ?? null,
          masters_obt: a.masters_obt ?? null,
          masters_total: a.masters_total ?? null,
          bs_4yr_obt: a.bs_4yr_obt ?? null,
          bs_4yr_total: a.bs_4yr_total ?? null,
          board_position_marks: a.board_position_marks ?? 0,
          mphil_phd_marks: a.mphil_phd_marks ?? 0,
          mcq_test_marks: a.mcq_test_marks ?? 0,
          interview_marks: a.interview_marks ?? 0,
          remarks: a.remarks ?? '',
          merit_rank: a.merit_rank,
          status: a.status ?? 'Provisional'
        }))
      });
      toast.success('Award list finalized and saved');
    } catch (err) {
      toast.error('Failed to save award list');
    } finally {
      setIsSaving(false);
    }
  };

  const currentJob = jobs.find(j => (j.hash_id || j.id).toString() === selectedJob.toString());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard/results')} className="p-3 hover:bg-slate-100 rounded-2xl transition-all group">
            <ArrowLeft className="text-slate-400 group-hover:text-slate-900" size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Award className="text-emerald-500" size={28} />
              Award List Builder
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Journey 2.3 • Interview Scoring Console</p>
          </div>
        </div>

        <div className="flex items-center gap-4">

          <Button
            onClick={handleSave}
            loading={isSaving}
            disabled={!isInitialized}
            className="rounded-2xl bg-slate-900 hover:bg-black h-12 px-8 font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-slate-200 border-none"
          >
            <Save size={16} className="mr-2" />
            Finalize & Save
          </Button>
        </div>
      </div>

      <div className="px-8 mt-8 space-y-8 max-w-[1700px] mx-auto w-full">
        {/* Top Panels: Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isInitialized && currentJob ? (
            <Card className="border-none shadow-xl rounded-[2rem] p-6 bg-indigo-600/70 text-white space-y-4 flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Users size={22} />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-widest text-[9px] text-indigo-200">Context Header</h4>
                  <p className="text-sm font-black leading-tight mt-0.5">{currentJob.designation}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-white/10">
                <div>
                  <label className="text-[7px] font-black uppercase text-indigo-200 block">Case No.</label>
                  <p className="text-xs font-bold">#{currentJob.id}</p>
                </div>
                <div>
                  <label className="text-[7px] font-black uppercase text-indigo-200 block">District</label>
                  <p className="text-xs font-bold uppercase">{selectedDistrict}</p>
                </div>
                <div>
                  <label className="text-[7px] font-black uppercase text-indigo-200 block">Interview Date</label>
                  <p className="text-xs font-bold">{interviewDate}</p>
                </div>
                <div>
                  <label className="text-[7px] font-black uppercase text-indigo-200 block">Last Doc Date</label>
                  <p className="text-xs font-bold">{lastDocDate}</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-none shadow-xl rounded-[2rem] p-6 bg-indigo-600/5 border-2 border-indigo-200/10 text-indigo-400 flex flex-col items-center justify-center text-center">
              <Users size={28} className="mb-2 opacity-55" />
              <h4 className="font-black uppercase tracking-widest text-[9px] tracking-wider">No Active Selection</h4>
              <p className="text-[9px] mt-1 text-slate-400">Load or create a new award list below to view the context.</p>
            </Card>
          )}

          <Card className="border-none shadow-2xl rounded-[2.5rem] p-6 space-y-4 bg-white overflow-hidden">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} className="text-indigo-500" />
              List Criteria
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Post</label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 transition-all font-bold text-slate-700 text-[10px]"
                >
                  <option value="">Select Job...</option>
                  {jobs.map(job => (
                    <option key={job.hash_id || job.id} value={job.hash_id || job.id}>
                      {job.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">District</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 transition-all font-bold text-slate-700 text-[10px]"
                >
                  {districts.map(d => (
                    <option key={d} value={d}>{d === 'all' ? 'All Districts' : d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Interview Date</label>
                <Input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 border-2 border-slate-100 text-[10px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Doc Date</label>
                <Input
                  type="date"
                  value={lastDocDate}
                  onChange={(e) => setLastDocDate(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 border-2 border-slate-100 text-[10px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                onClick={() => handleLoadList()}
                loading={loading}
                className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-100 border-none animate-all"
              >
                Load List
              </Button>

              <Button
                onClick={handleInitialize}
                variant="outline"
                className="h-9 rounded-xl border-2 border-indigo-100 text-indigo-600 font-black text-[9px] uppercase tracking-widest hover:bg-indigo-50"
              >
                Create New
              </Button>
            </div>
          </Card>

          <div className="p-5 bg-emerald-600 rounded-[2rem] text-white shadow-xl relative overflow-hidden self-start">
            <div>
              <h4 className="font-black uppercase tracking-widest text-[9px] text-emerald-200 mb-2.5">Quick Reference Limits</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/10 p-2 rounded-xl">
                  <span className="text-[7px] font-black text-emerald-200 block uppercase">Acad (A)</span>
                  <span className="text-xs font-black mt-0.5 block">25.0</span>
                </div>
                <div className="bg-white/10 p-2 rounded-xl">
                  <span className="text-[7px] font-black text-emerald-200 block uppercase">Written (B)</span>
                  <span className="text-xs font-black mt-0.5 block">45.0</span>
                </div>
                <div className="bg-white/10 p-2 rounded-xl">
                  <span className="text-[7px] font-black text-emerald-200 block uppercase">Viva (C)</span>
                  <span className="text-xs font-black mt-0.5 block">30.0</span>
                </div>
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/20 mt-2.5 flex justify-between items-center">
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Grand Total Limit</span>
              <span className="text-xs font-black underline decoration-2 underline-offset-4">100.0 Marks</span>
            </div>
          </div>
        </div>

        {/* Scoring Table - Full Width */}
        {!isInitialized ? (
          <div className="h-[650px] bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-12 shadow-sm">
            <div className="p-10 bg-slate-50 rounded-full mb-8">
              <Trophy size={100} strokeWidth={1} className="text-slate-200" />
            </div>
            <h2 className="text-3xl font-black text-slate-300 uppercase tracking-widest">Awaiting List Selection</h2>
            <p className="text-slate-400 font-medium max-w-sm mt-4 leading-relaxed">
              Initialize a new list or load an existing draft to begin candidate scoring and merit ranking.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Bar */}
            <div className="bg-white p-5 rounded-[2rem] shadow-xl flex items-center justify-between border border-slate-100">
              <div className="flex items-center gap-10 px-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidates</span>
                  <span className="text-2xl font-black text-slate-900">{awards.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">District</span>
                  <span className="text-xs font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-1.5 rounded-full mt-1">
                    {selectedDistrict}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="file"
                  id="award-csv-file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleImportCSV}
                />
                <Button
                  onClick={handleDownloadTemplate}
                  className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <FileText size={16} />
                  Download Template
                </Button>
                <Button
                  onClick={() => document.getElementById('award-csv-file').click()}
                  className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <TableIcon size={16} />
                  Import CSV
                </Button>
                <Button
                  onClick={handleExportCSV}
                  className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <TableIcon size={16} />
                  Export CSV
                </Button>
                <Button
                  onClick={handleExportPDF}
                  className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <FileText size={16} />
                  Export PDF
                </Button>
                <Button
                  onClick={handleAutoRank}
                  className="h-14 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 border-none shadow-xl shadow-emerald-100"
                >
                  <RefreshCw size={18} />
                  Run Auto-Rank
                </Button>
              </div>
            </div>

            {/* Advanced Scoring Table */}
            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                      <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                      <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-blue-50/40">Part-A: Academic Credentials (25)</th>
                      <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/40">Written Exam (45)</th>
                      <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-indigo-50/40">Interview Viva (30)</th>
                      <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-emerald-50/40">Grand (100)</th>
                      <th className="px-6 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {awards.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-6">
                          <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-base font-black ${index < 3 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-100 text-slate-400'
                            }`}>
                            {row.merit_rank || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col relative w-[180px]">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm leading-tight">{row.application?.candidate_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                              <Clock size={10} />
                              <span className="text-[9px] font-bold uppercase tracking-wider">Applied: {row.application?.application_number}</span>
                            </div>
                            {savingRows[row.id] && (
                              <div className="flex items-center gap-1 mt-0.5 animate-pulse">
                                <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                                <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">Autosaving...</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Part-A: Academics */}
                        <td className="px-4 py-6 bg-blue-50/5">
                          <div className="flex flex-col gap-2 w-[340px] mx-auto text-left">
                            {/* Matric and Inter Row */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase">Matric (Obt/Tot)</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={row.matric_obt ?? ''}
                                    placeholder="Obt"
                                    onChange={(e) => handleMarkChange(row.id, 'matric_obt', e.target.value)}
                                    className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                  />
                                  <span className="text-slate-300">/</span>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={row.matric_total ?? ''}
                                    placeholder="Total"
                                    onChange={(e) => handleMarkChange(row.id, 'matric_total', e.target.value)}
                                    className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase">Inter (Obt/Tot)</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={row.inter_obt ?? ''}
                                    placeholder="Obt"
                                    onChange={(e) => handleMarkChange(row.id, 'inter_obt', e.target.value)}
                                    className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                  />
                                  <span className="text-slate-300">/</span>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={row.inter_total ?? ''}
                                    placeholder="Total"
                                    onChange={(e) => handleMarkChange(row.id, 'inter_total', e.target.value)}
                                    className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Pathway Selection */}
                            <div className="flex items-center gap-2 my-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Path:</span>
                              <select
                                value={row.bs_4yr_total > 0 || row.pathway === 'bs' ? 'bs' : 'traditional'}
                                onChange={(e) => handleMarkChange(row.id, 'pathway', e.target.value)}
                                className="h-7 text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 focus:border-blue-400 focus:ring-0 cursor-pointer"
                              >
                                <option value="traditional">Traditional (BA/BSc + MA/MSc)</option>
                                <option value="bs">BS 4-Years</option>
                              </select>
                            </div>

                            {/* Degree Inputs Conditional */}
                            {!(row.bs_4yr_total > 0 || row.pathway === 'bs') ? (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[8px] font-black text-slate-400 uppercase">BA/BSc (Obt/Tot)</span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      value={row.grad_obt ?? ''}
                                      placeholder="Obt"
                                      onChange={(e) => handleMarkChange(row.id, 'grad_obt', e.target.value)}
                                      className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                    />
                                    <span className="text-slate-300">/</span>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      value={row.grad_total ?? ''}
                                      placeholder="Total"
                                      onChange={(e) => handleMarkChange(row.id, 'grad_total', e.target.value)}
                                      className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-slate-400 uppercase">MA/MSc (Obt/Tot)</span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      value={row.masters_obt ?? ''}
                                      placeholder="Obt"
                                      onChange={(e) => handleMarkChange(row.id, 'masters_obt', e.target.value)}
                                      className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                    />
                                    <span className="text-slate-300">/</span>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      value={row.masters_total ?? ''}
                                      placeholder="Total"
                                      onChange={(e) => handleMarkChange(row.id, 'masters_total', e.target.value)}
                                      className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase">BS 4-Year (Obt/Tot)</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={row.bs_4yr_obt ?? ''}
                                    placeholder="Obt"
                                    onChange={(e) => handleMarkChange(row.id, 'bs_4yr_obt', e.target.value)}
                                    className="w-[48%] h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                  />
                                  <span className="text-slate-300">/</span>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={row.bs_4yr_total ?? ''}
                                    placeholder="Total"
                                    onChange={(e) => handleMarkChange(row.id, 'bs_4yr_total', e.target.value)}
                                    className="w-[48%] h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Extras */}
                            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 items-end">
                              <div>
                                <label className="text-[7px] font-black text-slate-400 uppercase text-center block mb-1">Position (0/1)</label>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  max="1"
                                  value={row.board_position_marks ?? '0'}
                                  onChange={(e) => handleMarkChange(row.id, 'board_position_marks', e.target.value)}
                                  className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                />
                              </div>
                              <div>
                                <label className="text-[7px] font-black text-slate-400 uppercase text-center block mb-1">PG (0/1/2)</label>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  max="2"
                                  value={row.mphil_phd_marks ?? '0'}
                                  onChange={(e) => handleMarkChange(row.id, 'mphil_phd_marks', e.target.value)}
                                  className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                                />
                              </div>
                              <div className="flex flex-col items-end justify-center h-8">
                                <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest leading-none">Acad Sub A</span>
                                <span className="text-sm font-black text-blue-700 leading-tight mt-0.5">{row.part_a_total || '0.00'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Written MCQ: scaled out of 45 */}
                        <td className="px-4 py-6 bg-slate-50/10 text-center">
                          <div className="flex flex-col items-center gap-1 w-[90px] mx-auto">
                            <label className="text-[8px] font-black text-slate-400 uppercase">Written (45)</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="45"
                              value={row.mcq_test_marks ?? ''}
                              onChange={(e) => handleMarkChange(row.id, 'mcq_test_marks', e.target.value)}
                              className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-blue-400 focus:ring-0 shadow-sm"
                            />
                          </div>
                        </td>

                        {/* Part-B: Interview Viva */}
                        <td className="px-4 py-6 bg-indigo-50/5 text-center">
                          <div className="flex flex-col items-center gap-1 w-[90px] mx-auto">
                            <label className="text-[8px] font-black text-slate-400 uppercase">Viva (30)</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="30"
                              value={row.interview_marks ?? ''}
                              onChange={(e) => handleMarkChange(row.id, 'interview_marks', e.target.value)}
                              className="w-full h-8 text-center bg-white border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:border-indigo-400 focus:ring-0 shadow-sm"
                            />
                          </div>
                        </td>

                        {/* Grand Total */}
                        <td className="px-6 py-6 bg-emerald-50/5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-slate-900 leading-none">{row.grand_total || '0.00'}</span>
                            <div className="w-12 h-1 bg-emerald-500 rounded-full mt-2"></div>
                          </div>
                        </td>

                        <td className="px-6 py-6 text-right">
                          <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${row.status === 'Selected' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {row.status === 'Selected' ? <UserCheck size={14} /> : <Clock size={14} />}
                            {row.status || 'Provisional'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AwardListPage;
