import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from 'Components/ui';
import { DataGrid } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { InlineLoader } from 'Components/ui/Loader';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

export default function DispatchReceived() {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [rowCount, setRowCount] = useState(0);

  const [detailedDispatch, setDetailedDispatch] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const fetchReceivedForms = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/dispatch/received-forms`, {
        headers: { 
          Authorization: `Bearer ${TOKEN}`, 
          Accept: 'application/json',
          'X-API-KEY': API_KEY
        },
      });
      if (!response.ok) throw new Error('Network error');

      const result = await response.json();
      if (result.success) {
        const apiData = result.data;
        console.log('API Data sample:', apiData.data[0]); // Log first item to see structure
        const mappedRows = apiData.data.map((item, index) => {
          // Check for various ID fields the API might use
          const realId = item.id || item.hash_id || item.diary_id;
          return {
            id: realId || `temp-${index}-${Date.now()}`,
            originalId: realId, // Store original ID for API calls
            ref: item.diary_outward_no || 'N/A',
            from: item.from,
            to: item.to,
            subject: item.subject,
            date: item.date_received,
            priority: item.priority,
            confidentiality: item.confidentiality_level,
          };
        });

        setRows(mappedRows);
        setFilteredRows(mappedRows);
        setRowCount(apiData.total);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load received forms');
    } finally {
      setLoading(false);
    }
  };

  const fetchDispatchDetails = async (id) => {
    setModalLoading(true);
    setOpenModal(true);
    console.log('Fetching details from:', `${API_BASE}/received-forms/${id}`);
    try {
      const response = await fetch(`${API_BASE}/dispatch/received-forms/${id}`, {
        headers: { 
          Authorization: `Bearer ${TOKEN}`, 
          Accept: 'application/json',
          'X-API-KEY': API_KEY
        },
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch details (${response.status})`);
      }

      const result = await response.json();
      console.log('API Result:', result);
      
      if (result.success) {
        setDetailedDispatch(result.data);
      } else {
        toast.error(result.message || 'Failed to load details');
        setOpenModal(false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load details. Please check console for more info.');
      setOpenModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleView = (row) => {
    const idToFetch = row.originalId || row.id;
    console.log('Fetching details for ID:', idToFetch, 'Full row:', row);
    if (!idToFetch || idToFetch.toString().startsWith('temp-')) {
      toast.error('Invalid record ID. Please refresh the page and try again.');
      return;
    }
    fetchDispatchDetails(idToFetch);
  };

  useEffect(() => {
    fetchReceivedForms(paginationModel.page + 1, paginationModel.pageSize);
  }, [paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const filtered = rows.filter((r) =>
      [r.ref, r.from, r.to, r.subject].some((field) =>
        field?.toLowerCase().includes(lower)
      )
    );
    setFilteredRows(filtered);
  }, [searchTerm, rows]);

  const handleDownloadPDF = async () => {
    if (!detailedDispatch) return;

    const element = document.getElementById('dispatch-details-content');
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, imgHeight);
    pdf.save(`Dispatch_${detailedDispatch.diary_outward_no.replace(/\//g, '-')}.pdf`);
  };

  const getPriorityClass = (priority) => {
    const priorityLower = priority?.toLowerCase() || '';
    if (priorityLower === 'high') return 'bg-red-100 text-red-800';
    if (priorityLower === 'medium') return 'bg-yellow-100 text-yellow-800';
    if (priorityLower === 'low') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-700';
  };

  const columns = [
    // { field: 'id', headerName: 'ID', width: 70 },
    { field: 'ref', headerName: 'Diary Inward No.', width: 180 },
    { field: 'from', headerName: 'From', flex: 1, minWidth: 150 },
    { field: 'to', headerName: 'To', flex: 1, minWidth: 150 },
    { field: 'subject', headerName: 'Subject', flex: 2, minWidth: 250 },
    { field: 'date', headerName: 'Received Date', width: 130 },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 110,
      renderCell: (params) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityClass(params.value)}`}>
          {params.value || 'N/A'}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <div className="flex gap-2 py-2">
          <Button variant="outline" size="sm" onClick={() => handleView(params.row)}>
            View
          </Button>
        </div>
      ),
    },
  ];

  const formatValue = (value) => (value ? value : 'N/A');

  return (
    <Box sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">List of Received</h2>
        <Link to="/dashboard/dispatch/recieved-form">
          <button className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
            + Add New
          </button>
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Ref No., From, To, Subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Box sx={{ width: '100%', height: 'auto' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          rowCount={searchTerm ? filteredRows.length : rowCount}
          pageSizeOptions={[10, 25, 50, 75, 100]}
          paginationMode={searchTerm ? 'client' : 'server'}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          disableRowSelectionOnClick
          autoHeight
          slots={{
            loadingOverlay: () => <InlineLoader text="Loading received forms..." variant="ring" size="lg" />,
          }}
          sx={{
            '& .MuiDataGrid-columnHeaders': { 
              fontSize: '0.813rem',
              fontWeight: 600
            },
            '& .MuiDataGrid-cell': {
              fontSize: '0.813rem',
              padding: '8px 12px',
            },
            '& .MuiDataGrid-row': {
              minHeight: '52px !important',
            },
          }}
        />
      </Box>

      {/* Detailed Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-2xl font-bold">
                Dispatch Details - {detailedDispatch?.diary_outward_no || 'Loading...'}
              </h3>
              <button
                onClick={() => {
                  setOpenModal(false);
                  setDetailedDispatch(null);
                }}
                className="text-3xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div id="dispatch-details-content" className="p-8 text-sm">
              {modalLoading ? (
                <div className="py-12">
                  <InlineLoader text="Loading details..." variant="ring" size="lg" />
                </div>
              ) : (
                detailedDispatch && (
                  <>
                    <h2 className="text-3xl font-bold text-center mb-10">
                      Received Dispatch Form
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <strong>Diary Inward No:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.diary_outward_no)}</p>
                      </div>
                      <div>
                        <strong>Dispatch No:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.dispatch_no)}</p>
                      </div>
                      <div>
                        <strong>From:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.from)}</p>
                      </div>

                      <div>
                        <strong>To:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.to)}</p>
                      </div>
                      <div>
                        <strong>Subject:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.subject)}</p>
                      </div>
                      <div>
                        <strong>Date Received:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.date_received)}</p>
                      </div>

                      <div>
                        <strong>Time Received:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.time_received?.slice(0, 8))}</p>
                      </div>
                      <div>
                        <strong>Priority:</strong>
                        <p className="mt-1">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              detailedDispatch.priority === 'High'
                                ? 'bg-red-100 text-red-800'
                                : detailedDispatch.priority === 'Low'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {formatValue(detailedDispatch.priority)}
                          </span>
                        </p>
                      </div>
                      <div>
                        <strong>Confidentiality Level:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.confidentiality_level)}</p>
                      </div>

                      <div>
                        <strong>Summary:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.summary)}</p>
                      </div>
                      <div>
                        <strong>Related Module:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.related_module)}</p>
                      </div>
                      <div>
                        <strong>Department/Party Name:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.department_party_name)}</p>
                      </div>

                      <div>
                        <strong>Dispatch Method:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.dispatch_method_detail)}</p>
                      </div>
                      <div>
                        <strong>Consignment No:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.consignment_no)}</p>
                      </div>
                      <div>
                        <strong>Dispatch Date:</strong> <strong>{formatValue(detailedDispatch.dispatch_date)}</strong>
                      </div>
                      <div>
                        <strong>Proof of Delivery: <strong>{formatValue(detailedDispatch.proof_of_delivery)}</strong></strong>
                      </div>
                      <div>Barcode qr code: <strong>{formatValue(detailedDispatch.barcode_qr_code||"N/A")}</strong> </div> 
                      <div>
                        <strong>Assigned To:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.assign_to_section_officer)}</p>
                      </div>

                      <div>
                        <strong>Archive/Dispose:</strong>
                        <p className="mt-1">{formatValue(detailedDispatch.archive_dispose)}</p>
                      </div>
                      
                      {detailedDispatch.scan_upload_document && (
                        <div className="md:col-span-3 mt-6 p-4 bg-gray-50 rounded-lg">
                          <strong>Scanned Document:</strong>
                          <br />
                          <a
                            href={`${API_BASE}/storage/${detailedDispatch.scan_upload_document}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 px-5 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded"
                          >
                            view pdf
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <Button variant="secondary" onClick={handleDownloadPDF} disabled={modalLoading}>
                Download as PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenModal(false);
                  setDetailedDispatch(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
}