import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';

// Reusable export controls. When a page passes onExportExcel/onExportPdf,
// that handler is awaited directly and owns its own success/error toast
// (see reportsApi.js's downloadFile()). Pages that don't pass a handler yet
// fall back to a placeholder toast so the button still communicates intent.
const ExportButtons = ({
  showPdf = false,
  showExcel = true,
  pdfLabel = 'Export PDF',
  excelLabel = 'Export Excel',
  onExportExcel,
  onExportPdf,
  disabled = false,
}) => {
  const [busy, setBusy] = useState('');

  const run = async (kind, cb) => {
    setBusy(kind);
    try {
      if (cb) {
        await cb();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        toast.success(`${kind === 'pdf' ? 'PDF' : 'Excel'} export will be available once the backend API is integrated.`);
      }
    } catch (err) {
      toast.error(err?.message || `Failed to export ${kind === 'pdf' ? 'PDF' : 'Excel'}.`);
    } finally {
      setBusy('');
    }
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
          {pdfLabel}
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
          {excelLabel}
        </Button>
      )}
    </div>
  );
};

export default ExportButtons;
