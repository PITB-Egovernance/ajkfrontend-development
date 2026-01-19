import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InlineLoader } from 'Components/ui/Loader';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const RequisitionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    fetchRequisition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRequisition = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requisition/${id}`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch requisition details');
      
      const result = await response.json();
      if (result.status === 200 && result.data) {
        setRequisition(result.data);
      } else {
        throw new Error(result.message || 'Invalid response');
      }
    } catch (err) {
      toast.error(err.message || 'Error loading requisition details');
      navigate('/dashboard/requisitions');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDate = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date();
    return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
  };

  const exportToPDF = () => {
    if (!requisition) {
      toast.error('No requisition data to export');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 14;
      const marginRight = 14;
      const contentWidth = pageWidth - marginLeft - marginRight;
      let yPosition = 20;

      // Header
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const header1 = 'AZAD JAMMU AND KASHMIR PUBLIC SERVICE COMMISSION, MUZAFFARABAD';
      doc.text(header1, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 7;
      doc.setFontSize(11);
      const header2 = 'Subject: Requisition for Direct Recruitment in Government/Semi Government/Autonomous Bodies';
      const splitHeader = doc.splitTextToSize(header2, contentWidth);
      doc.text(splitHeader, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += splitHeader.length * 5 + 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Requisition No. ______________________ Dated: ${getCurrentDate()}`, marginLeft, yPosition);
      
      yPosition += 8;

      // Instructions
      doc.setFontSize(8);
      const instructions = [
        '1. This form should be very carefully filled as it is strictly in accordance with the information supplied there that the commission will advertise the post(s).',
        '2. Entries should be neatly made and any additions and alterations therein should invariably be attested by a competent authority.',
        '3. The form should be signed by the concerned Administrative Secretary to the Government.'
      ];
      instructions.forEach(inst => {
        const split = doc.splitTextToSize(inst, contentWidth);
        doc.text(split, marginLeft, yPosition);
        yPosition += split.length * 4;
      });

      yPosition += 3;

      // Main Table Data
      const tableData = [
        [
          '1',
          '(i) Designation or nomenclature of the Post(s)\n(ii) Scale of the Post\n(iii) Department & Class of Service\n(iv) Percentage of quota fixed\n(v) Number of posts to be filled\n(vi) Date(s) of occurrence of vacancy(s)',
          `(i) ${requisition.designation || 'N/A'}\n(ii) ${requisition.scale || 'N/A'}\n(iii) ${requisition.department?.name || 'N/A'}\n(iv) ${requisition.quota_percentage || 'N/A'}%\n(v) ${requisition.num_posts || 'N/A'}\n(vi) Details in Annex "A"`
        ],
        ['2', 'Service Rules for the Post(s) to be filled', 'Service Rules'],
        ['3', 'Approved syllabus for the Post(s) to be filled', 'Attached as Annex "B"'],
        [
          '4',
          'Qualification Required:\n(i) Academic\n(ii) Equivalent qualification authority\n(iii) Name degree of equivalence\n(iv) Any other Qualification\n(v) Training with institute name',
          `(i) ${requisition.qualification?.academic_qualification || 'N/A'}\n(ii) ${requisition.qualification?.equivalent_qualification || 'N/A'}\n(iii) ${requisition.qualification?.degree_equivalence || 'N/A'}\n(iv) ${requisition.qualification?.any_other_qualification || 'N/A'}\n(v) ${requisition.qualification?.training_institute || 'N/A'}`
        ],
        [
          '5',
          'Experience:\n(i) Type of experience required\n(ii) Length of experience\n(iii) Minimum academic qualification',
          `(i) ${requisition.qualification?.experience_type || 'N/A'}\n(ii) ${requisition.qualification?.experience_length || 'N/A'}\n(iii) ${requisition.qualification?.min_qualification || 'N/A'}`
        ],
        [
          '6',
          'Age Limit:\n(i) Minimum\n(ii) Maximum\n(iii) Relaxation, if any',
          `(i) ${requisition.eligibility?.min_age || 'N/A'}\n(ii) ${requisition.eligibility?.max_age || 'N/A'}\n(iii) ${requisition.eligibility?.age_relaxation || 'N/A'}`
        ],
        ['7', 'Nationality', requisition.eligibility?.nationality || 'N/A'],
        ['8', 'Domicile (Name Districts/Units)', requisition.eligibility?.domicile || 'N/A'],
        ['10', 'Any other condition of qualification', requisition.eligibility?.other_conditions || 'N/A'],
        ['11', 'Gender Specific/Quota basis/Open Merit', requisition.eligibility?.gender_basis || 'N/A']
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [],
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 8, 
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245] },
          1: { cellWidth: 75, valign: 'top' },
          2: { cellWidth: 97, valign: 'top' }
        },
        margin: { left: marginLeft, right: marginRight }
      });

      yPosition = doc.lastAutoTable.finalY + 5;

      // District Quota Table
      if (requisition.multiple_posts && requisition.multiple_posts.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('9. Detail of District wise quota for the posts:', marginLeft, yPosition);
        yPosition += 4;

        const districtData = requisition.multiple_posts.map(post => [
          post.district || 'N/A',
          post.quota || 'N/A',
          post.post || 'N/A'
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['District/Unit', 'Quota', 'Posts']],
          body: districtData,
          theme: 'grid',
          styles: { 
            fontSize: 8, 
            cellPadding: 2, 
            halign: 'center',
            lineColor: [0, 0, 0],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          },
          margin: { left: marginLeft, right: marginRight }
        });

        yPosition = doc.lastAutoTable.finalY + 5;
      }

      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Certification
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('It is certified that:', marginLeft, yPosition);
      yPosition += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const certifications = [
        '(i) The data given as mentioned above along with Annex "A" is correct in accordance with the official record and no vacant post is left un-mentioned till today in this requisition form.',
        '(ii) That no vacant post under above mentioned category is left behind, which is still not filled on permanent basis through PSC and that all vacant posts fall vacant till today are incorporated in this requisition.',
        '(iii) That the department is strictly following the Rule (3) of AJ&K Public Service Commission (Procedure) Rules, 1994 & decision of Supreme Court of Azad Jammu and Kashmir.'
      ];
      
      certifications.forEach(cert => {
        const split = doc.splitTextToSize(cert, contentWidth);
        doc.text(split, marginLeft, yPosition);
        yPosition += split.length * 4 + 2;
      });

      yPosition += 10;
      doc.setFontSize(9);
      doc.text('Signature of Administrative Secretary', pageWidth - 70, yPosition);
      yPosition += 4;
      doc.text('of the Department', pageWidth - 70, yPosition);
      yPosition += 4;
      doc.text(`Date: ${getCurrentDate()}`, pageWidth - 70, yPosition);
      yPosition += 4;
      doc.text('Stamp: ______________________', pageWidth - 70, yPosition);

      doc.save(`Requisition_Detail_${requisition.id}_${Date.now()}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      toast.error('Failed to export PDF: ' + error.message);
      console.error('PDF Export Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <InlineLoader text="Loading requisition details..." variant="ring" size="lg" />
      </div>
    );
  }

  if (!requisition) {
    return <div className="text-center py-8 text-slate-600">No requisition found.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-6 max-w-6xl"
    >
      <div className="flex justify-end mb-4">
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg transition-colors"
        >
          <Download size={18} />
          Export PDF
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8" style={styles.container}>
        <h2 style={styles.h2}>
          AZAD JAMMU AND KASHMIR PUBLIC SERVICE COMMISSION, MUZAFFARABAD
        </h2>
        <h3 style={styles.h3}>
          Subject: Requisition for Direct Recruitment in Government/Semi Government/Autonomous Bodies under Public Service Commission Act 1986
        </h3>

        <p style={styles.p}>
          <b>Requisition No.</b> ______________________
          &nbsp;&nbsp;&nbsp;
          <b>Dated: </b> <span>{getCurrentDate()}</span>
        </p>

        <div style={styles.instructions}>
          <p>1. This form should be very carefully filled as it is strictly in accordance with the information supplied there that the commission will advertise the post(s).</p>
          <p>2. Entries should be neatly made and any additions and alterations therein should invariably be attested by a competent authority.</p>
          <p>3. The form should be signed by the concerned Administrative Secretary to the Government.</p>
        </div>

        <table style={styles.table}>
          <tbody>
            <tr>
              <th style={styles.number}>1</th>
              <td style={styles.tableCell}>
                (i) Designation or nomenclature of the Post(s)<span style={styles.fieldLine}></span>
                (ii) Scale of the Post.<span style={styles.fieldLine}></span>
                (iii) Department & Class of Service<span style={styles.fieldLine}></span>
                (iv) Percentage of quota fixed for direct recruitment viz-a-viz promotion quota (Quote Rules)<span style={styles.fieldLine}></span>
                (v) Number of posts to be filled through direct recruitment as (iv) above on permanent basis<span style={styles.fieldLine}></span>
                (vi) Date(s) of occurrence of vacancy(s) OR Period from __________ to __________
                <p style={{ marginBottom: '10px' }}></p>
              </td>
              <td style={styles.tableCell}>
                (i)&nbsp;&nbsp;{requisition.designation || 'N/A'}<span style={styles.fieldLine}></span>
                (ii)&nbsp;&nbsp;{requisition.scale || 'N/A'}<span style={styles.fieldLine}></span>
                (iii)&nbsp;&nbsp;{requisition.department?.name || 'N/A'}<span style={styles.fieldLine}></span>
                (iv)&nbsp;&nbsp;{requisition.quota_percentage || 'N/A'}%<span style={styles.fieldLine}></span>
                (v)&nbsp;&nbsp;{requisition.num_posts || 'N/A'}<span style={styles.fieldLine}></span>
                (vi)&nbsp;&nbsp;Details in Annex "A"<span className=""></span>
              </td>
            </tr>

            <tr>
              <th style={styles.number}>2</th>
              <td style={styles.tableCell}>Service Rules for the Post(s) to be filled</td>
              <td style={styles.tableCell}>Service Rules<span className=""></span></td>
            </tr>

            <tr>
              <th style={styles.number}>3</th>
              <td style={styles.tableCell}>Approved syllabus for the Post(s) to be filled</td>
              <td style={styles.tableCell}>Attached as Annex "B"</td>
            </tr>

            <tr>
              <th style={styles.number}>4</th>
              <td style={styles.tableCell}>
                <b>Qualification Required:</b><br />
                (i) Academic<span style={styles.fieldLine}></span>
                (ii) In case of equivalent qualification is accepted, name the authority for issuing the equivalent certificate.<span style={styles.fieldLine}></span>
                (iii) Name degree of equivalence.<span style={styles.fieldLine}></span>
                (iv) Any other Qualification under Rules.<span style={styles.fieldLine}></span>
                (v) Training with the name of training institute.
                <p style={{ marginBottom: '10px' }}></p>
              </td>
              <td style={styles.tableCell}>
                <br />
                (i)&nbsp;&nbsp;{requisition.qualification?.academic_qualification || 'N/A'}<span style={styles.fieldLine}></span>
                (ii)&nbsp;&nbsp;{requisition.qualification?.equivalent_qualification || 'N/A'}<span style={{ ...styles.fieldLine, marginTop: '22px' }}></span>
                (iii)&nbsp;&nbsp;{requisition.qualification?.degree_equivalence || 'N/A'}<span style={styles.fieldLine}></span>
                (iv)&nbsp;&nbsp;{requisition.qualification?.any_other_qualification || 'N/A'}<span style={styles.fieldLine}></span>
                (v)&nbsp;&nbsp;{requisition.qualification?.training_institute || 'N/A'}<span></span>
              </td>
            </tr>

            <tr>
              <th style={styles.number}>5</th>
              <td style={styles.tableCell}>
                <b>Experience:</b><br />
                (i) What type of experience required<span style={styles.fieldLine}></span>
                (ii) Length of experience<span style={styles.fieldLine}></span>
                (iii) Minimum academic qualification after acquisition of which the prescribed experience shall be counted<span style={styles.fieldLine}></span>
                <br /><b>Note:</b> Only those experience certificates shall be accepted, which shall be in accordance with Rule Notification # AJKPSC/1-2017/1077-10782 approved by AJK PSC. (Rules Attached)
              </td>
              <td style={styles.tableCell}>
                <br />
                (i)&nbsp;&nbsp;{requisition.qualification?.experience_type || 'N/A'}<span style={styles.fieldLine}></span>
                (ii)&nbsp;&nbsp;{requisition.qualification?.experience_length || 'N/A'}<span style={styles.fieldLine}></span>
                (iii)&nbsp;&nbsp;{requisition.qualification?.min_qualification || 'N/A'}<span style={styles.fieldLine}></span>
              </td>
            </tr>

            <tr>
              <th style={styles.number}>6</th>
              <td style={styles.tableCell}>
                <b>Age Limit</b><br />
                (i) Minimum<span style={styles.fieldLine}></span>
                (ii) Maximum<span style={styles.fieldLine}></span>
                (iii) Relaxation, if any, approved by the Government
                <p style={{ marginBottom: '10px' }}></p>
              </td>
              <td style={styles.tableCell}>
                <br />
                (i)&nbsp;&nbsp;{requisition.eligibility?.min_age || 'N/A'}<span style={styles.fieldLine}></span>
                (ii)&nbsp;&nbsp;{requisition.eligibility?.max_age || 'N/A'}<span style={styles.fieldLine}></span>
                (iii)&nbsp;&nbsp;{requisition.eligibility?.age_relaxation || 'N/A'}<span></span>
              </td>
            </tr>

            <tr>
              <th style={styles.number}>7</th>
              <td style={styles.tableCell}>Nationality</td>
              <td style={styles.tableCell}>{requisition.eligibility?.nationality || 'N/A'}<span className=""></span></td>
            </tr>

            <tr>
              <th style={styles.number}>8</th>
              <td style={styles.tableCell}>Domicile (Name Districts/Units)</td>
              <td style={styles.tableCell}>{requisition.eligibility?.domicile || 'N/A'}<span className=""></span></td>
            </tr>

            <tr>
              <th style={styles.number}>9</th>
              <td style={styles.tableCell}>Detail of District wise quota for the posts requisitioned here.</td>
              <td style={styles.tableCell}>
                Total Posts:&nbsp;&nbsp;{requisition.num_posts || 'N/A'} <span style={styles.fieldLine}></span>
                {requisition.multiple_posts && requisition.multiple_posts.length > 0 && (
                  <table style={styles.subTable}>
                    <thead>
                      <tr>
                        <th style={styles.subTableHeader}>District/Unit</th>
                        <th style={styles.subTableHeader}>Quota</th>
                        <th style={styles.subTableHeader}>Posts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requisition.multiple_posts.map((post, index) => (
                        <tr key={index}>
                          <td style={styles.subTableCell}>{post.district}</td>
                          <td style={styles.subTableCell}>{post.quota}</td>
                          <td style={styles.subTableCell}>{post.post}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </td>
            </tr>

            <tr>
              <th style={styles.number}>10</th>
              <td style={styles.tableCell}>Any other condition of qualification, etc. not covered by the above mentioned details</td>
              <td style={styles.tableCell}>{requisition.eligibility?.other_conditions || 'N/A'}</td>
            </tr>

            <tr>
              <th style={styles.number}>11</th>
              <td style={styles.tableCell}>Gender Specific/Quota basis/Open Merit</td>
              <td style={styles.tableCell}>{requisition.eligibility?.gender_basis || 'N/A'}<span className=""></span></td>
            </tr>
          </tbody>
        </table>

        <div style={styles.certified}>
          <p style={{ marginBottom: '10px' }}><b>It is certified that:-</b></p>
          <p style={{ marginBottom: '8px' }}>(i) The data given as mentioned above along with Annex "A" is correct in accordance with the official record and no vacant post is left un-mentioned till today in this requisition form.</p>
          <p style={{ marginBottom: '8px' }}>(ii) That no vacant post under above mentioned category is left behind, which is still not filled on permanent basis through PSC and that all vacant posts fall vacant till today are incorporated in this requisition.</p>
          <p style={{ marginBottom: '8px' }}>(iii) That the department is strictly following the Rule (3) of AJ&K Public Service Commission (Procedure) Rules, 1994 & decision of Supreme Court of Azad Jammu and Kashmir in "Raja Muhammad Waseem & others VS Azad Govt. & others" dated 03/04/2017 in this regard.</p>
        </div>

        <div style={styles.signature}>
          Signature of Administrative Secretary<br />
          of the Department<br />
          Date: ______________________<br />
          Stamp: ______________________
        </div>
      </div>

      <div className="text-center mt-6">
        <button
          onClick={() => navigate('/dashboard/requisitions')}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors mx-auto"
        >
          <ArrowLeft size={18} />
          Back to Requisitions
        </button>
      </div>
    </motion.div>
  );
};

const styles = {
  container: {
    fontFamily: "'Roboto', sans-serif",
    color: '#000',
  },
  h2: {
    textAlign: 'center',
    fontSize: '23px',
    color: 'black',
    marginBottom: '5px',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  h3: {
    textAlign: 'center',
    fontSize: '16px',
    color: 'black',
    marginBottom: '20px',
    fontWeight: '500',
  },
  p: {
    fontSize: '14px',
    lineHeight: '1.4',
    marginBottom: '10px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
    border: '1px solid #000',
  },
  tableCell: {
    border: '1px solid #000',
    padding: '6px 8px',
    verticalAlign: 'top',
    fontSize: '14px',
  },
  number: {
    width: '30px',
    textAlign: 'center',
    fontWeight: 'bold',
    border: '1px solid #000',
    padding: '6px 8px',
    verticalAlign: 'top',
    fontSize: '14px',
    backgroundColor: '#f5f5f5',
  },
  instructions: {
    marginTop: '15px',
    marginBottom: '15px',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  fieldLine: {
    display: 'block',
    borderBottom: '1px solid #000',
    width: '100%',
    height: '18px',
    margin: '4px 0',
  },
  subTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '8px',
    border: '1px solid #000',
  },
  subTableHeader: {
    border: '1px solid #000',
    padding: '4px',
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  subTableCell: {
    border: '1px solid #000',
    padding: '4px',
    textAlign: 'center',
    fontSize: '14px',
  },
  certified: {
    marginTop: '25px',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  signature: {
    marginTop: '40px',
    textAlign: 'right',
    fontSize: '14px',
    lineHeight: '1.8',
  },
};

export default RequisitionDetail;
