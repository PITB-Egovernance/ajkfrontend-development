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
    let val = parseFloat(value);
    if (isNaN(val)) val = 0;
    val = Math.max(0, val);

    setAwards(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };

        // Live Recalculate Part A
        const partAFields = ['marks_matric', 'marks_intermediate', 'marks_graduation', 'marks_masters', 'marks_additional', 'marks_bu_position'];
        if (partAFields.includes(field)) {
          const rawA = partAFields.reduce((sum, f) => sum + (parseFloat(updated[f]) || 0), 0);
          updated.part_a_total = Math.min(rawA, 25);
        }

        // Live Recalculate Part B
        const partBFields = ['marks_pak_kashmir', 'marks_islamic', 'marks_current_aff'];
        if (partBFields.includes(field)) {
          const rawB = partBFields.reduce((sum, f) => sum + (parseFloat(updated[f]) || 0), 0);
          updated.part_b_total = Math.min(rawB, 30);
        }

        // Live Recalculate Grand Total
        updated.grand_total = Math.min((updated.part_a_total || 0) + (updated.part_b_total || 0), 55);

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

      // Extract only the fields we want to save
      const payload = {
        marks_matric: field === 'marks_matric' ? val : award.marks_matric,
        marks_intermediate: field === 'marks_intermediate' ? val : award.marks_intermediate,
        marks_graduation: field === 'marks_graduation' ? val : award.marks_graduation,
        marks_masters: field === 'marks_masters' ? val : award.marks_masters,
        marks_additional: field === 'marks_additional' ? val : award.marks_additional,
        marks_bu_position: field === 'marks_bu_position' ? val : award.marks_bu_position,
        marks_pak_kashmir: field === 'marks_pak_kashmir' ? val : award.marks_pak_kashmir,
        marks_islamic: field === 'marks_islamic' ? val : award.marks_islamic,
        marks_current_aff: field === 'marks_current_aff' ? val : award.marks_current_aff,
        status: field === 'status' ? value : award.status,
        remarks: field === 'remarks' ? value : award.remarks,
      };

      setSavingRows(prev => ({ ...prev, [id]: true }));
      try {
        const res = await ResultsApi.patchAward(id, payload, award.version);
        // Update local version from server response
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
    }, 1500); // 1.5 second debounce
  };

  const handleAutoRank = () => {
    const sorted = [...awards].sort((a, b) => {
      // Priority 1: Grand Total
      if (b.grand_total !== a.grand_total) return b.grand_total - a.grand_total;
      // Priority 2: Part A
      if (b.part_a_total !== a.part_a_total) return b.part_a_total - a.part_a_total;
      // Fallback: Internal ID stability
      return (a.id || 0) - (b.id || 0);
    });

    setAwards(sorted.map((item, index) => ({
      ...item,
      merit_rank: index + 1,
      status: (index < 5) ? 'Selected' : 'Provisional' // Dummy selection logic
    })));

    toast.success('Ranks auto-computed!');
  };

  const handleExportCSV = () => {
    if (!awards.length) return;

    const headers = ['Rank', 'Roll Number', 'Candidate Name', 'Part-A Total', 'Part-B Total', 'Grand Total', 'Status'];
    const csvContent = [
      headers.join(','),
      ...awards.map(row => [
        row.merit_rank || '-',
        row.application?.application_number || 'TBD',
        `"${row.application?.candidate_name}"`, // Quote names for safety
        row.part_a_total || 0,
        row.part_b_total || 0,
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

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - Official Branded
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Azad Jammu & Kashmir Public Service Commission', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Interview Award List', pageWidth / 2, 22, { align: 'center' });

    // Horizontal Line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 26, pageWidth - 15, 26);

    // Job Details Block
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

    // Table
    const tableData = awards.map(row => [
      row.merit_rank || '-',
      row.application?.application_number || 'TBD',
      row.application?.candidate_name,
      row.part_a_total,
      row.part_b_total,
      row.grand_total,
      (row.status || 'Provisional').toUpperCase()
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Rank', 'Roll No', 'Candidate Name', 'Part-A', 'Part-B', 'Grand Total', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 30, halign: 'center' }
      }
    });

    // Signature Area
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
          marks_matric: a.marks_matric ?? 0,
          marks_intermediate: a.marks_intermediate ?? 0,
          marks_graduation: a.marks_graduation ?? 0,
          marks_masters: a.marks_masters ?? 0,
          marks_additional: a.marks_additional ?? 0,
          marks_bu_position: a.marks_bu_position ?? 0,
          marks_pak_kashmir: a.marks_pak_kashmir ?? 0,
          marks_islamic: a.marks_islamic ?? 0,
          marks_current_aff: a.marks_current_aff ?? 0,
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

      <div className="px-8 mt-8 grid grid-cols-12 gap-8 max-w-[1700px] mx-auto w-full">
        {/* Left Panel: Configuration */}
        <div className="col-span-3 space-y-6">
          {isInitialized && currentJob && (
            <Card className="border-none shadow-xl rounded-[2rem] p-6 bg-indigo-600/70 text-white space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users size={20} />
                </div>
                <h4 className="font-black uppercase tracking-widest text-[10px]">Context Header</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] font-black uppercase text-indigo-200">Post Title</label>
                  <p className="text-sm font-black leading-tight">{currentJob.designation}</p>
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-indigo-200">Case No.</label>
                  <p className="text-xs font-bold">#{currentJob.id} - {selectedDistrict}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-[8px] font-black uppercase text-indigo-200">Interview</label>
                    <p className="text-[10px] font-bold">{interviewDate}</p>
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase text-indigo-200">Doc Date</label>
                    <p className="text-[10px] font-bold">{lastDocDate}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-none shadow-2xl rounded-[2.5rem] p-8 space-y-6 bg-white overflow-hidden">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} className="text-indigo-500" />
              List Criteria
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Post</label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full h-14 px-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 transition-all font-bold text-slate-700"
                >
                  <option value="">Select Job...</option>
                  {jobs.map(job => (
                    <option key={job.hash_id || job.id} value={job.hash_id || job.id}>
                      {job.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">District</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full h-14 px-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 transition-all font-bold text-slate-700"
                >
                  {districts.map(d => (
                    <option key={d} value={d}>{d === 'all' ? 'All Districts' : d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interview Date</label>
                  <Input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50 border-2 border-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Doc Date</label>
                  <Input
                    type="date"
                    value={lastDocDate}
                    onChange={(e) => setLastDocDate(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50 border-2 border-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={() => handleLoadList()}
                  loading={loading}
                  className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100"
                >
                  Load Award List
                </Button>

                <Button
                  onClick={handleInitialize}
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-2 border-indigo-100 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-50"
                >
                  Create Award List
                </Button>
              </div>
            </div>
          </Card>

          <div className="p-8 bg-emerald-600 rounded-[2.5rem] text-white space-y-4 shadow-2xl relative overflow-hidden">
            <h4 className="font-black uppercase tracking-widest text-[10px] text-emerald-200">Quick Reference</h4>
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-100">Part A Cap</span>
                <span className="text-xs font-black">25.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-100">Part B Cap</span>
                <span className="text-xs font-black">30.0</span>
              </div>
              <div className="h-px bg-white/20 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-white uppercase">Grand Total</span>
                <span className="text-lg font-black underline decoration-2 underline-offset-4">55.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Scoring Table */}
        <div className="col-span-9 space-y-6">
          {!isInitialized ? (
            <div className="h-[650px] bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-12">
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
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-blue-50/40">Part-A (25)</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-indigo-50/40">Part-B (30)</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-emerald-50/40">Grand (55)</th>
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
                            <div className="flex flex-col relative">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-base leading-tight">{row.application?.candidate_name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                                <Clock size={10} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Applied: {row.application?.application_number}</span>
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
                            <div className="grid grid-cols-3 gap-2 w-[220px] mx-auto">
                              {['marks_matric', 'marks_intermediate', 'marks_graduation', 'marks_masters', 'marks_additional', 'marks_bu_position'].map(field => (
                                <div key={field} className="group/field">
                                  <label className="text-[7px] font-black text-slate-400 uppercase text-center block mb-1">
                                    {field.split('_')[1].substring(0, 3)}
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={row[field] ?? ''}
                                    onChange={(e) => handleMarkChange(row.id, field, e.target.value)}
                                    className="w-full h-9 text-center bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:border-blue-400 focus:ring-0 transition-all shadow-sm"
                                  />
                                </div>
                              ))}
                              <div className="col-span-3 mt-1 pt-2 border-t border-slate-100 flex justify-between items-center px-2">
                                <span className="text-[9px] font-black text-blue-500 uppercase">Sub A</span>
                                <span className="text-sm font-black text-blue-700">{row.part_a_total || '0.00'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Part-B: Interview */}
                          <td className="px-4 py-6 bg-indigo-50/5">
                            <div className="grid grid-cols-3 gap-2 w-[180px] mx-auto">
                              {['marks_pak_kashmir', 'marks_islamic', 'marks_current_aff'].map(field => (
                                <div key={field}>
                                  <label className="text-[7px] font-black text-slate-400 uppercase text-center block mb-1">
                                    {field.split('_')[1].substring(0, 3)}
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={row[field] ?? ''}
                                    onChange={(e) => handleMarkChange(row.id, field, e.target.value)}
                                    className="w-full h-9 text-center bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:border-indigo-400 focus:ring-0 transition-all shadow-sm"
                                  />
                                </div>
                              ))}
                              <div className="col-span-3 mt-1 pt-2 border-t border-slate-100 flex justify-between items-center px-2">
                                <span className="text-[9px] font-black text-indigo-500 uppercase">Sub B</span>
                                <span className="text-sm font-black text-indigo-700">{row.part_b_total || '0.00'}</span>
                              </div>
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
    </div>
  );
};

export default AwardListPage;
