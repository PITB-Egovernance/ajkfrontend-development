import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberApi from 'api/rollNumberApi';

const InfoRow = ({ label, value, bold }) => (
  <div className="flex text-sm py-0.5">
    <span className="w-36 font-bold text-emerald-950 shrink-0">{label}</span>
    <span className="w-3 shrink-0">:</span>
    <span className={bold ? 'font-bold' : ''}>{value}</span>
  </div>
);

const RollSlipView = () => {
  const navigate = useNavigate();
  const { applicationNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await RollNumberApi.getSlipViewData(applicationNumber);
        if (!cancelled) setData(result.data);
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || 'Failed to load slip');
          navigate(-1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [applicationNumber, navigate]);

  const handleDownload = async () => {
    setDownloading(true);
    const tid = toast.loading('Preparing slip PDF…');
    try {
      const res = await RollNumberApi.downloadSlip(applicationNumber);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.dismiss(tid);
        toast.error(err.message || 'Failed to download slip');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AdmissionSlip_${applicationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.dismiss(tid);
      toast.success('Slip downloaded successfully');
    } catch {
      toast.dismiss(tid);
      toast.error('Could not download slip');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER (not part of the slip itself) */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg"><Hash size={18} className="text-emerald-800" /></div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Roll Number Slip</h1>
              <p className="text-xs text-slate-500">{applicationNumber}</p>
            </div>
          </div>
        </div>
        <Button variant="primary" size="sm" className="gap-2" onClick={handleDownload} disabled={!data || downloading}>
          <Download size={15} /> {downloading ? 'Preparing…' : 'Download PDF'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <InlineLoader text="Loading slip…" variant="ring" size="lg" />
        </div>
      ) : data ? (
        <div className="max-w-5xl mx-auto my-6 bg-white shadow-sm border border-slate-200 rounded-lg p-10" style={{ fontFamily: "'Times New Roman', Times, serif" }}>

          {/* HEADER */}
          <div className="text-center pb-2 border-b-4 border-double border-emerald-900 mb-3">
            {data.logoDataUri ? (
              <img src={data.logoDataUri} alt="AJK PSC Logo" className="h-16 mx-auto mb-1" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-emerald-900 mx-auto mb-1" />
            )}
            <div className="text-base font-bold text-emerald-900 tracking-wide">Azad Jammu &amp; Kashmir</div>
            <div className="text-sm font-bold text-emerald-900">Public Service Commission Muzaffarabad</div>
            <div className="text-sm font-bold underline mt-0.5 tracking-wide">Examination Slip</div>
          </div>

          {/* CANDIDATE DETAILS CARD */}
          <div className="border-2 border-emerald-900 rounded p-3 mb-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 space-y-0.5">
                <InfoRow label="Name" value={data.candidateName} bold />
                <InfoRow label="Post Name" value={<>{data.postName}{data.postScale ? <strong> (BS-{data.postScale})</strong> : null}</>} />
                <InfoRow label="Advertisement No" value={data.advertisementNo} />
                <InfoRow label="Roll No" value={<span className="font-mono font-bold text-lg tracking-wide">{data.rollNo}</span>} />
                <InfoRow label="Department" value={data.department} />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <div className="grid gap-2" style={{ gridTemplateColumns: '214px 120px' }}>
                  <div style={{ width: '230px' }}>
                    <div className="border-2 border-emerald-900 bg-emerald-50 flex items-center justify-center overflow-hidden" style={{ width: '218px', height: '142px' }}>
                      {data.cnicDataUri
                        ? <img src={data.cnicDataUri} alt="CNIC Front" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span className="text-xs text-slate-500 text-center">CNIC<br/>Front<br/>Here</span>}
                    </div>
                  </div>
                  <div style={{ width: '120px' }}>
                    <div className="border-2 border-emerald-900 bg-emerald-50 flex items-center justify-center overflow-hidden" style={{ width: '120px', height: '142px' }}>
                      {data.photoDataUri
                        ? <img src={data.photoDataUri} alt="Candidate" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span className="text-xs text-slate-500 text-center">Paste<br/>Photo<br/>Here</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BODY TEXT */}
          <div className="text-sm leading-relaxed text-justify mb-3">
            <p className="italic font-bold mb-1">Aslam o alikum!</p>
            You are hereby intimated that AJK Public Service Commission plans to conduct examination for the
            aforementioned post on <span className="underline font-bold">{data.examDate || data.generatedAt}</span> at{' '}
            <span className="underline font-bold">{data.attendanceTime || 'Scheduled Time'}</span>.
            Hence, this Examination Slip is being issued in your favor to participate therein. It is pertinent
            to clarify that the AJK Public Service Commission is allowing you to sit for the exam without preliminary
            review of your documents. You may participate in this examination at your own risk, however, following
            the exam, if it is determined through scrutiny that you do not meet the necessary requirements/criterion
            (i.e. education, experience, district, age etc) for this post, in that case your candidature shall
            automatically stand forfeited for being not eligible thereof. In such circumstances, you will not be
            called for interview etc.
          </div>

          {/* SCHEDULE */}
          <div className="mb-3">
            <p className="text-center font-bold underline text-emerald-900 mb-1.5">EXAMINATION / TEST CENTRE &amp; SCHEDULE</p>
            <InfoRow label="Exam Center" value={<><strong>{(data.examCenter || '').toUpperCase()}</strong>{data.examCity ? `, ${data.examCity.toUpperCase()}` : ''}</>} />
            <InfoRow label="District" value={data.district} />
            <InfoRow label="Subject" value={<strong>{data.subject}</strong>} />

            {Array.isArray(data.examSessions) && data.examSessions.length > 0 && (
              <table className="w-full border-collapse border-2 border-emerald-900 mt-2 text-sm">
                <thead>
                  <tr className="bg-emerald-50">
                    <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs">DAY</th>
                    <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs">DATE</th>
                    <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs">ATTENDANCE TIME</th>
                    <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs">POST NAME</th>
                  </tr>
                </thead>
                <tbody>
                  {data.examSessions.map((session, idx) => (
                    <tr key={idx} className="text-center">
                      <td className="border border-emerald-900 px-2 py-1">{session.day || '—'}</td>
                      <td className="border border-emerald-900 px-2 py-1">{session.date || '—'}</td>
                      <td className="border border-emerald-900 px-2 py-1">{session.time || '—'}</td>
                      <td className="border border-emerald-900 px-2 py-1 text-left font-bold text-emerald-900">{session.postName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* INSTRUCTIONS */}
          <div className="mb-3">
            <p className="font-bold underline text-sm mb-1">Instructions for participation in the exam:</p>
            <ol className="list-decimal pl-5 space-y-0.5 text-xs">
              <li>Please ensure to bring your National Identity Card (Original) and Call Letter also.</li>
              <li>You are required to reach the Examination Hall at least 30 minutes before the start of the exam.</li>
              <li>Bring your exam folder, pen/marker (blue/black).</li>
              <li className="text-red-900">All type of written material, calculator, mobile, cordless phone, wrist watch (with calculator) or any type of other mechanical aid or a weapon are strictly prohibited. Moreover, use of whitener fluid is not allowed at answer sheet.</li>
              <li className="text-red-900">Use of any illegal mean in the exam may result in your disqualification.</li>
              <li>No claims for TA/DA will be entertained.</li>
              <li>No entry after 15 minutes of commencement of exam. This is only on justifiable grounds where circumstances found beyond human control.</li>
              <li>You will not be allowed to enter in the examination hall if you are not fulfilling above conditionalities.</li>
            </ol>
          </div>

          {/* CONTACT */}
          <div className="text-sm mb-4">
            <p className="mb-1">For any query please contact at following telephone numbers:</p>
            <div className="flex flex-wrap gap-x-4 text-xs font-bold">
              <span>• 05822-920206</span>
              <span>• 05822-920016</span>
              <span>• 05822-920214</span>
              <span>• 05822-920204</span>
            </div>
          </div>

          {/* FOOTER */}
          <div className="grid grid-cols-3 items-end text-center mb-2">
            <div>
              {data.qrDataUri && (
                <>
                  <img src={data.qrDataUri} alt="QR Code" className="w-16 h-16 mx-auto" />
                  <p className="text-[10px] text-slate-500 mt-0.5">{data.candidateCnic}</p>
                </>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Generated: {data.generatedAt}<br />
              Ref: {data.applicationNo}
            </div>
            <div>
              <div className="border-t border-slate-600 w-28 mx-auto mb-1" />
              <p className="text-xs font-bold">Assistant Director Examination</p>
              <p className="text-[11px] text-slate-600">AJK PSC Muzaffarabad</p>
            </div>
          </div>

          <hr className="border-t border-dashed border-slate-400 my-3" />
          <p className="text-center text-xs text-slate-500">No. PSC / Examination / Online {data.rollNo}</p>

          <div className="mt-2 pt-1 border-t-2 border-emerald-900 text-center">
            <p className="text-xs font-bold text-emerald-900">Azad Jammu &amp; Kashmir Public Service Commission</p>
            <p className="text-[11px] text-slate-600">Plot-13, Chattar Domel, Muzaffarabad &nbsp;|&nbsp; www.ajkpsc.gop.pk &nbsp;|&nbsp; info@ajkpsc.gop.pk</p>
            <p className="text-[10px] text-slate-500 border-t border-slate-200 mt-1 pt-1">
              <strong className="text-emerald-900">This is a system-generated document.</strong>
              &nbsp;&middot;&nbsp; Generated on {data.generatedAt}
              &nbsp;&middot;&nbsp; Document Ref: {data.applicationNo}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RollSlipView;
