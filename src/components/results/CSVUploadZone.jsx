import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Button from 'components/ui/Button';

/**
 * CSVUploadZone Component
 * Specialized drag-and-drop file input for CSV result imports
 * 
 * @param {Object} props
 * @param {Function} props.onFileSelect - Callback when a file is chosen
 * @param {boolean} props.loading - Loading state
 */

const CSVUploadZone = ({ onFileSelect, onPreview, onCommit, loading }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
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
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    if (file.name.toLowerCase().endsWith('.csv')) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      alert("Please upload a valid CSV file (.csv)");
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div 
      className={`relative p-10 border-2 border-dashed rounded-2xl transition-all duration-300 ${
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
      aria-label="CSV file upload area"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
        aria-label="Select CSV file for results import"
      />

      <div className="flex flex-col items-center justify-center text-center">
        {selectedFile ? (
          <div className="w-full flex flex-col items-center">
            <div className="relative">
              <div className="p-5 bg-emerald-100 rounded-2xl mb-4 shadow-inner">
                <FileText className="w-10 h-10 text-emerald-600" />
              </div>
              <button 
                onClick={handleClear}
                className="absolute -top-1 -right-1 p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:shadow-md transition-all"
                disabled={loading}
              >
                <X size={14} />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 truncate max-w-sm">
              {selectedFile.name}
            </h3>
            
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-medium text-slate-500 bg-slate-200/50 px-2.5 py-0.5 rounded-full">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <CheckCircle2 size={16} /> Ready to import
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-xs">
              <Button
                variant="outline"
                className="flex-1 border-slate-200 text-slate-600 font-bold"
                onClick={() => onPreview(selectedFile)}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Preview (Dry Run)'}
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => onCommit(selectedFile)}
                disabled={loading}
              >
                {loading ? 'Importing...' : 'Commit'}
              </Button>
            </div>
            
            {!loading && (
              <button 
                onClick={onButtonClick}
                className="mt-6 text-sm text-slate-400 hover:text-emerald-600 font-bold underline underline-offset-4"
              >
                Change file
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`p-5 rounded-2xl mb-5 transition-all shadow-sm ${dragActive ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-400'}`}>
              <Upload className={`w-10 h-10 ${dragActive ? 'animate-bounce' : ''}`} />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900">Import Result Data</h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
              Drag and drop your result CSV file here or click the button below.
            </p>
            
            <Button
              variant="outline"
              className="mt-8 px-8 py-2.5 border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white font-bold transition-all shadow-sm"
              onClick={onButtonClick}
              disabled={loading}
            >
              Browse Files
            </Button>
            
            <p className="text-xs text-slate-400 mt-6 font-medium">
              Only .csv files are supported. Maximum size 10MB.
            </p>

            {dragActive && (
              <div 
                role="status" 
                aria-live="polite" 
                className="absolute inset-0 flex items-center justify-center bg-emerald-500/10 rounded-2xl pointer-events-none"
              >
                <p className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl animate-bounce">
                  Drop CSV file here
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CSVUploadZone;
