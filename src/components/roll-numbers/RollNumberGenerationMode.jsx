import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import RollNumberApi from 'api/rollNumberApi';

// Both Auto and Custom show the same range preview before generating —
// "last generated roll number", the suggested/typed starting number, and
// the computed ending number — so generation is never silent (this refines
// the technical design's FR-01/FR-02 per a later clarification). Auto just
// confirms the system-suggested start; Custom lets the admin override it,
// re-fetching the preview on every change.
const RollNumberGenerationMode = ({ batch, onGenerate, generating = false }) => {
  const [mode, setMode] = useState('auto');
  const [startingNumber, setStartingNumber] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  const fetchPreview = async (customStart) => {
    setLoadingPreview(true);
    try {
      const res = await RollNumberApi.previewRange(batch.hash_id, customStart);
      const data = res?.data || {};
      setPreview(data);
      if (!customStart) setStartingNumber(String(data.starting_number ?? ''));
    } catch (e) {
      // Non-fatal — the admin can still generate with the system default;
      // the preview is a confirmation aid, not a hard requirement.
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => { fetchPreview(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [batch?.hash_id]);

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode === 'auto') fetchPreview();
  };

  const handleStartingNumberChange = (value) => {
    setStartingNumber(value);
    const parsed = parseInt(value, 10);
    if (parsed > 0) fetchPreview(parsed);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Roll Numbers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => handleModeChange('auto')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${mode === 'auto' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="font-semibold text-slate-900">Auto Generate</div>
            <div className="text-sm text-slate-500">Continue the sequence automatically.</div>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('custom')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${mode === 'custom' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="font-semibold text-slate-900">Custom Generate</div>
            <div className="text-sm text-slate-500">Choose your own starting roll number.</div>
          </button>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Last generated roll number</span>
            <span className="font-mono font-semibold text-slate-800">{preview?.last_generated_roll_number || '— none yet —'}</span>
          </div>

          {mode === 'custom' && (
            <div className="flex items-center justify-between pt-2">
              <label htmlFor="starting-number" className="text-slate-500">Starting number</label>
              <input
                id="starting-number"
                type="number"
                min="1"
                value={startingNumber}
                onChange={(e) => handleStartingNumberChange(e.target.value)}
                className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-right font-mono"
              />
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="text-slate-500">Will generate</span>
            <span className="font-mono font-semibold text-emerald-700">
              {loadingPreview ? 'Calculating…' : (preview ? `${preview.suggested_start_roll_number} → ${preview.suggested_end_roll_number}` : '—')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Candidates</span>
            <span className="font-semibold text-slate-800">{preview?.candidate_group_count ?? batch?.total ?? '—'}</span>
          </div>
        </div>

        <Button
          variant="primary"
          disabled={generating || loadingPreview || (mode === 'custom' && !startingNumber)}
          onClick={() => onGenerate(mode, mode === 'custom' ? parseInt(startingNumber, 10) : undefined)}
        >
          {generating ? 'Generating…' : 'Generate Roll Numbers'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RollNumberGenerationMode;
