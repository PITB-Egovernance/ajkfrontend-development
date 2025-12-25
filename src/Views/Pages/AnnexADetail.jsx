import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Button from '../../components/ui/Button';
import { InlineLoader } from '../../components/ui/Loader';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';

const AnnexADetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [annexData, setAnnexData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnexDetail();
  }, [id]);

  const fetchAnnexDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${Config.apiUrl}/annex-a/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setAnnexData(result.data);
      } else {
        toast.error(result.message || 'Failed to load Annex A details');
        navigate('/dashboard/annex-a');
      }
    } catch (error) {
      toast.error('Error loading Annex A details');
      navigate('/dashboard/annex-a');
    } finally {
      setLoading(false);
    }
  };

  const toSmallRoman = (num) => {
    const map = {
      'M': 1000, 'CM': 900, 'D': 500, 'CD': 400,
      'C': 100, 'XC': 90, 'L': 50, 'XL': 40,
      'X': 10, 'IX': 9, 'V': 5, 'IV': 4, 'I': 1
    };
    let result = '';
    for (const [roman, int] of Object.entries(map)) {
      while (num >= int) {
        num -= int;
        result += roman;
      }
    }
    return result.toLowerCase();
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Annex. "A" (Please refer column 1 (v))', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(11);
    doc.text('District wise details of vacant posts with the particulars of incumbents:', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Details section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('(1) Name of District:', 15, yPos);
    yPos += 7;

    // Districts
    if (annexData?.job_detail?.multiple_posts?.length > 0) {
      doc.setFont('helvetica', 'normal');
      annexData.job_detail.multiple_posts.forEach((post, index) => {
        doc.text(`(${toSmallRoman(index + 1)}): ${post.district}`, 55, yPos);
        yPos += 6;
      });
    } else {
      doc.text('N/A', 55, yPos);
      yPos += 6;
    }

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`(2) Total Posts: ${annexData?.job_detail?.num_posts || 'N/A'}`, 15, yPos);
    yPos += 7;
    doc.text('(3) Posts already filled by PSC: .............................................................', 15, yPos);
    yPos += 7;
    doc.text('(4) Number of Vacant Posts: .............................................................', 15, yPos);
    yPos += 7;
    doc.text('(5) Number of Adhoc appointee on vacant posts: .............................................................', 15, yPos);
    yPos += 7;
    doc.text('(6) Detail of Adhoc appointees as follows:-', 15, yPos);
    yPos += 10;

    // Table
    const tableData = [[
      '1',
      annexData?.name_with_father || 'N/A',
      annexData?.district_of_domicile || 'N/A',
      annexData?.creation_of_post || 'N/A',
      annexData?.vacant_due_to_retirement === 1 ? 'Yes' : (annexData?.vacant_due_to_retirement === 0 ? 'No' : 'N/A'),
      annexData?.vacant_due_to_promotion === 1 ? 'Yes' : (annexData?.vacant_due_to_promotion === 0 ? 'No' : 'N/A'),
      annexData?.vacant_due_to_other || 'N/A',
      annexData?.date_initial_appointment || 'N/A',
      annexData?.date_last_extension || 'N/A',
      annexData?.other_information || 'N/A',
    ]];

    doc.autoTable({
      head: [[
        { content: 'S. #', rowSpan: 2 },
        { content: 'Name with father\'s name of adhoc appointee', rowSpan: 2 },
        { content: 'District of Domicile', rowSpan: 2 },
        { content: 'Dates, vacancies occurred', colSpan: 4 },
        { content: 'Date of initial appointment as Adhoc', rowSpan: 2 },
        { content: 'Date of last extension', rowSpan: 2 },
        { content: 'Any other information', rowSpan: 2 },
      ], [
        'Creation of Post',
        'Vacant due to retirement',
        'Vacant due to promotion',
        'Vacant due to other reason',
      ]],
      body: tableData,
      startY: yPos,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
        halign: 'center',
      },
      headStyles: {
        fillColor: [11, 94, 60],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });

    yPos = doc.lastAutoTable.finalY + 20;

    // Signatures
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature of the Head of the attached Department', 15, yPos);
    doc.text('Signature of the Administrative Secretary', 120, yPos);
    yPos += 6;
    doc.text('Date: ___________________', 15, yPos);
    doc.text('Date: ___________________', 120, yPos);
    yPos += 6;
    doc.text('Stamp: ___________________', 15, yPos);
    doc.text('Stamp: ___________________', 120, yPos);

    // Save PDF
    doc.save(`Annex-A-Detail-${id}.pdf`);
    toast.success('PDF exported successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <InlineLoader text="Loading Annex A details..." variant="ring" size="lg" />
      </div>
    );
  }

  if (!annexData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">No data found</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto p-6"
    >
      {/* Header with Back Button and Export */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => navigate('/dashboard/annex-a')}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Annex "A"
        </Button>
        <Button
          onClick={exportToPDF}
          className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-2xl p-8" id="annex-content">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 underline mb-3">
            Annex. "A" (Please refer column 1 (v))
          </h1>
          <p className="text-base font-semibold text-slate-800">
            District wise details of vacant posts with the particulars of incumbents:
          </p>
        </div>

        {/* Details Section */}
        <div className="mb-8 space-y-3 text-slate-800">
          <div>
            <strong>(1) Name of District:</strong>
            {annexData?.job_detail?.multiple_posts?.length > 0 ? (
              <div className="ml-36 space-y-1 mt-2">
                {annexData.job_detail.multiple_posts.map((post, index) => (
                  <div key={index}>
                    ({toSmallRoman(index + 1)}): {post.district}
                  </div>
                ))}
              </div>
            ) : (
              <div className="ml-36 mt-2">N/A</div>
            )}
          </div>

          <div>
            <strong>(2) Total Posts:</strong> {annexData?.job_detail?.num_posts || 'N/A'}
          </div>
          <div>
            <strong>(3) Posts already filled by PSC:</strong> .............................................................
          </div>
          <div>
            <strong>(4) Number of Vacant Posts:</strong> .............................................................
          </div>
          <div>
            <strong>(5) Number of Adhoc appointee on vacant posts:</strong> .............................................................
          </div>
          <div>
            <strong>(6) Detail of Adhoc appointees as follows:-</strong>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse border border-slate-900 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th rowSpan="2" className="border border-slate-900 p-3 font-bold text-slate-900">S. #</th>
                <th rowSpan="2" className="border border-slate-900 p-3 font-bold text-slate-900">Name with father's name of adhoc appointee</th>
                <th rowSpan="2" className="border border-slate-900 p-3 font-bold text-slate-900">District of Domicile</th>
                <th colSpan="4" className="border border-slate-900 p-3 font-bold text-slate-900">Dates, vacancies occurred</th>
                <th rowSpan="2" className="border border-slate-900 p-3 font-bold text-slate-900">Date of initial appointment as Adhoc</th>
                <th rowSpan="2" className="border border-slate-900 p-3 font-bold text-slate-900">Date of last extension</th>
                <th rowSpan="2" className="border border-slate-900 p-3 font-bold text-slate-900">Any other information</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 p-3 font-bold text-slate-900">Creation of Post</th>
                <th className="border border-slate-900 p-3 font-bold text-slate-900">Vacant due to retirement</th>
                <th className="border border-slate-900 p-3 font-bold text-slate-900">Vacant due to promotion</th>
                <th className="border border-slate-900 p-3 font-bold text-slate-900">Vacant due to other reason</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50">
                <td className="border border-slate-900 p-3 text-center text-slate-900">1</td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">{annexData?.name_with_father || 'N/A'}</td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">{annexData?.district_of_domicile || 'N/A'}</td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">{annexData?.creation_of_post || 'N/A'}</td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">
                  {annexData?.vacant_due_to_retirement === 1 ? 'Yes' : (annexData?.vacant_due_to_retirement === 0 ? 'No' : 'N/A')}
                </td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">
                  {annexData?.vacant_due_to_promotion === 1 ? 'Yes' : (annexData?.vacant_due_to_promotion === 0 ? 'No' : 'N/A')}
                </td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">{annexData?.vacant_due_to_other || 'N/A'}</td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">{annexData?.date_initial_appointment || 'N/A'}</td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">{annexData?.date_last_extension || 'N/A'}</td>
                <td className="border border-slate-900 p-3 text-center text-slate-900">{annexData?.other_information || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-800">
          <div className="space-y-2">
            <p className="font-semibold">Signature of the Head of the attached Department</p>
            <p>Date: ___________________</p>
            <p>Stamp: ___________________</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Signature of the Administrative Secretary</p>
            <p>Date: ___________________</p>
            <p>Stamp: ___________________</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AnnexADetail;
