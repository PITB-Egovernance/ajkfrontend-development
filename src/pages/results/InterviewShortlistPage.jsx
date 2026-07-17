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
  const [selectedIds, setSelectedIds] = useState([]);

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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = data.candidates.map(c => c.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider animate-pulse">Loading shortlist workspace...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen text-center flex flex-col items-center justify-center space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No shortlisting data found</p>
        <Link to="/dashboard/results">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 h-9 rounded-lg shadow-sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const { job, candidates } = data;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/results')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-900 border border-slate-200 bg-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Stage 5 — Interview Shortlisting
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight mt-1">{job.designation}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {job.result_status === 'Approved' || job.result_status === 'APPROVED' ? (
              <Button
                onClick={() => setPublishOpen(true)}
                disabled={selectedIds.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm px-4 h-9 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                Publish Provisional Shortlist
              </Button>
            ) : (
              <div className="px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">
                Status: {job.result_status}
              </div>
            )}
          </div>
        </div>

        {/* Candidate Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Eligible Passed</p>
                <p className="text-2xl font-bold text-slate-900">{candidates.length}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-650 rounded-lg">
                <Users size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Advertised Vacancies</p>
                <p className="text-2xl font-bold text-slate-900">{job.num_posts}</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <Award size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Candidates Selected</p>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedIds.length} <span className="text-sm font-semibold text-slate-400">/ {candidates.length}</span>
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <ClipboardCheck size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Candidate List Workspace */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500" />
              Eligible Candidates ranked by percentage (Highest First)
            </h2>
          </div>

          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="px-4 py-3.5 text-center text-slate-500 w-12">
                      <input
                        type="checkbox"
                        checked={candidates.length > 0 && selectedIds.length === candidates.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-center text-slate-500">Merit Rank</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Roll Number</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Candidate Name</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">CNIC</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Obtained Marks</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Total Marks</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Percentage</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-10 text-center text-slate-400 font-semibold text-xs">
                        No candidates are currently eligible for shortlisting
                      </td>
                    </tr>
                  ) : (
                    candidates.map((candidate, idx) => {
                      const isSelected = selectedIds.includes(candidate.id);
                      return (
                        <tr key={idx} className={`hover:bg-slate-50/50 transition-colors group ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(candidate.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${isSelected
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-150 text-slate-400'
                              }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">{candidate.roll_no}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {candidate.candidate_name}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">{candidate.cnic}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-800 text-right">{candidate.obtained_marks}</td>
                          <td className="px-6 py-4 text-xs text-slate-405 text-right">{candidate.total_max_marks}</td>
                          <td className="px-6 py-4 text-xs font-bold text-indigo-600 text-right">{candidate.percentage}%</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border whitespace-nowrap ${isSelected
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}>
                              {isSelected ? 'Selected' : 'Deselected'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
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
        selectedIds={selectedIds}
        onConfirm={handlePublishSuccess}
      />
    </div>
  );
}
