import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { TextField, MenuItem, IconButton, Switch, FormControlLabel } from '@mui/material';
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import useDebounce from 'hooks/useDebounce';
import { validateMarkEntry } from 'schemas/resultsFormSchema';
import toast from 'react-hot-toast';

/**
 * MarkEntryPage
 * Handles manual entry of candidate results in both summary and detailed modes
 */

const MarkEntryPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDetailed, setIsDetailed] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState(null);
  const [searchingCandidate, setSearchingCandidate] = useState(false);
  
  const [summaryData, setSummaryData] = useState({
    roll_number: '',
    total_max_marks: 100,
    passing_marks: 40,
    obtained_marks: '',
    status: 'pass'
  });

  const [subjects, setSubjects] = useState([{ subject_name: '', max_marks: 100, obtained_marks: '' }]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchJobs = async () => {
      setFetchingJobs(true);
      try {
        const res = await AdvertisementApi.getAll(1);
        setJobs(res.data?.data || res.data || []);
      } catch (err) {
        toast.error('Failed to load job posts');
      } finally {
        setFetchingJobs(false);
      }
    };
    fetchJobs();
  }, []);

  // Auto-lookup candidate when roll number changes
  useEffect(() => {
    const lookupCandidate = async () => {
      if (summaryData.roll_number.length >= 3 && selectedJob) {
        setSearchingCandidate(true);
        try {
          // Find the real integer ID for the job for the search request
          const jobObj = jobs.flatMap(a => a.job_details || a.jobDetails || []).find(j => (j.hash_id || j.id) === selectedJob);
          const realJobId = jobObj?.id || selectedJob;

          const res = await ResultsApi.searchResults({ 
            job_post_id: realJobId, 
            roll_number: summaryData.roll_number 
          });
          const candidate = res.data?.application || res.data?.data?.[0]?.application || res.data?.[0]?.application;
          if (candidate) {
            setCandidateInfo(candidate);
          } else {
            setCandidateInfo(null);
          }
        } catch (err) {
          setCandidateInfo(null);
        } finally {
          setSearchingCandidate(false);
        }
      }
    };

    const timer = setTimeout(lookupCandidate, 1000);
    return () => clearTimeout(timer);
  }, [summaryData.roll_number, selectedJob]);

  // Sync total marks when subjects change in detailed mode
  useEffect(() => {
    if (isDetailed) {
      const totalObtained = subjects.reduce((sum, s) => sum + (Number(s.obtained_marks) || 0), 0);
      const totalMax = subjects.reduce((sum, s) => sum + (Number(s.max_marks) || 0), 0);
      
      setSummaryData(prev => ({ 
        ...prev, 
        obtained_marks: totalObtained,
        total_max_marks: totalMax
      }));
    }
  }, [subjects, isDetailed]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSummaryData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubjectChange = (index, field, value) => {
    const newSubjects = [...subjects];
    newSubjects[index][field] = value;
    setSubjects(newSubjects);
  };

  const addSubject = () => {
    setSubjects(prev => [...prev, { subject_name: '', max_marks: 100, obtained_marks: '' }]);
  };

  const removeSubject = (index) => {
    if (subjects.length === 1) return;
    setSubjects(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations for UI feedback
  const percentage = summaryData.total_max_marks > 0 
    ? ((Number(summaryData.obtained_marks) / Number(summaryData.total_max_marks)) * 100).toFixed(2)
    : 0;
  const isPass = Number(summaryData.obtained_marks) >= Number(summaryData.passing_marks);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!selectedJob || !examDate) {
      toast.error('Please select a job and exam date');
      return;
    }

    if (!candidateInfo) {
      toast.error('Candidate not found. Please verify the Roll Number.');
      return;
    }

    setLoading(true);
    try {
      // Find the real integer ID for the job if it's currently a hash
      const jobObj = jobs.flatMap(a => a.job_details || a.jobDetails || []).find(j => (j.hash_id || j.id) === selectedJob);
      const realJobId = jobObj?.id || selectedJob;

      const payload = {
        job_post_id: realJobId,
        exam_date: examDate,
        result_type: isDetailed ? 'detailed' : 'summary',
        total_max_marks: Number(summaryData.total_max_marks),
        passing_marks: Number(summaryData.passing_marks),
        applications: [
          {
            application_id: candidateInfo.id,
            status: summaryData.status,
            obtained_marks: Number(summaryData.obtained_marks),
            subjects: isDetailed ? subjects : []
          }
        ]
      };
      
      await ResultsApi.submitMarks(payload);
      toast.success('Result saved successfully!');
      
      setSummaryData(prev => ({ ...prev, roll_number: '', obtained_marks: '' }));
      setCandidateInfo(null);
      setSubjects([{ subject_name: '', max_marks: 100, obtained_marks: '' }]);
    } catch (err) {
      if (err.status === 422 && err.errors) {
        const backendErrors = {};
        Object.keys(err.errors).forEach(key => {
          backendErrors[key] = Array.isArray(err.errors[key]) ? err.errors[key][0] : err.errors[key];
        });
        setErrors(backendErrors);
        toast.error('Validation failed. Please review the highlighted fields.');
      } else if (err.status === 409) {
        toast.error('Conflict: This record has been modified by another officer. Please refresh.', { duration: 5000 });
      } else {
        toast.error(err.message || 'Failed to submit marks');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-600 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manual Mark Entry</h1>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">Data Entry Dashboard</p>
            </div>
          </div>
          <Button 
            variant="primary" 
            onClick={handleSave} 
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 px-8 py-3 h-auto font-black text-sm uppercase tracking-widest"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Save size={18} className="mr-2" />
            )}
            {loading ? 'Processing...' : 'Save Result'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Main Form Card */}
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <div className="bg-slate-900 p-8 text-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <TextField
                  select
                  label="Select Job Requisition"
                  fullWidth
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  error={!!errors.job_post_id}
                  helperText={errors.job_post_id}
                  variant="filled"
                  sx={{ 
                    '& .MuiFilledInput-root': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                    '& .MuiSelect-icon': { color: 'white' }
                  }}
                >
                  <MenuItem value="">Choose Job Post...</MenuItem>
                  {fetchingJobs ? (
                    <MenuItem disabled>Loading job posts...</MenuItem>
                  ) : jobs.length === 0 ? (
                    <MenuItem disabled>No job posts available for results entry</MenuItem>
                  ) : (
                    jobs.flatMap(adv => 
                      (adv.job_details || adv.jobDetails || []).map(job => (
                        <MenuItem key={job.hash_id || job.id} value={job.hash_id || job.id}>
                          {job.designation} (Adv: {adv.adv_number})
                        </MenuItem>
                      ))
                    )
                  )}
                </TextField>
                  <TextField
                    type="date"
                    label="Exam Date"
                    fullWidth
                    name="exam_date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    variant="filled"
                    InputLabelProps={{ shrink: true }}
                    sx={{ 
                      '& .MuiFilledInput-root': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }
                    }}
                  />
              </div>
            </div>

            <CardContent className="p-10 space-y-10">
              {/* Toggle and Stats */}
              <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner gap-6">
                <FormControlLabel
                  control={
                    <Switch 
                      checked={isDetailed} 
                      onChange={(e) => setIsDetailed(e.target.checked)} 
                      color="success"
                    />
                  }
                  label={
                    <div className="ml-2">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Detailed Mode</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Enter marks per subject</p>
                    </div>
                  }
                />
                
                <div className="flex items-center gap-8 border-l border-slate-200 pl-8">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated</p>
                    <p className={`text-3xl font-black tabular-nums ${Number(percentage) >= 40 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {percentage}%
                    </p>
                  </div>
                  <div className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg ${
                    isPass ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-red-500 text-white shadow-red-100'
                  }`}>
                    {isPass ? 'Pass' : 'Fail'}
                  </div>
                </div>
              </div>

              {/* Candidate Info */}
              <div className="space-y-8">
                <TextField
                  label="Candidate Roll Number"
                  fullWidth
                  name="roll_number"
                  value={summaryData.roll_number}
                  onChange={handleChange}
                  placeholder="Enter 5-8 digit roll number"
                  variant="outlined"
                  error={!!errors.roll_number}
                  helperText={errors.roll_number}
                  InputProps={{
                    sx: { borderRadius: '16px', fontWeight: 'bold' },
                    endAdornment: searchingCandidate && (
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    )
                  }}
                />
                
                {candidateInfo && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-left-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <p className="text-xs font-bold text-emerald-800">
                      Validated: <span className="uppercase">{candidateInfo.full_name || candidateInfo.candidate_name}</span>
                    </p>
                  </div>
                )}

                {!isDetailed ? (
                  /* Summary Mode */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    <TextField
                      label="Total Max Marks"
                      type="number"
                      name="total_max_marks"
                      value={summaryData.total_max_marks}
                      onChange={handleChange}
                      error={!!errors.total_max_marks}
                      helperText={errors.total_max_marks}
                      InputProps={{ sx: { borderRadius: '16px' } }}
                    />
                    <TextField
                      label="Passing Marks"
                      type="number"
                      name="passing_marks"
                      value={summaryData.passing_marks}
                      onChange={handleChange}
                      error={!!errors.passing_marks}
                      helperText={errors.passing_marks}
                      InputProps={{ sx: { borderRadius: '16px' } }}
                    />
                    <TextField
                      label="Obtained Marks"
                      type="number"
                      name="obtained_marks"
                      value={summaryData.obtained_marks}
                      onChange={handleChange}
                      error={!!errors.obtained_marks}
                      helperText={errors.obtained_marks}
                      autoFocus
                      InputProps={{ 
                        sx: { borderRadius: '16px', backgroundColor: 'rgba(16, 185, 129, 0.05)', fontWeight: 'black' } 
                      }}
                    />
                  </div>
                ) : (
                  /* Detailed Mode */
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Subject-wise Breakdown</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={addSubject} 
                        className="text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 font-bold px-4 py-1 h-auto rounded-full text-[10px] uppercase"
                      >
                        <Plus size={14} className="mr-1" /> Add Subject
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {subjects.map((subject, idx) => (
                        <div key={idx} className="flex gap-4 items-end group">
                          <TextField
                            label="Subject Name"
                            className="flex-[2]"
                            value={subject.subject_name}
                            onChange={(e) => handleSubjectChange(idx, 'subject_name', e.target.value)}
                            placeholder="Ex: General Knowledge"
                            InputProps={{ sx: { borderRadius: '16px' } }}
                          />
                          <TextField
                            label="Max"
                            type="number"
                            className="flex-1"
                            value={subject.max_marks}
                            onChange={(e) => handleSubjectChange(idx, 'max_marks', e.target.value)}
                            InputProps={{ sx: { borderRadius: '16px' } }}
                          />
                          <TextField
                            label="Obtained"
                            type="number"
                            className="flex-1"
                            value={subject.obtained_marks}
                            onChange={(e) => handleSubjectChange(idx, 'obtained_marks', e.target.value)}
                            InputProps={{ 
                              sx: { borderRadius: '16px', backgroundColor: 'rgba(16, 185, 129, 0.03)', fontWeight: 'bold' } 
                            }}
                          />
                          <IconButton 
                            onClick={() => removeSubject(idx)} 
                            disabled={subjects.length === 1}
                            className="mb-1 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </div>
                      ))}
                    </div>

                    {/* Summary Footer for Detailed Mode */}
                    <div className="mt-10 grid grid-cols-2 gap-8 p-8 bg-slate-50 rounded-[2.5rem] border-2 border-white shadow-inner">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Max</p>
                        <p className="text-3xl font-black text-slate-900 tabular-nums">{summaryData.total_max_marks}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Aggregate Obtained</p>
                        <p className="text-3xl font-black text-emerald-600 tabular-nums">{summaryData.obtained_marks}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarkEntryPage;
