import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { StickyNote, Plus, X, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';

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
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            Advertisement Notes
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Important Notes */}
            <div>
              <label className="block font-medium mb-2">Important Notes</label>
              <textarea
                value={advertisementNotes.important_notes}
                onChange={(e) =>
                  setAdvertisementNotes({
                    ...advertisementNotes,
                    important_notes: e.target.value,
                  })
                }
                rows="4"
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            {/* Terms & Conditions */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-medium">Terms & Conditions</label>
                <Button type="button" size="sm" onClick={addTerm}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              <div className="space-y-3">
                {advertisementNotes.terms_conditions.map((term, index) => (
                  <div key={index} className="flex gap-2">
                    <textarea
                      value={term}
                      onChange={(e) => updateTerm(index, e.target.value)}
                      rows="2"
                      className="flex-1 border rounded-lg p-3"
                      required
                    />
                    {advertisementNotes.terms_conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTerm(index)}
                        className="text-red-500"
                      >
                        <X />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Notes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setAdvertisementNotes({ important_notes: '', terms_conditions: [''] })
                }
              >
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddNotes;
