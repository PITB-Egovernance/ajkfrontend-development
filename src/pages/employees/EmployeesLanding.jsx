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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import ExcelUploadZone from 'components/employees/ExcelUploadZone';

const TEMPLATE_HEADERS = ['Full Name', 'CNIC', 'Email', 'Mobile Number', 'Designation', 'Scale'];

const EmployeesLanding = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);

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
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success(
        `"${selectedFile.name}" received. Bulk import will be processed once the import API is integrated.`
      );
      setSelectedFile(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
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
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download size={16} className="mr-2" />
              Download Employee Template
            </Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard/employees/list')}>
              <ListChecks size={16} className="mr-2" />
              View All Employees
            </Button>
          </div>
        </div>

        {/* Registration Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Import Excel */}
          <Card>
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

              <ExcelUploadZone onFileSelect={setSelectedFile} loading={importing} />

              <Button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className="w-full"
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </CardContent>
          </Card>

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
