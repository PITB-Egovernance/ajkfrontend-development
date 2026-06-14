import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, X } from 'lucide-react';
import Button from 'components/ui/Button';

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

/**
 * Drag-and-drop file input for the Employee bulk import (Excel/CSV).
 */
const ExcelUploadZone = ({ onFileSelect, loading }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    const lower = file.name.toLowerCase();
    if (ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      alert('Please upload a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => fileInputRef.current.click();

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className={`relative p-8 border-2 border-dashed rounded-2xl transition-all duration-300 ${
        dragActive
          ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
          : selectedFile
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-slate-300 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/10'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      role="region"
      aria-label="Employee Excel file upload area"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleChange}
        aria-label="Select Excel file for employee import"
      />

      <div className="flex flex-col items-center justify-center text-center">
        {selectedFile ? (
          <>
            <div className="relative">
              <div className="p-4 bg-emerald-100 rounded-2xl mb-3 shadow-inner">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              </div>
              <button
                onClick={handleClear}
                className="absolute -top-1 -right-1 p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:shadow-md transition-all"
                disabled={loading}
              >
                <X size={14} />
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs">
              {selectedFile.name}
            </h3>

            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-medium text-slate-500 bg-slate-200/50 px-2.5 py-0.5 rounded-full">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={14} /> Ready to import
              </span>
            </div>

            {!loading && (
              <button
                onClick={onButtonClick}
                className="mt-4 text-xs text-slate-400 hover:text-emerald-600 font-bold underline underline-offset-4"
              >
                Change file
              </button>
            )}
          </>
        ) : (
          <>
            <div className={`p-4 rounded-2xl mb-4 transition-all shadow-sm ${dragActive ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-400'}`}>
              <Upload className={`w-8 h-8 ${dragActive ? 'animate-bounce' : ''}`} />
            </div>

            <h3 className="text-base font-bold text-slate-900">Upload Employee Excel File</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Drag and drop the completed template here, or click below to browse.
            </p>

            <Button
              variant="outline"
              className="mt-5 px-6 py-2 border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white font-bold transition-all shadow-sm"
              onClick={onButtonClick}
              disabled={loading}
            >
              Browse Files
            </Button>

            <p className="text-xs text-slate-400 mt-4 font-medium">
              Supported formats: .xlsx, .xls, .csv
            </p>
          </>
        )}

        {dragActive && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center bg-emerald-500/10 rounded-2xl pointer-events-none"
          >
            <p className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl animate-bounce">
              Drop file here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelUploadZone;
