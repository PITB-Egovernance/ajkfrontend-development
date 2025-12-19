import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import { DataGrid } from '@mui/x-data-grid';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

  const token = '14|FVsRVOq87eOsVRBze3yHsQOQixFv6uFgyv2IGPs7b18d2150';
  const BASE_URL = 'http://127.0.0.1:8000';

  const fetchReceivedForms = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/received-forms?page=${page}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Network error');

      const result = await response.json();
      if (result.success) {
        const apiData = result.data;
        const mappedRows = apiData.data.map((item) => ({
          id: item.id,
          ref: item.diary_outward_no || 'N/A',
          from: item.from,
          to: item.to,
          subject: item.subject,
          date: item.date_received,
          priority: item.priority,
          confidentiality: item.confidentiality_level,
        }));

        setRows(mappedRows);
        setFilteredRows(mappedRows);
        setRowCount(apiData.total);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const fetchDispatchDetails = async (id) => {
    setModalLoading(true);
    setOpenModal(true);
    try {
      const response = await fetch(`${BASE_URL}/api/received-forms/${id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch details');

      const result = await response.json();
      if (result.success) {
        setDetailedDispatch(result.data);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to load details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleView = (row) => {
    fetchDispatchDetails(row.id);
  };

  useEffect(() => {
    fetchReceivedForms(paginationModel.page + 1);
  }, [paginationModel.page]);

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

  const columns = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'ref', headerName: 'Diary Inward No.', width: 180 },
    { field: 'from', headerName: 'From', flex: 1 },
    { field: 'to', headerName: 'To', flex: 1 },
    { field: 'subject', headerName: 'Subject', flex: 2 },
    { field: 'date', headerName: 'Received Date', width: 140 },
    { field: 'priority', headerName: 'Priority', width: 110 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <div className="flex gap-2 py-2">
          <Button variant="outline" size="sm" onClick={() => handleView(params.row)}>
            View
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleView(params.row)}>
            Download
          </Button>
        </div>
      ),
    },
  ];

  const formatValue = (value) => (value ? value : 'N/A');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">List of Received</h2>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/dispatch/recieved-form">
            <Button variant="outline">+ Add New</Button>
          </Link>
        </div>
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

      <Card>
        <div style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loading}
            rowCount={searchTerm ? filteredRows.length : rowCount}
            pageSizeOptions={[10]}
            paginationMode={searchTerm ? 'client' : 'server'}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            disableRowSelectionOnClick
          />
        </div>
      </Card>

      {/* Detailed Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
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
                <div className="text-center py-12">Loading details...</div>
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
                            href={`${BASE_URL}/storage/${detailedDispatch.scan_upload_document}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
    </div>
  );
}