import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, TrendingUp, ShieldCheck, Info } from 'lucide-react';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import ResultsApi from 'api/resultsApi';
import QuotaSummaryCard from 'components/results/QuotaSummaryCard';
import MeritListTable from 'components/results/MeritListTable';
import ReplacementModal from 'components/results/ReplacementModal';
import toast from 'react-hot-toast';
import { useAuth } from 'context/AuthContext';
import { getUserRole } from 'utils/roleUtils';

/**
 * MeritManagementPage
 * Controls the final merit ranking, recommended list, and candidate rotation/replacements
 */

const MeritManagementPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = getUserRole(user);
  
  // Authorized roles for merit mutation
  const isAdmin = ['admin', 'chairman'].includes(userRole);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSeats: 0, filled: 0, withheld: 0, remaining: 0 });
  
  // Modal State for Candidate Rotation
  const [replacementModal, setReplacementModal] = useState({ 
    isOpen: false, 
    candidate: null, 
    nextInLine: null 
  });
  const [processingRotation, setProcessingRotation] = useState(false);

  const fetchMeritData = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch ranked results for the job post
      const response = await ResultsApi.searchResults({ 
        job_post_id: jobId, 
        sort_by: 'merit_rank', 
        per_page: 100 
      });
      
      const data = response.data || [];
      
      const formattedRows = data.map(item => {
        const award = item.interview_award || {};
        
        const academicTotal = Number(award.marks_matric || 0) + 
                             Number(award.marks_intermediate || 0) + 
                             Number(award.marks_graduation || 0) + 
                             Number(award.marks_masters || 0) + 
                             Number(award.marks_additional || 0) + 
                             Number(award.marks_bu_position || 0);

        const interviewTotal = Number(award.marks_pak_kashmir || 0) + 
                              Number(award.marks_islamic || 0) + 
                              Number(award.marks_current_aff || 0);

        const writtenMarks = Number(item.obtained_marks || 0);

        return {
          id: item.hash_id || item.id,
          merit_rank: award.merit_rank || item.merit_rank || 'N/A',
          roll_number: item.application?.application_number || item.application?.roll_number || 'N/A',
          candidate_name: item.application?.candidate_name || 'N/A',
          cnic: item.application?.candidate_cnic || item.application?.cnic_masked || 'N/A',
          academic_total: academicTotal,
          interview_total: interviewTotal,
          grand_total: writtenMarks + academicTotal + interviewTotal,
          status: award.status || item.status || 'Pending'
        };
      });

      setRows(formattedRows);
      
      // Calculate quota stats
      // Note: In a production environment, these counts should be fetched from a specific aggregate endpoint
      const recommendedCount = formattedRows.filter(r => 
        ['selected', 'recommended'].includes(r.status?.toLowerCase())
      ).length;
      
      const withheldCount = formattedRows.filter(r => 
        r.status?.toLowerCase() === 'withheld'
      ).length;

      // Mocking total seats for now, this would normally come from the Job/Requisition data
      const mockTotalSeats = 5; 

      setStats({
        totalSeats: mockTotalSeats,
        filled: recommendedCount,
        withheld: withheldCount,
        remaining: Math.max(0, mockTotalSeats - recommendedCount)
      });

    } catch (err) {
      toast.error('Failed to synchronize merit rankings');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchMeritData();
  }, [fetchMeritData]);

  /**
   * Triggers the replacement workflow for a selected candidate
   */
  const handleOpenRotation = (candidate) => {
    // Logic: Find the highest ranked 'Pass' candidate who is NOT currently 'Selected'
    const nextCandidate = rows.find(r => 
      Number(r.merit_rank) > Number(candidate.merit_rank) && 
      ['pass', 'qualified'].includes(r.status?.toLowerCase())
    );

    if (!nextCandidate) {
      toast.error('No eligible next-in-line candidates found for replacement.');
      return;
    }

    setReplacementModal({
      isOpen: true,
      candidate,
      nextInLine: nextCandidate
    });
  };

  /**
   * Commits the merit rotation to the backend
   */
  const handleConfirmRotation = async (payload) => {
    setProcessingRotation(true);
    try {
      await ResultsApi.updateMerit({
        job_post_id: jobId,
        action: 'rotate',
        ...payload
      });
      
      toast.success('Merit rotation successful. Ranking updated.');
      setReplacementModal({ isOpen: false, candidate: null, nextInLine: null });
      fetchMeritData(); // Refresh list to see new ranks
    } catch (err) {
      toast.error(err.message || 'Merit rotation failed');
    } finally {
      setProcessingRotation(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-600 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Merit Management</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Authorized Ranking Controller
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={fetchMeritData} 
            disabled={loading}
            className="h-auto py-3 px-6 border-slate-200 text-slate-600 bg-white shadow-sm font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-50"
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Rankings
          </Button>
        </div>

        {/* Quota Analytics Section */}
        <QuotaSummaryCard {...stats} />

        {/* Main Merit Grid Area */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-6 gap-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              Official Merit Hierarchy
            </h3>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                <Info size={12} /> Ties Resolved by Rule 14-A
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase bg-slate-200/50 px-3 py-1 rounded-full">
                Total Candidates: {rows.length}
              </div>
            </div>
          </div>
          
          <MeritListTable 
            rows={rows} 
            loading={loading} 
            isAdmin={isAdmin}
            onRotate={handleOpenRotation}
          />
        </div>
        
        {/* Footer Info */}
        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Certification Note</h4>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              This merit list is generated based on aggregate scores from Part-A (Academic) and Part-B (Interview). 
              Rotation actions are audit-logged and require authorization. Candidates marked as "Selected" are 
              eligible for appointment orders.
            </p>
          </div>
        </div>
      </div>

      {/* Logic Modal for Merit Rotation */}
      <ReplacementModal 
        {...replacementModal} 
        loading={processingRotation}
        onClose={() => setReplacementModal({ isOpen: false, candidate: null, nextInLine: null })}
        onConfirm={handleConfirmRotation}
      />
    </div>
  );
};

export default MeritManagementPage;
