import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  X,
  Save,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { TextField } from '@mui/material';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const AddNotes = () => {
  const [loading, setLoading] = useState(false);
  const [advertisementNotes, setAdvertisementNotes] = useState({
    important_notes: '',
    terms_conditions: [''],
  });

  const fetchAdvertisementNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${Config.apiUrl}/advertisements/notes`, {
        headers: {
          Authorization: `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setAdvertisementNotes({
          important_notes: result.important_notes || '',
          terms_conditions:
            result.terms_conditions?.length > 0
              ? result.terms_conditions
              : [''],
        });
      } else {
        toast.error('Failed to load notes', { duration: 3000 });
      }
    } catch {
      toast.error('Failed to load notes', { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvertisementNotes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const terms = advertisementNotes.terms_conditions.filter(
      (t) => t.trim().length > 0
    );

    if (!advertisementNotes.important_notes.trim() || terms.length === 0) {
      toast.error('Important notes and at least one term are required', {
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Saving...', { duration: 3000 });

    try {
      const response = await fetch(`${Config.apiUrl}/advertisements/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
        body: JSON.stringify({
          important_notes: advertisementNotes.important_notes.trim(),
          terms_conditions: terms,
        }),
      });

      if (response.ok) {
        toast.success('Notes saved successfully', {
          id: toastId,
          duration: 3000,
        });
        fetchAdvertisementNotes();
      } else {
        toast.error('Failed to save notes', {
          id: toastId,
          duration: 3000,
        });
      }
    } catch {
      toast.error('Error saving notes', {
        id: toastId,
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTerm = (index, value) => {
    const updated = [...advertisementNotes.terms_conditions];
    updated[index] = value;
    setAdvertisementNotes({ ...advertisementNotes, terms_conditions: updated });
  };

  const addTerm = () => {
    setAdvertisementNotes({
      ...advertisementNotes,
      terms_conditions: [...advertisementNotes.terms_conditions, ''],
    });
  };

  const removeTerm = (index) => {
    const filtered = advertisementNotes.terms_conditions.filter(
      (_, i) => i !== index
    );
    setAdvertisementNotes({
      ...advertisementNotes,
      terms_conditions: filtered.length ? filtered : [''],
    });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Advertisement Notes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage important notes and terms & conditions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 flex justify-between">
            <div>
              <p className="text-sm text-slate-600">Important Notes</p>
              <p className="text-3xl font-bold text-emerald-600">
                {advertisementNotes.important_notes ? 1 : 0}
              </p>
            </div>
            <FileText className="w-10 h-10 text-emerald-400" />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 flex justify-between">
            <div>
              <p className="text-sm text-slate-600">Terms & Conditions</p>
              <p className="text-3xl font-bold text-emerald-600">
                {
                  advertisementNotes.terms_conditions.filter((t) => t.trim())
                    .length
                }
              </p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="bg-emerald-950 px-6 py-4 rounded-t-lg">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Advertisement Information
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Important Notes */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold">Important Notes</h3>
              </div>
              <TextField
                fullWidth
                multiline
                rows={5}
                label="Important Notes"
                value={advertisementNotes.important_notes}
                onChange={(e) =>
                  setAdvertisementNotes({
                    ...advertisementNotes,
                    important_notes: e.target.value,
                  })
                }
              />
            </div>

            {/* Terms */}
            <div className="border-t pt-6">
              <div className="flex justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Terms & Conditions
                </h3>
                <button
                  type="button"
                  onClick={addTerm}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-900 text-white rounded-lg"
                >
                  <Plus size={16} /> Add Term
                </button>
              </div>

              <AnimatePresence>
                {advertisementNotes.terms_conditions.map((term, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3 mb-4"
                  >
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label={`Term ${index + 1}`}
                      value={term}
                      onChange={(e) => updateTerm(index, e.target.value)}
                    />
                    {advertisementNotes.terms_conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTerm(index)}
                        className="text-red-600 mt-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="border-t pt-6 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-900 text-white py-3 rounded-lg flex justify-center items-center gap-2"
              >
                {loading ? 'Saving...' : <><Save size={16} /> Save Notes</>}
              </button>

              <button
                type="button"
                onClick={() =>
                  setAdvertisementNotes({
                    important_notes: '',
                    terms_conditions: [''],
                  })
                }
                className="border px-6 py-3 rounded-lg"
              >
                <X size={16} /> Clear
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddNotes;
