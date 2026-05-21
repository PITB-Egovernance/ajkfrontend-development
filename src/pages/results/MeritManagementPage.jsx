import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, TrendingUp, ShieldCheck } from 'lucide-react';
import Button from 'components/ui/Button';
import { Card } from 'components/ui/Card';
import ResultsApi from 'api/resultsApi';
import MeritListTable from 'components/results/MeritListTable';
import ReplacementModal from 'components/results/ReplacementModal';
import StatusUpdateModal from 'components/results/StatusUpdateModal';
import toast from 'react-hot-toast';
import { useAuth } from 'context/AuthContext';
import { getUserRole } from 'utils/roleUtils';

const MeritManagementPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = getUserRole(user);
  
  // Requirement: Senior Admin or higher
  const isAuthorized = ['admin', 'senior_admin', 'chairman'].includes(userRole);

  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [statusModal, setStatusModal] = useState({ isOpen: false, award: null });
  const [replacementModal, setReplacementModal] = useState({ 
    isOpen: false, 
    outgoing: null, 
    incoming: null 
  });

  const fetchData = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const response = await ResultsApi.getAwards(jobId);
      setAwards(response.data || []);
    } catch (err) {
      toast.error('Failed to load merit list');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // UC-R06: Update Status
  const handleOpenStatusModal = (award) => {
    setStatusModal({ isOpen: true, award });
  };

  const handleStatusUpdate = async (awardId, payload) => {
    try {
      await ResultsApi.updateAwardStatus(awardId, payload);
      toast.success('Status updated and logged');
      setStatusModal({ isOpen: false, award: null });
      fetchData();
      
      // If candidate was selected, suggest rotation
      const award = awards.find(a => a.id === awardId);
      if (award && award.status === 'selected') {
        toast('Suggestion: You can now promote the next candidate.', {
          icon: '🔄',
          duration: 5000
        });
      }
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  // UC-R07: Trigger Replacement
  const handleOpenReplacement = (outgoing) => {
    // Logic: Find the highest merit rank (lowest number) among 'provisional' candidates 
    // that has a rank > the outgoing candidate's rank.
    const incoming = awards
      .filter(a => a.status === 'provisional' && a.merit_rank > outgoing.merit_rank)
      .sort((a, b) => a.merit_rank - b.merit_rank)[0];

    if (!incoming) {
      toast.error('No provisional candidates remain in the list.');
      return;
    }

    setReplacementModal({
      isOpen: true,
      outgoing,
      incoming
    });
  };

  const handleConfirmReplacement = async (awardId, payload) => {
    try {
      await ResultsApi.replaceAwardCandidate(awardId, payload);
      toast.success('Merit rotation completed successfully');
      setReplacementModal({ isOpen: false, outgoing: null, incoming: null });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Replacement failed');
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Merit Management</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-600" /> Authorized Replacement Controller
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={fetchData} 
            disabled={loading}
            className="bg-white border-2 border-slate-100 hover:border-slate-200"
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Merit
          </Button>
        </div>

        {/* Audit Disclaimer */}
        <Card className="bg-amber-50/50 border-amber-100 overflow-hidden">
          <div className="flex items-center gap-4 p-6">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Audit Enforcement Active</h4>
              <p className="text-xs text-amber-700 font-medium mt-1">
                Every status change or merit rotation is recorded in the permanent audit trail. Reason codes are mandatory.
              </p>
            </div>
          </div>
        </Card>

        {/* Table Area */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" /> Official Hierarchy
            </h3>
          </div>
          
          <MeritListTable 
            rows={awards.map(a => ({
              ...a,
              candidate_name: a.application?.candidate_name,
              roll_number: a.application?.application_number,
              cnic: a.application?.candidate_cnic,
              academic_total: a.part_a_total,
              interview_total: a.part_b_total,
              grand_total: a.grand_total,
            }))} 
            loading={loading} 
            isAdmin={isAuthorized}
            onStatusChange={handleOpenStatusModal}
            onRotate={handleOpenReplacement}
          />
        </div>
      </div>

      {/* UC-R06: Status Modal */}
      {statusModal.isOpen && (
        <StatusUpdateModal
          isOpen={statusModal.isOpen}
          award={statusModal.award}
          onClose={() => setStatusModal({ isOpen: false, award: null })}
          onConfirm={handleStatusUpdate}
        />
      )}

      {/* UC-R07: Replacement Modal */}
      {replacementModal.isOpen && (
        <ReplacementModal
          isOpen={replacementModal.isOpen}
          outgoing={replacementModal.outgoing}
          incoming={replacementModal.incoming}
          allProvisional={awards.filter(a => a.status === 'provisional')}
          onClose={() => setReplacementModal({ isOpen: false, outgoing: null, incoming: null })}
          onConfirm={handleConfirmReplacement}
        />
      )}
    </div>
  );
};

export default MeritManagementPage;
