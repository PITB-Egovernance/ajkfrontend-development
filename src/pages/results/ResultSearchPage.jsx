import React, { useState, useEffect } from 'react';
import {
  Search,
  Printer,
  User,
  FileText,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronRight,
  Edit3,
  AlertCircle
} from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import Input from 'components/ui/Input';
import SearchableSelect from 'components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from 'components/ui/Dialog';

const ResultSearchPage = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showCnic, setShowCnic] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  // User Role Check (simplified for UI)
  const userRole = JSON.parse(localStorage.getItem('user'))?.role || 'data_entry_officer';
  const isAdmin = ['admin', 'chairman', 'secretary'].includes(userRole);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await AdvertisementApi.getAll(1);
      const ads = res.data?.data || res.data || [];
      const allJobs = ads.flatMap(adv => (adv.job_details || adv.jobDetails || []).map(job => ({
        ...job,
        adv_number: adv.adv_number
      })));
      setJobs(allJobs);
    } catch (err) {
      toast.error('Failed to load job posts');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!selectedJob) return toast.error('Please select a job post');
    if (searchQuery.length < 3) return toast.error('Query too short');

    try {
      setLoading(true);
      setResult(null);
      setShowCnic(false);
      const res = await ResultsApi.searchResult(selectedJob, searchQuery);
      setResult(res.data);
    } catch (err) {
      toast.error(err.message || 'Result not found');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCnic = async () => {
    if (!showCnic) {
      try {
        // Log audit for unmasking
        await ResultsApi.logUnmaskAudit(result.hash_id);
        setShowCnic(true);
      } catch (err) {
        toast.error('Failed to log audit for unmasking');
      }
    } else {
      setShowCnic(false);
    }
  };

  const handleDownload = async (mode) => {
    try {
      setPrinting(true);
      const blob = await ResultsApi.downloadResultPDF(result.hash_id, mode);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Result_${result.roll_no}_${mode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${mode.charAt(0).toUpperCase() + mode.slice(1)} PDF generated`);
      setIsPrintModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'PDF generation failed');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Result Verification</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Search & Print Candidate Sheets</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20">
        <CardContent className="p-8">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Job Post</label>
              <SearchableSelect
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                options={[
                  { value: '', label: 'Choose a job...' },
                  ...jobs.map(job => ({
                    value: job.hash_id,
                    label: `${job.adv_number ? `#${job.adv_number} - ` : ''}${job.designation}`,
                  })),
                ]}
                placeholder="Choose a job..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll No / CNIC</label>
              <Input
                placeholder="Enter search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-2xl border-2 border-slate-100 font-bold"
              />
            </div>
            <Button
              type="submit"
              loading={loading}
              className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
            >
              <Search className="mr-2" size={20} />
              Search Record
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Candidate Card */}
          <Card className="lg:col-span-2 border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileText size={120} />
              </div>
              <div className="relative z-10 flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <User size={48} className="text-indigo-200" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black">{result.application?.candidate_name}</h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${result.status === 'pass' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-indigo-200 font-bold mt-1 uppercase tracking-wider">Roll No: {result.roll_no}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate CNIC</p>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-black text-slate-700">
                      {showCnic ? result.application?.candidate_cnic : '•••••-•••••••-•'}
                    </p>
                    <button
                      onClick={handleToggleCnic}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500"
                    >
                      {showCnic ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                  <p className="text-xl font-black text-slate-700 truncate">{result.job_detail?.department?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Subject-wise Marks</p>
                <div className="space-y-3">
                  {result.subjects?.map((sub, i) => (
                    <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-600">{sub.subject_name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-slate-400">{sub.max_marks} Max</span>
                        <span className="text-xl font-black text-indigo-600">{sub.obtained_marks}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-6 rounded-2xl bg-indigo-50 border-2 border-indigo-100 mt-6">
                    <span className="font-black text-indigo-900 uppercase tracking-widest">Aggregate Total</span>
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-bold text-indigo-400">{result.total_max_marks} Max</span>
                      <span className="text-3xl font-black text-indigo-700">{result.obtained_marks}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white p-6 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sheet Actions</p>
              <Button
                onClick={() => setIsPrintModalOpen(true)}
                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black shadow-xl"
              >
                <Printer className="mr-2" size={20} />
                Generate PDF Sheet
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
          <Search size={80} strokeWidth={1} />
          <p className="mt-4 font-black uppercase tracking-widest text-slate-400">Search for a candidate to view results</p>
        </div>
      )}

      {/* Print Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Choose Print Mode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <button
              onClick={() => handleDownload('unofficial')}
              className="w-full p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-black text-slate-700">Unofficial Copy</span>
                <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              <p className="text-xs text-slate-400 font-bold">Watermarked, masked CNIC, for internal review.</p>
            </button>

            <button
              disabled={!isAdmin}
              onClick={() => handleDownload('official')}
              className={`w-full p-6 rounded-2xl border-2 border-slate-100 transition-all text-left group ${isAdmin ? 'hover:border-indigo-200 hover:bg-indigo-50' : 'opacity-50 cursor-not-allowed'
                }`}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-700">Official Result Sheet</span>
                  <ShieldCheck size={16} className="text-indigo-500" />
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Requires Admin Permission</p>
            </button>
          </div>
          {!isAdmin && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3">
              <AlertCircle size={20} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-bold">Only Results Admin and higher can generate Official signed sheets.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPrintModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultSearchPage;
