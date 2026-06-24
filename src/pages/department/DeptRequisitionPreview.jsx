import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { InlineLoader } from 'components/ui/Loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from 'components/ui/Dialog';
import toast from 'react-hot-toast';
import DeptRequisitionApi from 'api/deptRequisitionApi';

const DeptRequisitionPreview = () => {
  const { tempId } = useParams();
  const navigate = useNavigate();
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line
  }, [tempId]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const result = await DeptRequisitionApi.getPreview(tempId);
      if (result.success && result.data) {
        setPreviewData(result.data);
      } else {
        toast.error('Failed to load preview data');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const result = await DeptRequisitionApi.confirm(tempId);
      if (result.success) {
        toast.success('Requisition confirmed successfully');
        setConfirmModalOpen(false);
        navigate('/department/requisitions');
      } else {
        toast.error(result.message || 'Failed to confirm');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to confirm');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <InlineLoader text="Loading preview..." variant="ring" size="lg" />
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-500">
        <AlertCircle size={48} className="mb-4 text-slate-300" />
        <p className="text-lg">No preview data available</p>
        <button
          onClick={() => navigate('/department/requisitions')}
          className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
        >
          Back to Requisitions
        </button>
      </div>
    );
  }

  const { step1, step2, step3 } = previewData;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/department/requisitions/create?temp_id=${tempId}&step=${3}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={18} /> Back to Edit
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
            >
              <CheckCircle2 size={16} /> Confirm & Save
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Requisition Preview</h2>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-emerald-800 mb-3">Job Details</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-sm text-slate-500">Designation</dt><dd className="font-medium">{step1?.designation || '-'}</dd></div>
              <div><dt className="text-sm text-slate-500">Scale</dt><dd className="font-medium">{step1?.scale || '-'}</dd></div>
              <div><dt className="text-sm text-slate-500">Department</dt><dd className="font-medium">{step1?.department || '-'}</dd></div>
              <div><dt className="text-sm text-slate-500">No. of Posts</dt><dd className="font-medium">{step1?.num_posts || '-'}</dd></div>
              <div><dt className="text-sm text-slate-500">Vacancy Date</dt><dd className="font-medium">{step1?.vacancy_date || '-'}</dd></div>
            </dl>
          </div>

          {step2 && Object.keys(step2).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-emerald-800 mb-3">Criteria / Qualifications</h3>
              <dl className="grid grid-cols-2 gap-4">
                {Object.entries(step2).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm text-slate-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium">{value || '-'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {step3 && Object.keys(step3).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-emerald-800 mb-3">Eligibility</h3>
              <dl className="grid grid-cols-2 gap-4">
                {Object.entries(step3).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm text-slate-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium">{Array.isArray(value) ? value.join(', ') : value || '-'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-700" />
              </div>
              <DialogTitle>Confirm Requisition</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to save this requisition? You will be able to
              edit it again before submitting to admin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setConfirmModalOpen(false)}
              disabled={confirming}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-2"
            >
              {confirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {confirming ? 'Confirming...' : 'Confirm'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeptRequisitionPreview;