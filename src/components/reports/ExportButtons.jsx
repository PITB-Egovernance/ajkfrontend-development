import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';

// Reusable export controls — UI only, no backend wired up yet. Simulates a
// short export delay and confirms via toast so the flow feels complete.
const ExportButtons = ({ showPdf = false, showExcel = true, onExportExcel, onExportPdf, disabled = false }) => {
  const [busy, setBusy] = useState('');

  const run = async (kind, cb) => {
    setBusy(kind);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setBusy('');
    toast.success(`${kind === 'pdf' ? 'PDF' : 'Excel'} export will be available once the backend API is integrated.`);
    cb?.();
  };

  return (
    <div className="flex items-center gap-2">
      {showPdf && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled || !!busy}
          onClick={() => run('pdf', onExportPdf)}
        >
          {busy === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
          Export PDF
        </Button>
      )}
      {showExcel && (
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5"
          disabled={disabled || !!busy}
          onClick={() => run('excel', onExportExcel)}
        >
          {busy === 'excel' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
          Export Excel
        </Button>
      )}
    </div>
  );
};

export default ExportButtons;
