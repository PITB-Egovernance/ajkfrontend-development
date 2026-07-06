import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Save,
  Calendar,
  Building,
  History,
  Edit3
} from 'lucide-react';
import Button from 'components/ui/Button';
import SearchableSelect from 'components/ui/SearchableSelect';
import ResultsApi from 'api/resultsApi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MarkEntryModal
 * Implements UC-R01b: Add/Edit Exam Marks via Dialog Form
 */
const MarkEntryModal = ({ isOpen, onClose, candidate, jobId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    exam_date: new Date().toISOString().split('T')[0],
    exam_center: '',
    status: 'present',
    marks: {
      written: { obtained: '', total: 100 },
      viva: { obtained: '', total: 20 },
      interview: { obtained: '', total: 30 }
    },
    reason: ''
  });

  useEffect(() => {
    if (candidate && candidate.marks_status && candidate.marks_status !== 'Pending') {
      setIsEdit(true);
      const m = candidate.marks_summary || {};
      setFormData(prev => ({
        ...prev,
        marks: {
          written: { obtained: m.written?.obtained || '', total: m.written?.total || 100 },
          viva: { obtained: m.viva?.obtained || '', total: m.viva?.total || 20 },
          interview: { obtained: m.interview?.obtained || '', total: m.interview?.total || 30 }
        }
      }));
    } else {
      setIsEdit(false);
      setFormData({
        exam_date: new Date().toISOString().split('T')[0],
        exam_center: '',
        status: 'pass',
        marks: {
          written: { obtained: '', total: 100 },
          viva: { obtained: '', total: 20 },
          interview: { obtained: '', total: 30 }
        },
        reason: ''
      });
    }
  }, [candidate, isOpen]);

  const calculateTotal = () => {
    const obtained = Object.values(formData.marks).reduce((sum, m) => sum + (Number(m.obtained) || 0), 0);
    const total = Object.values(formData.marks).reduce((sum, m) => sum + (Number(m.total) || 0), 0);
    const percentage = total > 0 ? (obtained / total * 100).toFixed(1) : 0;
    return { obtained, total, percentage };
  };

  const handleMarkChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      marks: {
        ...prev.marks,
        [section]: { ...prev.marks[section], [field]: value }
      }
    }));
  };

  const validate = () => {
    const { exam_date, exam_center, marks, reason } = formData;
    if (!exam_date) return "Exam date is required";
    if (!exam_center) return "Exam center is required";
    
    for (const [section, m] of Object.entries(marks)) {
      if (m.obtained !== '' && (Number(m.obtained) < 0 || Number(m.obtained) > Number(m.total))) {
        return `Invalid marks for ${section}: Must be between 0 and ${m.total}`;
      }
    }
    
    if (isEdit && (!reason || reason.trim().length < 10)) {
      return "Reason for correction is required (minimum 10 characters) when updating existing marks.";
    }
    
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    const { obtained, total } = calculateTotal();
    
    // Format for backend (detailed result type)
    const payload = {
      job_post_id: jobId,
      exam_date: formData.exam_date,
      result_type: 'detailed',
      total_max_marks: total,
      passing_marks: Math.ceil(total * 0.4), // Default 40% passing
      reason: formData.reason,
      applications: [{
        application_id: candidate.app_id || candidate.application_id || candidate.id,
        status: formData.status,
        obtained_marks: obtained,
        subjects: Object.entries(formData.marks).map(([name, m]) => ({
          subject_name: name.charAt(0).toUpperCase() + name.slice(1),
          max_marks: m.total,
          obtained_marks: m.obtained || 0
        }))
      }]
    };

    try {
      await ResultsApi.saveMarks(payload);
      toast.success('Marks saved successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to save marks');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !candidate) return null;

  const totals = calculateTotal();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-xl">
                <Edit3 size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight leading-none">
                  {isEdit ? 'Correct Exam Marks' : 'Manual Mark Entry'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Candidate: {candidate.full_name} • Ref: {candidate.application_number} • Roll: {candidate.roll_no || 'N/A'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            
            {/* Meta Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-500" /> Exam Date
                </label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none"
                  value={formData.exam_date}
                  onChange={e => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building size={14} className="text-indigo-500" /> Exam Center
                </label>
                <div className="w-full">
                  <SearchableSelect
                    value={formData.exam_center}
                    onChange={e => setFormData(prev => ({ ...prev, exam_center: e.target.value }))}
                    options={[
                      { value: 'Muzaffarabad', label: 'Muzaffarabad Main Center' },
                      { value: 'Mirpur', label: 'Mirpur District Center' },
                      { value: 'Rawalakot', label: 'Rawalakot Center' },
                    ]}
                    placeholder="Select Center..."
                  />
                </div>
              </div>
            </div>

            {/* Hierarchical Marks */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Calculator size={16} className="text-indigo-500" /> Mark Breakdown
                </h4>
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                  Total Percentage: {totals.percentage}%
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(formData.marks).map(([section, m]) => (
                  <div key={section} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{section}</span>
                      <span className="text-xs font-black text-slate-900">Maximum Marks: {m.total}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <input 
                          type="number"
                          placeholder="0"
                          className="w-24 px-4 py-2 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-center font-black text-slate-900 transition-all outline-none"
                          value={m.obtained}
                          onChange={e => handleMarkChange(section, 'obtained', e.target.value)}
                        />
                        <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          Obtained
                        </span>
                      </div>
                      <div className="text-slate-300 font-black">/</div>
                      <div className="w-20 px-4 py-2 bg-slate-100 border-2 border-transparent rounded-xl text-center font-black text-slate-400">
                        {m.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Reason */}
            {isEdit && (
              <div className="space-y-3 bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100">
                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <History size={14} /> Reason for Correction (Audit Requirement)
                </label>
                <textarea 
                  rows={2}
                  placeholder="Explain why these marks are being corrected..."
                  className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-amber-500 rounded-2xl text-sm font-medium transition-all outline-none resize-none shadow-inner"
                  value={formData.reason}
                  onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            )}

          </div>

          {/* Action Footer */}
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cumulative Total</span>
                <span className="text-xl font-black text-slate-900">{totals.obtained} <span className="text-slate-300 text-sm">/ {totals.total}</span></span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="px-8 h-12 rounded-2xl font-black text-xs uppercase tracking-widest border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={loading}
                className="px-10 h-12 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 hover:bg-indigo-600 text-white shadow-lg shadow-slate-200 flex items-center gap-2"
              >
                {loading ? 'Saving...' : (isEdit ? 'Update Marks' : 'Save Results')}
                {!loading && <Save size={16} />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MarkEntryModal;
