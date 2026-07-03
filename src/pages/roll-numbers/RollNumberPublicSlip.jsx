import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, XCircle } from 'lucide-react';
import Config from 'config/baseUrl';

const InfoRow = ({ label, value, bold }) => (
  <div className="flex text-sm py-0.5">
    <span className="w-36 font-bold text-emerald-950 shrink-0">{label}</span>
    <span className="w-3 shrink-0">:</span>
    <span className={bold ? 'font-bold' : ''}>{value}</span>
  </div>
);

const to12Hour = (t) => {
  if (!t || t === '—') return t || '—';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')}${period}`;
};
const timeRange = (start, end) => end ? `${to12Hour(start)} to ${to12Hour(end)}` : to12Hour(start);

const RollNumberPublicSlip = () => {
  const { rollNumber } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch(`${Config.apiUrl}/roll-numbers/verify/${encodeURIComponent(rollNumber)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        else setError(res.message || 'Roll number not found');
      })
      .catch(() => setError('Failed to connect. Please try again.'))
      .finally(() => setLoading(false));
  }, [rollNumber]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500">Loading slip…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow p-10 flex flex-col items-center gap-3 max-w-sm w-full">
        <XCircle size={36} className="text-red-500" />
        <p className="font-bold text-slate-800">Slip Not Found</p>
        <p className="text-sm text-slate-500 text-center">{error}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-emerald-700 underline mt-2">Go back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-slate-300">|</span>
        <span className="text-sm font-semibold text-slate-700">Roll Number Slip — {data.rollNo}</span>
        <button onClick={() => window.print()} className="ml-auto text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700">
          Print / Save PDF
        </button>
      </div>

      {/* Slip */}
      <div className="max-w-4xl mx-auto my-6 bg-white shadow border border-slate-200 rounded-lg p-10 print:shadow-none print:rounded-none print:m-0"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}>

        {/* HEADER */}
        <div className="pb-2 border-b-4 border-double border-emerald-900 mb-3">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '89px', minHeight: '78px', paddingRight: '160px', textAlign: 'center' }}>
            {data.logoDataUri
              ? <img src={data.logoDataUri} alt="AJK PSC Logo" className="shrink-0" style={{ width: '72px', height: '72px', display: 'block', objectFit: 'contain', flex: '0 0 auto' }} />
              : <div className="rounded-full bg-emerald-900 shrink-0" style={{ width: '72px', height: '72px', flex: '0 0 auto' }} />}
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#064e3b', lineHeight: 1.15, textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.01em' }}>Azad Jammu &amp; Kashmir</div>
              <div style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.01em', marginTop: '2px' }}>Public Service Commission</div>
              <div style={{ display: 'block', fontSize: '14px', fontWeight: 700, lineHeight: 1.2, marginTop: '4px', textTransform: 'none' }}>Jalalabad, Muzaffarabad.</div>
              <div className="mt-3">
                <span className="text-base font-black underline text-emerald-900 tracking-widest">Admission Letter For Test/Examination</span>
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATE DETAILS */}
        <div className="border-2 border-emerald-900 rounded p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 space-y-0.5">
              <InfoRow label="Name"               value={data.candidateName} bold />
              <InfoRow label="Father/Husband Name" value={data.fatherName || '—'} />
              <InfoRow label="CNIC No"            value={data.cnic || '—'} />
              <InfoRow label="Roll No"            value={<span className="font-mono font-bold text-lg tracking-wide">{data.rollNo}</span>} />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <div className="grid gap-2" style={{ gridTemplateColumns: '214px 120px' }}>
                <div className="border-2 border-emerald-900 bg-emerald-50 flex items-center justify-center overflow-hidden" style={{ width: '218px', height: '142px' }}>
                  {data.cnicDataUri
                    ? <img src={data.cnicDataUri} alt="CNIC Front" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span className="text-xs text-slate-400 text-center">CNIC<br/>Front<br/>Here</span>}
                </div>
                <div className="border-2 border-emerald-900 bg-emerald-50 flex items-center justify-center overflow-hidden" style={{ width: '120px', height: '142px' }}>
                  {data.photoDataUri
                    ? <img src={data.photoDataUri} alt="Candidate" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span className="text-xs text-slate-400 text-center">Paste<br/>Photo<br/>Here</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BODY NOTE */}
        {data.slipNoteHtml && (
          <>
            <hr className="border-slate-200 my-2" />
            <div
              className="text-sm leading-relaxed text-justify mb-3 [&_.greeting]:italic [&_.greeting]:font-bold [&_.greeting]:block [&_.greeting]:mb-1 [&_.highlight]:underline [&_.highlight]:font-bold [&_p]:mb-1"
              dangerouslySetInnerHTML={{ __html: data.slipNoteHtml }}
            />
          </>
        )}

        {/* EXAM CENTRE & SCHEDULE */}
        <div className="mb-3">
          <p className="text-center font-bold underline text-emerald-900 mb-1.5">EXAMINATION / TEST CENTRE &amp; SCHEDULE</p>
          <InfoRow label="Exam Center" value={<><strong>{(data.examCenter || '').toUpperCase()}</strong>{data.examCity ? `, ${data.examCity.toUpperCase()}` : ''}</>} />
          <InfoRow label="District"    value={data.district} />

          {data.sessionGroups?.length > 0 && (() => {
            const hasLabels = data.sessionGroups.some(g => g.label);
            const descKey = (posts) => (posts ?? []).map(p =>
              `${p.advertisementNo ?? ''}||${p.department ?? ''}||${p.postName ?? ''}`
            ).join('|');
            const firstKey = descKey(data.sessionGroups[0]?.posts);
            const allSameDesc = data.sessionGroups.length > 1 && data.sessionGroups.every(g => descKey(g.posts) === firstKey);
            return (
              <table className="w-full border-collapse border-2 border-emerald-900 mt-2 text-sm">
                <thead>
                  <tr className="bg-emerald-50">
                    <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs whitespace-nowrap">DAY</th>
                    <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs whitespace-nowrap">DATE</th>
                    <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs whitespace-nowrap">TIME</th>
                    {hasLabels && <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs whitespace-nowrap">SUBJECT/PAPER</th>}
                    <th className="border border-emerald-900 px-2 py-1 text-emerald-900 text-xs">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessionGroups.map((group, idx) => (
                    <tr key={idx} className="text-center">
                      <td className="border border-emerald-900 px-2 py-1 align-middle whitespace-nowrap">{group.day || '—'}</td>
                      <td className="border border-emerald-900 px-2 py-1 align-middle whitespace-nowrap">{group.date || '—'}</td>
                      <td className="border border-emerald-900 px-2 py-1 align-middle whitespace-nowrap">{timeRange(group.time, group.endTime)}</td>
                      {hasLabels && <td className="border border-emerald-900 px-2 py-1 align-middle whitespace-nowrap font-bold text-emerald-900">{group.label || '—'}</td>}
                      {(!allSameDesc || idx === 0) && (
                        <td className="border border-emerald-900 px-2 py-1 text-left font-bold text-emerald-900 align-top"
                            rowSpan={allSameDesc ? data.sessionGroups.length : undefined}>
                          {group.posts?.map((post, pIdx) => (
                            <div key={pIdx} className={pIdx > 0 ? 'border-t border-emerald-100 mt-1 pt-1' : ''}>
                              {[post.advertisementNo, post.postName, post.department].filter(Boolean).join(', ')}
                            </div>
                          ))}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* INSTRUCTIONS */}
        {data.slipInstructionHtml && (
          <div
            className="mb-4 text-sm [&_.instructions-heading]:font-bold [&_.instructions-heading]:underline [&_.instructions-heading]:block [&_.instructions-heading]:mb-1 [&_.instructions-heading]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-xs [&_li]:leading-snug [&_li]:mb-0.5 [&_.warn]:text-red-900 [&_p]:text-xs [&_p]:mt-2"
            dangerouslySetInnerHTML={{ __html: data.slipInstructionHtml }}
          />
        )}

        {/* FOOTER */}
        <div className="mt-4 pt-2 border-t-2 border-emerald-900 text-center">
          <p className="text-xs font-bold text-emerald-900">Azad Jammu &amp; Kashmir Public Service Commission</p>
          <p className="text-[11px] text-slate-600">Muzaffarabad &nbsp;|&nbsp; www.ajkpsc.gop.pk &nbsp;|&nbsp; info@ajkpsc.gop.pk</p>
          <p className="text-[10px] text-slate-500 border-t border-slate-200 mt-1 pt-1">
            <strong className="text-emerald-900">This is a system-generated document.</strong>
            &nbsp;·&nbsp; Verified on {data.verifiedAt} &nbsp;·&nbsp; Roll No: {data.rollNo}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RollNumberPublicSlip;
