import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { ArrowLeft, Send, Users, ClipboardCheck, Sparkles, Building, Award } from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import toast from 'react-hot-toast';
import ShortlistPublishModal from './components/ShortlistPublishModal';

export default function InterviewShortlistPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [publishOpen, setPublishOpen] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchShortlist();
    }
  }, [jobId]);

  const fetchShortlist = async () => {
    setLoading(true);
    try {
      const res = await ResultsApi.getShortlist(jobId);
      setData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch shortlisting candidates');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishSuccess = () => {
    setPublishOpen(false);
    navigate('/dashboard/results');
  };

  if (loading) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading shortlist workspace...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen text-center flex flex-col items-center justify-center">
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">No shortlisting data found</p>
        <Link to="/dashboard/results">
          <Button className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 h-10 rounded-xl">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const { job, candidates } = data;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[90rem] mx-auto space-y-8 animate-fade-in">
        
        {/* Navigation back */}
        <button
          onClick={() => navigate('/dashboard/results')}
          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-all"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
          <div className="space-y-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
              Stage 5 — Interview Shortlisting
            </span>
            <h1 className="text-3xl font-black tracking-tight">{job.designation}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5"><Building size={14} /> Organization Settings</span>
              <span className="flex items-center gap-1.5"><Award size={14} /> {job.num_posts} Post{job.num_posts > 1 ? 's' : ''} Advertised</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {job.result_status === 'Approved' ? (
              <Button
                onClick={() => setPublishOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/45 px-6 h-12 rounded-2xl flex items-center gap-2 transform hover:scale-[1.03] transition-all"
              >
                <Send size={14} strokeWidth={2.5} />
                Publish Provisional Shortlist
              </Button>
            ) : (
              <div className="px-5 py-3 bg-white/10 rounded-2xl border border-white/20 text-[10px] font-black uppercase tracking-widest text-slate-300">
                Status: {job.result_status}
              </div>
            )}
          </div>
        </div>

        {/* Candidate Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white">
            <CardContent className="p-8 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Eligible Passed</p>
                <p className="text-3xl font-black text-slate-900">{candidates.length}</p>
              </div>
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2rem] bg-white">
            <CardContent className="p-8 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Advertised Vacancies</p>
                <p className="text-3xl font-black text-slate-900">{job.num_posts}</p>
              </div>
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                <Award size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2rem] bg-white">
            <CardContent className="p-8 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Interview Candidates Needed</p>
                <p className="text-3xl font-black text-slate-900">{(2 * job.num_posts) + 1}</p>
              </div>
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                <ClipboardCheck size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Candidate List Workspace */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500" />
              Eligible Candidates ranked by percentage (Highest First)
            </h2>
          </div>

          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Merit Rank</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Roll Number</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Candidate Name</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">CNIC</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Obtained Marks</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Total Marks</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Percentage</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-8 py-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        No candidates are currently eligible for shortlisting
                      </td>
                    </tr>
                  ) : (
                    candidates.map((candidate, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-5 text-center">
                          <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-black ${
                            idx < (2 * job.num_posts + 1)
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-black'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-700">{candidate.roll_no}</td>
                        <td className="px-6 py-5 text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {candidate.candidate_name}
                        </td>
                        <td className="px-6 py-5 text-xs font-semibold text-slate-400">{candidate.cnic}</td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-800 text-right">{candidate.obtained_marks}</td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-400 text-right">{candidate.total_max_marks}</td>
                        <td className="px-6 py-5 text-sm font-black text-indigo-600 text-right">{candidate.percentage}%</td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            idx < (2 * job.num_posts + 1)
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {idx < (2 * job.num_posts + 1) ? 'In Shortlist' : 'Below Cutoff'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

      </div>

      <ShortlistPublishModal
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        jobId={jobId}
        onConfirm={handlePublishSuccess}
      />
    </div>
  );
}
