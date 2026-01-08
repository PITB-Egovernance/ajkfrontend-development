import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { StickyNote, Plus, X, Save, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { TextField } from '@mui/material';
import { Card, CardHeader, CardTitle, CardContent } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const AddNotes = () => {
  const [loading, setLoading] = useState(false);
  const [advertisementNotes, setAdvertisementNotes] = useState({
    important_notes: '',
    terms_conditions: ['']
  });

  const fetchAdvertisementNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${Config.apiUrl}/advertisement/notes`, {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
      });

      const result = await response.json();
      if (response.ok) {
        setAdvertisementNotes({
          important_notes: result.important_notes || '',
          terms_conditions: result.terms_conditions?.length ? result.terms_conditions : [''],
        });
      }
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvertisementNotes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const terms = advertisementNotes.terms_conditions.filter(t => t.trim());
    if (!advertisementNotes.important_notes || terms.length === 0) {
      toast.error('All fields are required');
      return;
    }

    const toastId = toast.loading('Saving...');
    try {
      const response = await fetch(`${Config.apiUrl}/advertisement/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
        body: JSON.stringify({
          important_notes: advertisementNotes.important_notes,
          terms_conditions: terms,
        }),
      });

      if (response.ok) {
        toast.success('Notes saved successfully', { id: toastId });
        fetchAdvertisementNotes();
      } else {
        toast.error('Failed to save notes', { id: toastId });
      }
    } catch {
      toast.error('Error saving notes', { id: toastId });
    }
  };

  const updateTerm = (index, value) => {
    const terms = [...advertisementNotes.terms_conditions];
    terms[index] = value;
    setAdvertisementNotes({ ...advertisementNotes, terms_conditions: terms });
  };

  const addTerm = () => {
    setAdvertisementNotes({
      ...advertisementNotes,
      terms_conditions: [...advertisementNotes.terms_conditions, ''],
    });
  };

  const removeTerm = (index) => {
    const terms = advertisementNotes.terms_conditions.filter((_, i) => i !== index);
    setAdvertisementNotes({
      ...advertisementNotes,
      terms_conditions: terms.length ? terms : [''],
    });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <StickyNote className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Advertisement Notes</h1>
              <p className="text-slate-600 mt-1">Manage important notes and terms & conditions</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Important Notes</p>
                    <p className="text-3xl font-bold text-amber-600">
                      {advertisementNotes.important_notes ? '1' : '0'}
                    </p>
                  </div>
                  <FileText className="w-12 h-12 text-amber-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Terms & Conditions</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {advertisementNotes.terms_conditions.filter(t => t.trim()).length}
                    </p>
                  </div>
                  <CheckCircle2 className="w-12 h-12 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-amber-200 shadow-xl">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Advertisement Information
              </h2>
            </div>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Important Notes */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Important Notes</h3>
                    </div>
                    <TextField
                      fullWidth
                      label="Important Notes"
                      multiline
                      rows={5}
                      value={advertisementNotes.important_notes}
                      onChange={(e) =>
                        setAdvertisementNotes({
                          ...advertisementNotes,
                          important_notes: e.target.value,
                        })
                      }
                      placeholder="Enter important notes that will appear in the advertisement..."
                      required
                      helperText="These notes will be displayed prominently in the advertisement"
                    />
                  </div>
                </motion.div>

                {/* Terms & Conditions */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Terms & Conditions</h3>
                      </div>
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={addTerm}
                        className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Term
                      </Button>
                    </div>

                    <AnimatePresence mode="popLayout">
                      <div className="space-y-4">
                        {advertisementNotes.terms_conditions.map((term, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="relative"
                          >
                            <div className="flex gap-3 items-start">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center font-bold text-sm shadow-lg mt-2">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <TextField
                                  fullWidth
                                  label={`Term ${index + 1}`}
                                  multiline
                                  rows={3}
                                  value={term}
                                  onChange={(e) => updateTerm(index, e.target.value)}
                                  placeholder={`Enter term and condition ${index + 1}...`}
                                  required
                                />
                              </div>
                              {advertisementNotes.terms_conditions.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeTerm(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="border-t border-slate-200 pt-6"
                >
                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Notes
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setAdvertisementNotes({ important_notes: '', terms_conditions: [''] })
                      }
                      className="hover:bg-slate-100"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AddNotes;
