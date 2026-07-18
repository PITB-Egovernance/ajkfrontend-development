import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  ArrowLeft,
  Search,
  Edit3,
  MoreHorizontal,
  Download,
  Plus
} from 'lucide-react';
import Button from 'components/ui/Button';
import { toast } from 'react-hot-toast';
import { InlineLoader } from 'components/ui/Loader';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import { getJobRouteId } from 'utils/jobMapper';
import MarkEntryModal from 'components/results/MarkEntryModal';

/**
 * ResultsViewPage (v2.0)
 * High-performance candidate marks table using TanStack Table & Virtual Scrolling
 */
const ResultsViewPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  // Data State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

  // Job Post Info State
  const [jobName, setJobName] = useState('');

  // Fetch Logic
  const fetchData = React.useCallback(async (cursor = null, isAppend = false, immediate = false) => {
    if (!immediate) setLoading(true);
    try {
      const params = {
        limit: 100,
        cursor: cursor,
        search: search,
        // Ensure marks_status is always an array for the backend validation
        marks_status: statusFilter === 'all' ? [] : [statusFilter],
      };

      const response = await ResultsApi.getCandidates(jobId, params);

      if (isAppend) {
        setData(prev => [...prev, ...response.data]);
      } else {
        setData(response.data);
      }

      setHasMore(response.pagination.has_more);
      setNextCursor(response.pagination.next_cursor);
      setTotalCount(response.pagination.total);
    } catch (err) {
      toast.error('Failed to fetch candidate data');
    } finally {
      setLoading(false);
    }
  }, [jobId, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const [clubbedJobIds, setClubbedJobIds] = useState([]);
  const [examType, setExamType] = useState('');

  // Fetch Job details to show designation
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const [res, groupsRes] = await Promise.all([
          AdvertisementApi.getAll(1).catch(() => ({})),
          ResultsApi.getClubbedGroups([jobId], 'combined_competitive_exam', 'cce-exams').catch(() => ({})),
        ]);
        let advertisements = [];
        if (res && res.data) {
          if (Array.isArray(res.data.data)) {
            advertisements = res.data.data;
          } else if (Array.isArray(res.data)) {
            advertisements = res.data;
          }
        }
        const fetchedJobs = advertisements.flatMap(adv =>
          (adv.job_details || adv.jobDetails || []).map(j => ({
            ...j,
            adv_number: adv.adv_number
          }))
        );
        const matched = fetchedJobs.find(
          j => {
            const routeId = getJobRouteId(j);
            const stringId = j.id ? j.id.toString() : '';
            return (routeId && routeId === jobId) || (stringId && stringId === jobId);
          }
        );
        if (matched) {
          const category = matched.resolved_test_type_exam_category || matched.pivot?.test_type_exam_category || '';
          if (category === 'combined_competitive_exam') {
            setExamType('cce-exams');
          }
          const groups = groupsRes?.data?.groups ?? groupsRes?.groups ?? [];
          const activeGroup = groups.find(g => (g.post_ids || []).includes(jobId));
          if (activeGroup && activeGroup.posts) {
            setClubbedJobIds(activeGroup.post_ids || []);
            const designations = activeGroup.posts.map(p => p.post_name).join(' & ');
            setJobName(`${designations} (Adv: ${matched.adv_number || 'N/A'})`);
          } else {
            setJobName(`${matched.designation} (Adv: ${matched.adv_number || 'N/A'})`);
          }
        }
      } catch (err) {
        console.error('Failed to load job details:', err);
      }
    };
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const handleEditClick = (candidate) => {
    setSelectedCandidate(candidate);
    setIsEntryModalOpen(true);
  };

  const handleEntrySuccess = () => {
    setIsEntryModalOpen(false);
    fetchData(null, false, true); // Immediate refresh bypassing debounce
  };

  // Table Columns
  const columns = useMemo(() => [
    {
      field: 'full_name',
      headerName: 'Candidate Name',
      flex: 1.5,
      minWidth: 160,
      renderCell: (params) => (
        <span className="font-semibold text-slate-900 text-sm leading-tight py-2 inline-block">{params.value}</span>
      )
    },
    {
      field: 'application_number',
      headerName: 'Ref No',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <span className="text-xs font-medium text-slate-800 py-2 inline-block">
          {params.value}
        </span>
      )
    },
    {
      field: 'roll_no',
      headerName: 'Roll No',
      flex: 1,
      minWidth: 110,
      renderCell: (params) => (
        <span className="text-xs font-medium text-slate-800 py-2 inline-block">
          {params.value || '—'}
        </span>
      )
    },
    {
      field: 'cnic',
      headerName: 'CNIC',
      flex: 1.2,
      minWidth: 140,
      renderCell: (params) => (
        <span className="text-xs text-slate-700 py-2 inline-block">{params.value}</span>
      )
    },
    {
      field: 'marks_status',
      headerName: 'Status',
      flex: 1,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const cand = params.row;
        const examStatus = String(cand.status || '').toUpperCase();
        let status = params.value || 'Pending';
        if (['ABSENT', 'UFM', 'RL'].includes(examStatus)) {
          status = examStatus;
        }
        const styles = {
          'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
          'Uploaded': 'bg-blue-50 text-blue-600 border-blue-100',
          'Under Verification': 'bg-amber-50 text-amber-600 border-amber-100',
          'Approved': 'bg-emerald-50 text-emerald-600 border-emerald-100',
          'APPROVED': 'bg-emerald-50 text-emerald-600 border-emerald-100',
          'Published': 'bg-indigo-50 text-indigo-600 border-indigo-100',
          'REJECTED': 'bg-red-50 text-red-600 border-red-100',
          'ABSENT': 'bg-rose-50 text-rose-600 border-rose-100',
          'UFM': 'bg-rose-50 text-rose-600 border-rose-100',
          'RL': 'bg-amber-50 text-amber-600 border-amber-100',
          'SHORTLISTED': 'bg-purple-50 text-purple-600 border-purple-100',
          'INTERVIEW PENDING': 'bg-amber-50 text-amber-600 border-amber-100',
          'SELECTED': 'bg-green-50 text-green-600 border-green-100',
          'NOT SELECTED': 'bg-slate-100 text-slate-500 border-slate-200',
        };
        const dotStyles = {
          'Pending': 'bg-slate-400',
          'NOT SELECTED': 'bg-slate-400',
          'REJECTED': 'bg-red-600',
          'ABSENT': 'bg-rose-600',
          'UFM': 'bg-rose-600',
          'RL': 'bg-amber-600',
          'APPROVED': 'bg-emerald-600',
          'SHORTLISTED': 'bg-purple-600',
          'INTERVIEW PENDING': 'bg-amber-600',
          'SELECTED': 'bg-green-600',
        };
        return (
          <div className="flex items-center justify-center">
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 ${styles[status] || styles['Pending']}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${dotStyles[status] || 'bg-current'}`}></div>
              {status}
            </span>
          </div>
        );
      }
    },
    {
      field: 'marks_summary',
      headerName: 'Marks Preview',
      flex: 3,
      minWidth: 320,
      renderCell: (params) => {
        const cand = params.row;
        const examStatus = String(cand.status || '').toUpperCase();
        if (examStatus === 'ABSENT') {
          return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">Absent</span>;
        }
        if (examStatus === 'UFM') {
          return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-100">Unfair Means</span>;
        }
        if (examStatus === 'RL') {
          return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100">Result Late</span>;
        }
        const marks = params.value || {};
        return (
          <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto pr-1 py-2 text-left w-full">
            {Object.entries(marks).map(([key, val]) => (
              <div key={key} className="bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 flex flex-col items-center min-w-[44px]">
                <span className="text-[8px] font-semibold text-slate-500 uppercase leading-none mb-0.5">{key}</span>
                <span className="text-xs font-bold text-slate-800">{val.obtained}</span>
              </div>
            ))}
            {Object.keys(marks).length === 0 && <span className="text-slate-300 italic text-xs mt-1">No data</span>}
          </div>
        );
      }
    }
  ], []);

  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Generating template...', { id: 'download' });
      const { blob, filename } = await ResultsApi.downloadTemplate(jobId);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully', { id: 'download' });
    } catch (error) {
      toast.error(error.message || 'Failed to download template', { id: 'download' });
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 space-y-6">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/results')} className="p-2 hover:bg-slate-50 rounded-lg transition-all">
            <ArrowLeft size={20} className="text-slate-400 hover:text-slate-900" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Candidates Marks Console</h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              Job Post: <span className="text-indigo-600 font-semibold">{jobName || `#${jobId}`}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              Records: <span className="text-slate-900">{totalCount.toLocaleString()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-200 bg-white text-slate-600 font-semibold text-xs px-4 h-9 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            onClick={() => {
              const queryParams = new URLSearchParams();
              if (examType) queryParams.set('examType', examType);
              if (clubbedJobIds.length > 0) queryParams.set('clubbedJobIds', clubbedJobIds.join(','));
              const queryString = queryParams.toString();
              navigate(`/dashboard/results/import/${jobId}${queryString ? '?' + queryString : ''}`);
            }}
          >
            <Plus size={16} />
            Bulk Import
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 h-9 rounded-lg flex items-center gap-2"
            onClick={handleDownloadTemplate}
          >
            <Download size={16} />
            Export List
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-4">
        <div className="relative flex-grow max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Roll No or Name..."
            className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-sm transition-all outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="relative min-w-[200px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-sm transition-all outline-none h-10 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Uploaded">Uploaded</option>
            <option value="Under Verification">Under Verification</option>
            <option value="APPROVED">Approved</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="REJECTED">Rejected</option>
            <option value="ABSENT">Absent</option>
            <option value="UFM">Unfair Means (UFM)</option>
            <option value="RL">Result Late (RL)</option>
            <option value="SELECTED">Selected</option>
            <option value="NOT SELECTED">Not Selected</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-grow p-4 lg:p-6 bg-slate-50 overflow-hidden flex flex-col">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-grow relative p-4">
          <TooltipDataGrid
            rows={data.map((cand, idx) => ({ ...cand, id: cand.app_id || cand.id || idx }))}
            columns={columns}
            autoHeight
            loading={loading}
            disableRowSelectionOnClick
            hideFooter
            sx={{
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
              '& .MuiDataGrid-row': { minHeight: '52px !important' }
            }}
          />

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => fetchData(nextCursor, true)}
                disabled={loading}
                className="h-9 px-4 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-lg shadow-none flex items-center justify-center gap-2"
              >
                {loading ? 'Loading...' : 'Load More Candidates'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Status Bar */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 font-medium z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
          </div>
        </div>
        <div>
          Showing {data.length} of {totalCount} Candidates
        </div>
      </footer>
      <MarkEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        candidate={selectedCandidate}
        jobId={jobId}
        onSuccess={handleEntrySuccess}
      />
    </div>
  );
};

export default ResultsViewPage;
