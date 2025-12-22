import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  StickyNote, 
  FileText, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Plus,
  X,
  Search
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';

const AddNotes = () => {
  const [activeTab, setActiveTab] = useState('advertisement');
  const [loading, setLoading] = useState(false);
  const [advertisementNotes, setAdvertisementNotes] = useState({
    important_notes: '',
    terms_conditions: ['']
  });
  const [jobNote, setJobNote] = useState({
    job_id: '',
    note: ''
  });
  const [searchJobId, setSearchJobId] = useState('');

  // Fetch Advertisement Notes
  const fetchAdvertisementNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${Config.apiUrl}/advertisement/notes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        setAdvertisementNotes({
          important_notes: result.important_notes || '',
          terms_conditions: result.terms_conditions || ['']
        });
        toast.success('Advertisement notes loaded');
      } else {
        // Backend might not have this endpoint yet
        toast.error('Advertisement notes feature coming soon');
        setAdvertisementNotes({
          important_notes: 'Advertisement notes feature is currently under development.',
          terms_conditions: []
        });
      }
    } catch (error) {
      toast.error('Unable to load notes at this time');
      setAdvertisementNotes({
        important_notes: 'Advertisement notes feature is currently under development.',
        terms_conditions: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'advertisement') {
      fetchAdvertisementNotes();
    }
  }, [activeTab]);

  // Update Job Note
  const handleUpdateJobNote = async (e) => {
    e.preventDefault();
    
    if (!jobNote.job_id || !jobNote.note) {
      toast.error('Please enter both Job ID and Note');
      return;
    }

    const loadingToast = toast.loading('Updating note...');
    
    try {
      const response = await fetch(`${Config.apiUrl}/job/note/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
        body: JSON.stringify({
          job_id: parseInt(jobNote.job_id),
          note: jobNote.note
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success(result.success, { id: loadingToast });
        setJobNote({ job_id: '', note: '' });
      } else {
        toast.error(result.message || 'Failed to update note', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error updating note', { id: loadingToast });
    }
  };

  // Add new term condition field
  const addTermCondition = () => {
    setAdvertisementNotes({
      ...advertisementNotes,
      terms_conditions: [...advertisementNotes.terms_conditions, '']
    });
  };

  // Remove term condition field
  const removeTermCondition = (index) => {
    const newTerms = advertisementNotes.terms_conditions.filter((_, i) => i !== index);
    setAdvertisementNotes({
      ...advertisementNotes,
      terms_conditions: newTerms.length > 0 ? newTerms : ['']
    });
  };

  // Update term condition
  const updateTermCondition = (index, value) => {
    const newTerms = [...advertisementNotes.terms_conditions];
    newTerms[index] = value;
    setAdvertisementNotes({
      ...advertisementNotes,
      terms_conditions: newTerms
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl shadow-lg">
              <StickyNote className="w-7 h-7 text-white" />
            </div>
            Add Notes
          </h1>
          <p className="text-slate-500 mt-2">
            Manage advertisement notes and job-specific notes
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('advertisement')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'advertisement'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" />
                Advertisement Notes
              </div>
            </button>
            <button
              onClick={() => setActiveTab('job')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'job'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <StickyNote className="w-5 h-5" />
                Job Notes
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Advertisement Notes Tab */}
      {activeTab === 'advertisement' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Important Notes Section */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-600" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-slate-700 leading-relaxed">
                    {advertisementNotes.important_notes || 'No important notes available'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terms & Conditions Section */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-emerald-600" />
                  Terms & Conditions
                </CardTitle>
                <Button
                  onClick={fetchAdvertisementNotes}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-200 rounded-lg"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {advertisementNotes.terms_conditions.map((term, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-semibold text-sm mt-1">
                        {index + 1}
                      </div>
                      <p className="flex-1 text-slate-700 leading-relaxed pt-1">
                        {term}
                      </p>
                    </div>
                  ))}
                  {advertisementNotes.terms_conditions.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No terms and conditions available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Job Notes Tab */}
      {activeTab === 'job' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-emerald-600" />
                Update Job Note
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateJobNote} className="space-y-6">
                {/* Job ID Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Job ID *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="number"
                      value={jobNote.job_id}
                      onChange={(e) => setJobNote({ ...jobNote, job_id: e.target.value })}
                      placeholder="Enter Job ID (e.g., 127)"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Enter the unique job ID to attach a note
                  </p>
                </div>

                {/* Note Textarea */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Note *
                  </label>
                  <textarea
                    value={jobNote.note}
                    onChange={(e) => setJobNote({ ...jobNote, note: e.target.value })}
                    placeholder="Enter your note here... (e.g., This post is reserved for female candidates only)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    rows="6"
                    required
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    Add important information or special instructions for this job
                  </p>
                </div>

                {/* Example Note */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Example Note:</p>
                      <p className="text-sm text-blue-800 italic">
                        "This post is reserved for female candidates only"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    className="flex-1 gap-2 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900"
                  >
                    <Save className="w-5 h-5" />
                    Save Note
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setJobNote({ job_id: '', note: '' })}
                    className="px-6"
                  >
                    Clear
                  </Button>
                </div>
              </form>

              {/* Success Message */}
              {jobNote.job_id && jobNote.note && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900 mb-1">Ready to Submit</p>
                      <p className="text-sm text-green-800">
                        Job ID: <strong>{jobNote.job_id}</strong> | Note length: <strong>{jobNote.note.length}</strong> characters
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Quick Guide */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-600" />
                Quick Guide
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-slate-700 pt-0.5">Enter the Job ID you want to add a note to</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-slate-700 pt-0.5">Write your note with any important information or restrictions</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-slate-700 pt-0.5">Click "Save Note" to attach the note to the job posting</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default AddNotes;
