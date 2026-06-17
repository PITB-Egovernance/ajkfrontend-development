import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
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

  // Fetch Job details to show designation
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const res = await AdvertisementApi.getAll(1);
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
          setJobName(`${matched.designation} (Adv: ${matched.adv_number || 'N/A'})`);
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
      accessorKey: 'full_name',
      header: 'Candidate Identity',
      cell: info => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 text-sm leading-tight">{info.getValue()}</span>
          <span className="text-xs text-slate-500 mt-1">
            Ref: <span className="text-blue-600 font-semibold">{info.row.original.application_number}</span> | Roll: <span className="text-indigo-600 font-semibold">{info.row.original.roll_no || 'N/A'}</span>
          </span>
          <span className="text-xs text-slate-400 mt-0.5">
            CNIC: {info.row.original.cnic}
          </span>
        </div>
      ),
      size: 350,
    },
    {
      accessorKey: 'marks_status',
      header: 'Status',
      cell: info => {
        const status = info.getValue() || 'Pending';
        const styles = {
          'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
          'Uploaded': 'bg-blue-50 text-blue-600 border-blue-100',
          'Under Verification': 'bg-amber-50 text-amber-600 border-amber-100',
          'Approved': 'bg-emerald-50 text-emerald-600 border-emerald-100',
          'APPROVED': 'bg-emerald-50 text-emerald-600 border-emerald-100',
          'Published': 'bg-indigo-50 text-indigo-600 border-indigo-100',
          'REJECTED': 'bg-red-50 text-red-600 border-red-100',
          'ABSENT': 'bg-rose-50 text-rose-600 border-rose-100',
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
          'APPROVED': 'bg-emerald-600',
          'SHORTLISTED': 'bg-purple-600',
          'INTERVIEW PENDING': 'bg-amber-600',
          'SELECTED': 'bg-green-600',
        };
        return (
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${styles[status] || styles['Pending']}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dotStyles[status] || 'bg-current'}`}></div>
            {status}
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: 'marks_summary',
      header: 'Marks Preview',
      cell: info => {
        const marks = info.getValue() || {};
        return (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(marks).map(([key, val]) => (
              <div key={key} className="bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 flex flex-col items-center min-w-[44px]">
                <span className="text-[8px] font-semibold text-slate-500 uppercase leading-none mb-0.5">{key}</span>
                <span className="text-xs font-bold text-slate-800">{val.obtained}</span>
              </div>
            ))}
            {Object.keys(marks).length === 0 && <span className="text-slate-300 italic text-xs mt-1">No data</span>}
          </div>
        );
      },
      size: 500,
    }
  ], []);

  // Table Instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Virtualization
  const tableContainerRef = useRef(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 84,
    overscan: 15,
  });

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
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
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
            onClick={() => navigate(`/dashboard/results/import/${jobId}`)}
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

        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'Pending', 'Uploaded', 'Under Verification', 'APPROVED', 'SHORTLISTED', 'REJECTED', 'ABSENT', 'SELECTED', 'NOT SELECTED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === status
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Virtual Table Content */}
      <div className="flex-grow overflow-hidden relative">
        <div
          ref={tableContainerRef}
          className="h-full overflow-auto scrollbar-thin scrollbar-thumb-slate-200"
          onScroll={(e) => {
            const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !loading) {
              fetchData(nextCursor, true);
            }
          }}
        >
          <div style={{ height: `${rowVirtualizer.getTotalSize() + 48}px`, width: '100%', position: 'relative' }}>
            {/* Div-based Header */}
            <div className="sticky top-0 bg-slate-50 z-30 border-b border-slate-200 flex w-full h-[48px]">
              {table.getHeaderGroups()[0].headers.map(header => (
                <div
                  key={header.id}
                  className="px-6 flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50"
                  style={{ width: header.getSize() }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </div>

            {/* Div-based Rows with Offset */}
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              return (
                <div
                  key={row.id}
                  className="hover:bg-slate-50/50 transition-all flex items-center border-b border-slate-100 group bg-white"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    // 48px is the header height
                    transform: `translateY(${virtualRow.start + 48}px)`,
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <div
                      key={cell.id}
                      className="px-6 flex items-center h-full"
                      style={{ width: cell.column.getSize() }}
                    >
                      <div className="w-full">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10 bg-white/50 backdrop-blur-sm sticky bottom-0">
              <div className="flex flex-col items-center gap-2">
                <InlineLoader />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching candidates...</p>
              </div>
            </div>
          )}

          {!loading && data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="p-6 bg-slate-100 rounded-[2.5rem] text-slate-400">
                <Search size={48} strokeWidth={1} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-black text-slate-900">No candidates found</h3>
                <p className="text-xs font-medium text-slate-400 mt-1">Try adjusting your filters or search term</p>
              </div>
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
