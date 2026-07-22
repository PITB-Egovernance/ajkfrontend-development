import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  Download,
  UploadCloud,
  UserPlus,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import ExcelUploadZone from 'components/employees/ExcelUploadZone';
import EmployeeService from 'services/EmployeeService';

// These must match the backend column names exactly
const TEMPLATE_HEADERS = [
    'username',
    'cnic',
    'email',
    'mobile',
    'designation',
    'grade'
];

const EmployeesLanding = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importResult, setImportResult] = useState(null); // { message, imported, failed, rowErrors }

  const handleDownloadTemplate = () => {
    const csvContent = TEMPLATE_HEADERS.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Employee_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Employee template downloaded');
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }
    setImporting(true);
    setImportErrors([]);
    setImportResult(null);
    try {
      const result = await EmployeeService.importUsers(selectedFile);
      const imported  = result._imported  ?? 0;
      const failed    = result._failed    ?? 0;
      const failures  = result._failures  ?? [];
      const totalRows = result._totalRows ?? imported + failed;
      const msg       = result?.message   || 'Import processed';

      if (imported > 0 && failed === 0) {
        toast.success(msg);
      } else if (imported > 0 && failed > 0) {
        toast(`${imported} imported, ${failed} failed`, { icon: '⚠️' });
      } else {
        toast.error(`Import failed — ${failed} row${failed !== 1 ? 's' : ''} could not be imported`);
      }

      setImportResult({ message: msg, imported, failed, totalRows, failures });
      setSelectedFile(null);
    } catch (error) {
      toast.error(error.message || 'Import failed');
      const lines = error.errorLines?.length
        ? error.errorLines
        : [error.message || 'An unexpected error occurred. Check your file and try again.'];
      setImportErrors(lines);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard/employees/list')}
          className="text-sm text-gray-600 flex items-center hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Employees
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-2xl flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
              <p className="text-sm text-slate-500 mt-1">Register employees individually or import them in bulk</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download size={16} className="mr-2" />
              Download Employee Template
            </Button> */}
            <Button variant="secondary" onClick={() => navigate('/dashboard/employees/list')}>
              <ListChecks size={16} className="mr-2" />
              View All Employees
            </Button>
          </div>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                  <UploadCloud size={20} />
                </div>
                Import Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-slate-500">
                Register employees in bulk by uploading a completed Excel sheet.
              </p>

              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  Download the employee template
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  Fill in employee information in the specified format
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  Upload the completed file and click Import
                </li>
              </ol>

              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download size={14} className="mr-2" />
                Download Employee Template
              </Button>

              <ExcelUploadZone onFileSelect={(f) => { setSelectedFile(f); setImportErrors([]); setImportResult(null); }} loading={importing} />

             
              {importResult && (() => {
                const allOk = importResult.imported > 0 && importResult.failed === 0;
                const partial = importResult.imported > 0 && importResult.failed > 0;
                const allFailed = importResult.imported === 0 && importResult.failed > 0;

                return (
                  <div className={`rounded-lg border p-4 space-y-3 ${
                    allOk    ? 'bg-emerald-50 border-emerald-200' :
                    partial  ? 'bg-amber-50 border-amber-200'     :
                               'bg-red-50 border-red-200'
                  }`}>
                   
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {allOk
                          ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          : <AlertCircle  size={16} className={`shrink-0 ${partial ? 'text-amber-600' : 'text-red-600'}`} />
                        }
                        <p className={`text-sm font-semibold ${allOk ? 'text-emerald-800' : partial ? 'text-amber-800' : 'text-red-800'}`}>
                          {importResult.message}
                        </p>
                      </div>
                      <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    </div>

                   
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                        Total rows: {importResult.totalRows}
                      </span>
                      {importResult.imported > 0 && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                          ✓ {importResult.imported} imported
                        </span>
                      )}
                      {importResult.failed > 0 && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full">
                          ✗ {importResult.failed} failed
                        </span>
                      )}
                    </div>

                   
                    {importResult.failures?.length > 0 && (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Failed rows</p>
                        {importResult.failures.map((f, i) => (
                          <div key={i} className="bg-white border border-red-100 rounded-lg p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-red-700">Row {f.row} — {f.data?.username || '—'}</span>
                              <span className="text-xs text-slate-400">CNIC: {f.data?.cnic || '—'}</span>
                            </div>
                            <ul className="space-y-0.5">
                              {(f.errors || []).map((err, j) => (
                                <li key={j} className="text-xs text-red-600">• {err}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {(allOk || partial) && (
                      <button
                        onClick={() => navigate('/dashboard/employees/list')}
                        className={`text-xs font-semibold underline underline-offset-2 ${allOk ? 'text-emerald-700 hover:text-emerald-900' : 'text-amber-700 hover:text-amber-900'}`}
                      >
                        View Employee List →
                      </button>
                    )}
                  </div>
                );
              })()}

            
              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-600 shrink-0" />
                      <p className="text-sm font-semibold text-red-700">Import failed</p>
                    </div>
                    <button onClick={() => setImportErrors([])} className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                  <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {importErrors.map((line, i) => (
                      <li key={i} className="text-xs text-red-700 font-mono leading-relaxed">{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className="w-full"
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </CardContent>
          </Card> */}

          {/* Card 2: Manual Registration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                  <UserPlus size={20} />
                </div>
                Manual Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-slate-500">
                Register a single employee by filling out their personal information.
              </p>

              <ul className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Full Name</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> CNIC</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Email Address</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Father/Husband Name</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Date of Birth</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Gender</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Mobile Number</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Domicile District</li>
              </ul>

              <div className="pt-2">
                <Button onClick={() => navigate('/dashboard/employees/create')} className="w-full">
                  <UserPlus size={16} className="mr-2" />
                  Register Employee
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmployeesLanding;
