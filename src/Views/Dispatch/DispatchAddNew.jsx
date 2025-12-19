import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button } from '../../components/ui';

export default function DispatchAddNew() {
  const navigate = useNavigate();
  const token = '14|FVsRVOq87eOsVRBze3yHsQOQixFv6uFgyv2IGPs7b18d2150';
  const BASE_URL = 'http://127.0.0.1:8000';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to: '',
    from: '',
    diary_outward_no: '',
    date_received: '',
    time_received: '',
    dispatch_no: '',
    priority: 'Normal',
    confidentiality_level: 'Normal',
    subject: '',
    summary: '',
    related_module: '',
    department_party_name: '',
    dispatch_method_detail: '',
    consignment_no: '',
    assign_to_section_officer: '',
    archive_dispose: '',
  });

  const [files, setFiles] = useState({
    proof_of_delivery: null,
    barcode_qr_code: null,
    attachments: null,
    scan_upload_document: null,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    setFiles((prev) => ({ ...prev, [name]: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();

    // Append text fields
    Object.keys(formData).forEach((key) => {
      if (formData[key]) data.append(key, formData[key]);
    });

    // Append files if selected
    Object.keys(files).forEach((key) => {
      if (files[key]) data.append(key, files[key]);
    });

    try {
      const response = await fetch(`${BASE_URL}/api/received-forms`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          // Do NOT set Content-Type; browser sets it with boundary for FormData
        },
        body: data,
      });

      const result = await response.json();

      if (response.ok) {
        if (result.success) {
          alert('Received form submitted successfully!');
          navigate('/dashboard/dispatch/received'); // Go back to list
        } else {
          alert(result.message || 'Something went wrong');
          console.error(result);
        }
      } else {
        let errorMsg = result.message || 'Error occurred';
        if (result.errors) {
          errorMsg = Object.keys(result.errors)
            .map((key) => `${key}: ${result.errors[key].join(', ')}`)
            .join('\n');
        }
        alert(errorMsg);
        console.error(result);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to submit form. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Add New Received Dispatch</h2>
        <Link to="/dashboard/dispatch/received">
          <Button variant="outline">← Back to List</Button>
        </Link>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Row 1 */}
            <div>
              <label className="block text-sm font-medium mb-1">To *</label>
              <input
                type="text"
                name="to"
                required
                value={formData.to}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">From *</label>
              <input
                type="text"
                name="from"
                required
                value={formData.from}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Diary Inward No. *</label>
              <input
                type="text"
                name="diary_outward_no"
                required
                value={formData.diary_outward_no}
                onChange={handleInputChange}
                placeholder="e.g. D.O.No-2025/145"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-medium mb-1">Date Received *</label>
              <input
                type="date"
                name="date_received"
                required
                value={formData.date_received}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time Received</label>
              <input
                type="time"
                name="time_received"
                value={formData.time_received}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dispatch No.</label>
              <input
                type="text"
                name="dispatch_no"
                value={formData.dispatch_no}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Priority & Confidentiality */}
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confidentiality Level</label>
              <select
                name="confidentiality_level"
                value={formData.confidentiality_level}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Normal">Normal</option>
                <option value="Confidential">Confidential</option>
                <option value="Secret">Secret</option>
                <option value="Top Secret">Top Secret</option>
              </select>
            </div>

            {/* Subject */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Subject *</label>
              <input
                type="text"
                name="subject"
                required
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Summary */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Summary</label>
              <textarea
                name="summary"
                rows="4"
                value={formData.summary}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Other fields */}
            <div>
              <label className="block text-sm font-medium mb-1">Related Module</label>
              <input
                type="text"
                name="related_module"
                value={formData.related_module}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department/Party Name</label>
              <input
                type="text"
                name="department_party_name"
                value={formData.department_party_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dispatch Method Detail</label>
              <input
                type="text"
                name="dispatch_method_detail"
                value={formData.dispatch_method_detail}
                onChange={handleInputChange}
                placeholder="e.g. Courier - TCS"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Consignment No.</label>
              <input
                type="text"
                name="consignment_no"
                value={formData.consignment_no}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Assign To Section/Officer</label>
              <input
                type="text"
                name="assign_to_section_officer"
                value={formData.assign_to_section_officer}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Archive/Dispose</label>
              <input
                type="text"
                name="archive_dispose"
                value={formData.archive_dispose}
                onChange={handleInputChange}
                placeholder="e.g. Archive after 5 years"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* File Uploads */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-lg font-medium">Attachments</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Proof of Delivery (PDF)</label>
                <input type="file" name="proof_of_delivery" accept=".pdf" onChange={handleFileChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Barcode / QR Code (Image)</label>
                <input type="file" name="barcode_qr_code" accept="image/*" onChange={handleFileChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Additional Attachments (PDF)</label>
                <input type="file" name="attachments" accept=".pdf" onChange={handleFileChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scanned Document / Letter *</label>
                <input
                  type="file"
                  name="scan_upload_document"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <Link to="/dashboard/dispatch/received">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Received Form'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}