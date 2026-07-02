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
        const primaryData = result.data;
        if (process.env.NODE_ENV !== 'production') console.log('[SlipViewData]', JSON.stringify(primaryData, null, 2));

        // Find other applications that share the same roll number (clubbed posts)
        // and merge their exam sessions into this slip
        let allSessions = [...(primaryData.examSessions || [])];
        try {
          const r = await RollNumberApi.getShortlisted({ per_page: 500 });
          const rollRecords = r?.data?.data ?? [];
          const siblings = rollRecords.filter(
            item => item.roll_number === primaryData.rollNo && item.application_number !== applicationNumber
          );
          for (const sibling of siblings) {
            try {
              const r2 = await RollNumberApi.getSlipViewData(sibling.application_number);
              const extra = r2?.data?.examSessions ?? [];
              allSessions = [...allSessions, ...extra];
            } catch { /* skip silently */ }
          }
        } catch { /* use primary sessions only */ }

        if (!cancelled) setData({ ...primaryData, examSessions: allSessions });
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
          <div className="pb-2 border-b-4 border-double border-emerald-900 mb-3">
            <div className="flex items-start justify-between">
              {/* Left: Logo + Title */}
              <div className="flex items-center gap-3">
                {data.logoDataUri ? (
                  <img src={data.logoDataUri} alt="AJK PSC Logo" className="h-16 shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-emerald-900 shrink-0" />
                )}
                <div>
                  <div className="text-sm font-extrabold text-emerald-900 tracking-wide uppercase">Azad Jammu &amp; Kashmir</div>
                  <div className="text-base font-black text-emerald-900 uppercase tracking-wide leading-tight">Public Service Commission</div>
                  <div className="text-sm font-bold text-emerald-900 mt-0.5">Jalalabad, Muzaffarabad.</div>
                </div>
              </div>
              {/* Right: EXAMINATION SLIP label + dated/ref */}
              <div className="text-right shrink-0 pl-4">
                <div className="text-sm font-bold underline text-emerald-900 tracking-widest uppercase leading-tight">EXAMINATION<br/>SLIP</div>
                <div className="text-xs text-slate-500 mt-1">Dated: {data.generatedAt}</div>
              </div>
            </div>
          </div>

          {/* CANDIDATE DETAILS CARD */}
          <div className="border-2 border-emerald-900 rounded p-3 mb-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 space-y-0.5">
                <InfoRow label="Name" value={data.candidateName} bold />
                <InfoRow label="Father/Husband Name" value={data.fatherName || data.fatherHusbandName || data.father_name || data.father_husband_name || '—'} />
                <InfoRow label="CNIC No" value={data.candidateCnic || '—'} />
                <InfoRow label="Roll No" value={<span className="font-mono font-bold text-lg tracking-wide">{data.rollNo}</span>} />
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

          {/* BODY TEXT — dynamic from Roll Number Slip Note settings */}
          {data.slipNoteHtml && (
            <>
              <hr className="border-slate-200 my-2" />
              <div
                className="text-sm leading-relaxed text-justify mb-3 [&_.greeting]:italic [&_.greeting]:font-bold [&_.greeting]:block [&_.greeting]:mb-1 [&_.highlight]:underline [&_.highlight]:font-bold [&_p]:mb-1"
                dangerouslySetInnerHTML={{ __html: data.slipNoteHtml }}
              />
            </>
          )}

          {/* SCHEDULE */}
          <div className="mb-3">
            <p className="text-center font-bold underline text-emerald-900 mb-1.5">EXAMINATION / TEST CENTRE &amp; SCHEDULE</p>
            <InfoRow label="Exam Center" value={<><strong>{(data.examCenter || '').toUpperCase()}</strong>{data.examCity ? `, ${data.examCity.toUpperCase()}` : ''}</>} />
            <InfoRow label="District" value={data.district} />

            {Array.isArray(data.examSessions) && data.examSessions.length > 0 && (() => {
              const to12Hour = (t) => {
                if (!t) return '—';
                const [h, m] = t.split(':').map(Number);
                if (isNaN(h)) return t;
                const period = h >= 12 ? 'PM' : 'AM';
                const hour = h % 12 || 12;
                return `${hour}:${String(m || 0).padStart(2, '0')} ${period}`;
              };
              // Group sessions sharing the same day+date+time into one table row
              const groups = Object.values(
                data.examSessions.reduce((acc, s) => {
                  const key = `${s.day}||${s.date}||${s.time}`;
                  if (!acc[key]) acc[key] = { day: s.day, date: s.date, time: s.time, posts: [] };
                  acc[key].posts.push(s);
                  return acc;
                }, {})
              );
              return (
                <table className="w-full border-collapse border-2 border-emerald-900 mt-2 text-sm">
                  <thead>
                    <tr className="bg-emerald-50">
                      <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs whitespace-nowrap">DAY</th>
                      <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs whitespace-nowrap">DATE</th>
                      <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs whitespace-nowrap">ATTENDANCE TIME</th>
                      <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs">DESCRIPTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group, idx) => (
                      <tr key={idx} className="text-center">
                        <td className="border border-emerald-900 px-2 py-1 whitespace-nowrap align-middle">{group.day || '—'}</td>
                        <td className="border border-emerald-900 px-2 py-1 whitespace-nowrap align-middle">{group.date || '—'}</td>
                        <td className="border border-emerald-900 px-2 py-1 whitespace-nowrap align-middle">{to12Hour(group.time)}</td>
                        <td className="border border-emerald-900 px-2 py-1 text-left font-bold text-emerald-900">
                          {group.posts.map((session, pIdx) => (
                            <div key={pIdx} className={pIdx > 0 ? 'border-t border-emerald-100 mt-1 pt-1' : ''}>
                              {[
                                session.advertisementNo || session.advertisement_no || data.advertisementNo,
                                session.department || session.departmentName || session.department_name || data.department,
                                session.postName || null,
                              ].filter(Boolean).join(', ') || '—'}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>

          {/* INSTRUCTIONS — dynamic from Roll Number Slip Instruction settings */}
          {data.slipInstructionHtml && (
            <div
              className="mb-4 text-sm [&_.instructions-heading]:font-bold [&_.instructions-heading]:underline [&_.instructions-heading]:block [&_.instructions-heading]:mb-1 [&_.instructions-heading]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-xs [&_li]:leading-snug [&_li]:mb-0.5 [&_.warn]:text-red-900 [&_p]:text-xs [&_p]:mt-2"
              dangerouslySetInnerHTML={{ __html: data.slipInstructionHtml }}
            />
          )}

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
              Generated: {data.generatedAt}
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
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RollSlipView;
