import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Save, 
  FileDown, 
  Award, 
  Filter, 
  Printer, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  History,
  MoreHorizontal,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from 'components/ui/Button';
import Card from 'components/ui/Card';
import Input from 'components/ui/Input';
import { toast } from 'react-hot-toast';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';

const InterviewAwardManagement = () => {
  const navigate = useNavigate();
  
  // Selection State
  const [jobs, setJobs] = useState([]);
  const [districts, setDistricts] = useState(['all', 'Muzaffarabad', 'Mirpur', 'Poonch', 'Bagh', 'Bhimber', 'Kotli', 'Sudhnoti', 'Hattian', 'Haveli', 'Neelum']);
  
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [interviewDate, setInterviewDate] = useState('');
  const [lastDocDate, setLastDocDate] = useState('');
  
  // Data State
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await AdvertisementApi.getJobDetails();
      setJobs(res.data || []);
    } catch (err) {
      toast.error('Failed to load job posts');
    }
  };

  const handleLoadList = async () => {
    if (!selectedJob) {
      toast.error('Please select a Job Post first');
      return;
    }
    
    setLoading(true);
    try {
      const res = await ResultsApi.getAwards(selectedJob, selectedDistrict);
      if (res.data && res.data.length > 0) {
        setAwards(res.data);
        setIsInitialized(true);
        toast.success(`Loaded ${res.data.length} candidates`);
      } else {
        setIsInitialized(false);
        setAwards([]);
        toast.error('No award list found. Please initialize first.');
      }
    } catch (err) {
      toast.error('Failed to load award list');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!selectedJob || !selectedDistrict || !interviewDate || !lastDocDate) {
      toast.error('Please fill all fields to initialize the list');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/v1/results/awards/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.REACT_APP_API_KEY,
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          job_post_id: selectedJob,
          district: selectedDistrict,
          interview_date: interviewDate,
          last_doc_date: lastDocDate
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Created list for ${data.data.created} new candidates`);
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
    const val = parseFloat(value) || 0;
    
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
        updated.grand_total = Math.min(updated.part_a_total + updated.part_b_total, 55);
        
        return updated;
      }
      return item;
    }));
  };

  const handleAutoRank = () => {
    const sorted = [...awards].sort((a, b) => {
      if (b.grand_total !== a.grand_total) return b.grand_total - a.grand_total;
      if (b.part_a_total !== a.part_a_total) return b.part_a_total - a.part_a_total;
      
      const dobA = new Date(a.application?.candidate_dob || 0).getTime();
      const dobB = new Date(b.application?.candidate_dob || 0).getTime();
      return dobA - dobB; // Older first (smaller timestamp)
    });

    setAwards(sorted.map((item, index) => ({
      ...item,
      merit_rank: index + 1,
      status: (index < 5) ? 'Selected' : 'Provisional' // Dummy N=5 for demo
    })));
    
    toast.success('Ranks auto-computed based on Grand Total and Age seniority');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await ResultsApi.submitAwards({
        job_post_id: selectedJob,
        awards: awards
      });
      toast.success('Award list saved successfully');
    } catch (err) {
      toast.error('Failed to save award list');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard/results')} className="p-3 hover:bg-slate-100 rounded-2xl transition-all group">
            <ArrowLeft className="text-slate-400 group-hover:text-slate-900" size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Award className="text-emerald-500" size={28} />
              Interview Award Console
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Journey 2.3 • Merit List Builder</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="rounded-2xl border-2 border-slate-100 h-12 px-6 font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50"
            onClick={() => window.print()}
          >
            <Printer size={16} className="mr-2" />
            Print Preview
          </Button>
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

      <div className="px-8 mt-8 grid grid-cols-12 gap-8 max-w-[1600px] mx-auto w-full">
        {/* Sidebar Configuration */}
        <div className="col-span-3 space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] p-8 space-y-6 bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Filter size={80} />
            </div>
            
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <RefreshCw size={14} className="text-indigo-500" />
              List Config
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
                    <option key={job.id} value={job.id}>{job.designation}</option>
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

              <Button 
                onClick={handleLoadList}
                loading={loading}
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 mt-4"
              >
                Load Existing List
              </Button>

              <Button 
                onClick={handleInitialize}
                variant="outline"
                className="w-full h-14 rounded-2xl border-2 border-indigo-100 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-50"
              >
                Create New Draft
              </Button>
            </div>
          </Card>

          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10">
              <ShieldCheck size={200} />
            </div>
            <h4 className="font-black uppercase tracking-widest text-[10px] text-emerald-400">Scoring Rules</h4>
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Part A (Academic)</span>
                <span className="text-xs font-black">MAX 25</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Part B (Interview)</span>
                <span className="text-xs font-black">MAX 30</span>
              </div>
              <div className="h-px bg-white/10 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-emerald-400 uppercase">Grand Total</span>
                <span className="text-lg font-black">55.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-9 space-y-6">
          {!isInitialized ? (
            <div className="h-[600px] bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-12">
              <div className="p-8 bg-slate-50 rounded-full mb-6">
                <Trophy size={80} strokeWidth={1} className="text-slate-200" />
              </div>
              <h2 className="text-2xl font-black text-slate-300 uppercase tracking-widest">Select Job & Initialize</h2>
              <p className="text-slate-400 font-medium max-w-sm mt-4 leading-relaxed">
                Choose a job post and district from the left panel to begin building the official award list.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Quick Actions Bar */}
              <div className="bg-white p-4 rounded-3xl shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4 px-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Candidates</span>
                    <span className="text-xl font-black text-slate-900">{awards.length}</span>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                    <span className="text-xs font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-full mt-1">Draft Mode</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleAutoRank}
                    className="h-12 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border-none shadow-lg shadow-emerald-100"
                  >
                    <RefreshCw size={16} />
                    Run Auto-Rank
                  </Button>
                </div>
              </div>

              {/* Award Table */}
              <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                        <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate Identity</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-blue-50/30">Part A (25)</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-indigo-50/30">Part B (30)</th>
                        <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-emerald-50/30">Total (55)</th>
                        <th className="px-6 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Selection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awards.map((row, index) => (
                        <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black ${
                              index < 3 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {row.merit_rank || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-sm leading-none">{row.application?.candidate_name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                                Roll: <span className="text-slate-900">{row.application?.roll_no || 'TBD'}</span> • Dist: {row.district}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium mt-1">
                                DOB: {new Date(row.application?.candidate_dob).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          
                          {/* Part A Inputs */}
                          <td className="px-4 py-4 bg-blue-50/10">
                            <div className="grid grid-cols-3 gap-2 w-[180px] mx-auto">
                              {['marks_matric', 'marks_intermediate', 'marks_graduation'].map(field => (
                                <div key={field} className="space-y-1">
                                  <label className="text-[7px] font-black text-slate-400 uppercase text-center block">
                                    {field.split('_')[1].substring(0,3)}
                                  </label>
                                  <input 
                                    type="number"
                                    step="0.5"
                                    value={row[field] || ''}
                                    onChange={(e) => handleMarkChange(row.id, field, e.target.value)}
                                    className="w-full h-8 text-center bg-white border border-slate-100 rounded-lg text-xs font-black text-slate-700 focus:border-blue-400 focus:ring-0 transition-all"
                                  />
                                </div>
                              ))}
                              <div className="col-span-3 h-px bg-slate-100 my-1"></div>
                              <div className="col-span-3 flex justify-between items-center px-2">
                                <span className="text-[8px] font-black text-blue-500 uppercase">SubTotal A</span>
                                <span className="text-xs font-black text-blue-600">{row.part_a_total || '0.00'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Part B Inputs */}
                          <td className="px-4 py-4 bg-indigo-50/10">
                            <div className="grid grid-cols-2 gap-2 w-[140px] mx-auto">
                              {['marks_pak_kashmir', 'marks_islamic'].map(field => (
                                <div key={field} className="space-y-1">
                                  <label className="text-[7px] font-black text-slate-400 uppercase text-center block">
                                    {field.split('_')[1].substring(0,3)}
                                  </label>
                                  <input 
                                    type="number"
                                    step="0.5"
                                    value={row[field] || ''}
                                    onChange={(e) => handleMarkChange(row.id, field, e.target.value)}
                                    className="w-full h-8 text-center bg-white border border-slate-100 rounded-lg text-xs font-black text-slate-700 focus:border-indigo-400 focus:ring-0 transition-all"
                                  />
                                </div>
                              ))}
                              <div className="col-span-2 flex justify-between items-center px-2 mt-2">
                                <span className="text-[8px] font-black text-indigo-500 uppercase">SubTotal B</span>
                                <span className="text-xs font-black text-indigo-600">{row.part_b_total || '0.00'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Grand Total */}
                          <td className="px-6 py-4 bg-emerald-50/10 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-black text-slate-900">{row.grand_total || '0.00'}</span>
                              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Certified</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                              row.status === 'Selected' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'
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

export default InterviewAwardManagement;
