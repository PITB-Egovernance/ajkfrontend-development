import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { ArrowLeft, Save, Info, Calculator, CheckCircle2, UserX, Award } from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import { DataGridLoader } from 'components/ui/Loader';
import toast from 'react-hot-toast';

/**
 * AwardListPage
 * Provides an inline-editable grid for entering interview and academic scores
 */

const AwardListPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAwards = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await ResultsApi.getAwards(jobId);
      const data = response.data || response || [];
      
      const formattedRows = data.map(item => {
        const row = {
          id: item.hash_id || item.id,
          application_id: item.application?.hash_id || item.application?.id, // Ensure we have the application ID
          roll_number: item.application?.application_number || item.application?.roll_number || 'N/A',
          candidate_name: item.application?.candidate_name || 'N/A',
          marks_matric: Number(item.marks_matric) || 0,
          marks_intermediate: Number(item.marks_intermediate) || 0,
          marks_graduation: Number(item.marks_graduation) || 0,
          marks_masters: Number(item.marks_masters) || 0,
          marks_additional: Number(item.marks_additional) || 0,
          marks_bu_position: Number(item.marks_bu_position) || 0,
          marks_pak_kashmir: Number(item.marks_pak_kashmir) || 0,
          marks_islamic: Number(item.marks_islamic) || 0,
          marks_current_aff: Number(item.marks_current_aff) || 0,
        };
        
        row.grand_total = 
          row.marks_matric + row.marks_intermediate + row.marks_graduation + 
          row.marks_masters + row.marks_additional + row.marks_bu_position +
          row.marks_pak_kashmir + row.marks_islamic + row.marks_current_aff;
        
        return row;
      });

      setRows(formattedRows);
    } catch (err) {
      toast.error('Failed to load candidate award list');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  const handleProcessRowUpdate = (newRow) => {
    const total = Number(newRow.marks_matric) + 
                  Number(newRow.marks_intermediate) + 
                  Number(newRow.marks_graduation) + 
                  Number(newRow.marks_masters) +
                  Number(newRow.marks_additional) +
                  Number(newRow.marks_bu_position) +
                  Number(newRow.marks_pak_kashmir) +
                  Number(newRow.marks_islamic) +
                  Number(newRow.marks_current_aff);
    
    if (total > 100) {
      toast.error(`Error: Grand total for ${newRow.candidate_name} (${total}) exceeds limit!`);
      return rows.find(r => r.id === newRow.id);
    }

    const updatedRow = { ...newRow, grand_total: total };
    setRows(prev => prev.map(r => r.id === newRow.id ? updatedRow : r));
    return updatedRow;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ResultsApi.submitAwards({ 
        job_post_id: jobId, 
        awards: rows.map(r => ({
          application_id: r.application_id, // Fixed: use application_id
          marks_matric: r.marks_matric,
          marks_intermediate: r.marks_intermediate,
          marks_graduation: r.marks_graduation,
          marks_masters: r.marks_masters,
          marks_additional: r.marks_additional,
          marks_bu_position: r.marks_bu_position,
          marks_pak_kashmir: r.marks_pak_kashmir,
          marks_islamic: r.marks_islamic,
          marks_current_aff: r.marks_current_aff
        }))
      });
      toast.success('Award list committed successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save awards');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: 'roll_number', headerName: 'Roll No', width: 90, headerClassName: 'bg-slate-50 font-black' },
    { field: 'candidate_name', headerName: 'Candidate Name', width: 180, headerClassName: 'bg-slate-50 font-black' },
    
    // Academic Section
    { field: 'marks_matric', headerName: 'Matric', width: 80, editable: true, type: 'number', headerClassName: 'bg-blue-50 font-black' },
    { field: 'marks_intermediate', headerName: 'Inter', width: 80, editable: true, type: 'number', headerClassName: 'bg-blue-50 font-black' },
    { field: 'marks_graduation', headerName: 'Grad', width: 80, editable: true, type: 'number', headerClassName: 'bg-blue-50 font-black' },
    { field: 'marks_masters', headerName: 'Masters', width: 80, editable: true, type: 'number', headerClassName: 'bg-blue-50 font-black' },
    
    // Interview Section
    { field: 'marks_pak_kashmir', headerName: 'Pak/Kash', width: 90, editable: true, type: 'number', headerClassName: 'bg-emerald-50 font-black' },
    { field: 'marks_islamic', headerName: 'Islamic', width: 90, editable: true, type: 'number', headerClassName: 'bg-emerald-50 font-black' },
    { field: 'marks_current_aff', headerName: 'Current', width: 90, editable: true, type: 'number', headerClassName: 'bg-emerald-50 font-black' },
    
    { 
      field: 'grand_total', 
      headerName: 'Total', 
      width: 100, 
      headerClassName: 'bg-slate-900 text-white font-black',
      renderCell: (params) => <span className="font-black text-emerald-600">{params.value}</span>
    },
  ];

  if (!jobId) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Award size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select a Job Post</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Please choose a job from the Results Dashboard to manage its interview award list.
          </p>
          <Button 
            onClick={() => navigate('/dashboard/results')}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 font-black text-xs uppercase tracking-[0.2em]"
          >
            Go to Results Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-600 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Interview Award List</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                Data Entry Group: <span className="text-emerald-600">Job #{jobId}</span>
              </p>
            </div>
          </div>
          
          <Button 
            variant="primary" 
            onClick={handleSave} 
            disabled={saving || loading}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-200 px-10 py-4 h-auto font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02]"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Save size={18} className="mr-3" />
            )}
            {saving ? 'Saving Data...' : 'Commit Award List'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Scoring Grid */}
          <div className="lg:col-span-3">
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Editable Candidate Scores</span>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Part-A</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Part-B</span>
                  </div>
                </div>
              </div>
              
              <DataGrid
                rows={rows}
                columns={columns}
                processRowUpdate={handleProcessRowUpdate}
                loading={loading}
                autoHeight
                disableRowSelectionOnClick
                hideFooter
                className="border-none"
                sx={{
                  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: '900 !important', fontSize: '10px' },
                  '& .MuiDataGrid-cell--editable': { 
                    backgroundColor: 'rgba(16, 185, 129, 0.05) !important', 
                    cursor: 'cell',
                    '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1) !important' } 
                  },
                  '& .MuiDataGrid-row:hover': { backgroundColor: '#f8fafc' }
                }}
                slots={{
                  loadingOverlay: DataGridLoader,
                  noRowsOverlay: () => (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-4 text-slate-400">
                      <UserX size={48} strokeWidth={1} />
                      <p className="text-sm font-black uppercase tracking-[0.2em]">No candidates available for award entry</p>
                    </div>
                  )
                }}
              />
            </Card>
          </div>

          {/* Sidebar Guidelines */}
          <div className="space-y-6">
            <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-3xl overflow-hidden">
              <CardHeader className="p-6 border-b border-white/5 bg-slate-800/50">
                <CardTitle className="text-base font-black flex items-center gap-3">
                  <Calculator className="text-emerald-400" size={20} />
                  Validation Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-400">
                    <CheckCircle2 size={14} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Part-A (Academic)</p>
                  </div>
                  <p className="text-xs font-bold text-slate-300 leading-relaxed">
                    Weightage calculated based on academic certificates and professional experience.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={14} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Part-B (Interview)</p>
                  </div>
                  <p className="text-xs font-bold text-slate-300 leading-relaxed">
                    Sum of Viva, Interview Board, and Psychological testing scores.
                  </p>
                </div>

                <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Strict Constraint</p>
                  <p className="text-xs font-black text-white leading-tight">
                    Grand Total (A + B) must be ≤ 100.00
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-3">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Usage Tip</p>
              <p className="text-xs text-emerald-700 font-bold leading-relaxed">
                Single-click any shaded cell to edit. Press 'Enter' or click away to save the row and trigger the auto-total calculation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwardListPage;
