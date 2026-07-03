import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import Config from 'config/baseUrl';

const Row = ({ label, value }) => (
  <div className="flex gap-2 py-1.5 border-b border-slate-100 last:border-0">
    <span className="w-44 shrink-0 font-semibold text-slate-600 text-sm">{label}</span>
    <span className="text-slate-400 shrink-0">:</span>
    <span className="text-slate-900 text-sm font-medium">{value || '—'}</span>
  </div>
);

const to12Hour = (t) => {
  if (!t || t === '—') return t || '—';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${period}`;
};

const RollNumberVerify = () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex flex-col items-center justify-center p-4">

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-3">
          <CheckCircle size={32} className="text-emerald-700" />
        </div>
        <h1 className="text-xl font-black text-emerald-900 tracking-wide uppercase">AJK Public Service Commission</h1>
        <p className="text-sm text-slate-500 mt-0.5">Roll Number Slip Verification</p>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-emerald-600 animate-spin" />
            <p className="text-sm text-slate-500">Verifying roll number…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle size={28} className="text-red-600" />
            </div>
            <p className="text-base font-bold text-slate-800">Verification Failed</p>
            <p className="text-sm text-slate-500 text-center">{error}</p>
            <code className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-mono mt-1">{rollNumber}</code>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Verified badge */}
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Roll Number</p>
                <p className="text-white text-2xl font-black font-mono tracking-widest mt-0.5">{data.rollNo}</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-700 rounded-full px-3 py-1.5">
                <CheckCircle size={14} className="text-emerald-200" />
                <span className="text-emerald-100 text-xs font-semibold">Verified</span>
              </div>
            </div>

            {/* Candidate details */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Candidate Information</p>
              <Row label="Candidate Name"    value={data.candidateName} />
              <Row label="Father/Husband Name" value={data.fatherName} />
              <Row label="CNIC No"           value={data.cnic} />
            </div>

            {/* Exam details */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Exam Centre</p>
              <Row label="Exam Center" value={`${data.examCenter}${data.examCity ? `, ${data.examCity}` : ''}`} />
              <Row label="District"    value={data.district} />
            </div>

            {/* Schedule table */}
            {data.sessionGroups?.length > 0 && (
              <div className="px-6 py-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Examination Schedule</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-emerald-50">
                        <th className="border border-slate-200 px-2 py-2 text-emerald-800 font-bold text-left whitespace-nowrap">Day</th>
                        <th className="border border-slate-200 px-2 py-2 text-emerald-800 font-bold text-left whitespace-nowrap">Date</th>
                        <th className="border border-slate-200 px-2 py-2 text-emerald-800 font-bold text-left whitespace-nowrap">Time</th>
                        <th className="border border-slate-200 px-2 py-2 text-emerald-800 font-bold text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sessionGroups.map((group, idx) => (
                        <tr key={idx} className="even:bg-slate-50">
                          <td className="border border-slate-200 px-2 py-2 align-middle whitespace-nowrap">{group.day || '—'}</td>
                          <td className="border border-slate-200 px-2 py-2 align-middle whitespace-nowrap">{group.date || '—'}</td>
                          <td className="border border-slate-200 px-2 py-2 align-middle whitespace-nowrap">{to12Hour(group.time)}</td>
                          <td className="border border-slate-200 px-2 py-2 align-top font-semibold text-emerald-900">
                            {group.posts?.map((post, pIdx) => (
                              <div key={pIdx} className={pIdx > 0 ? 'border-t border-emerald-100 mt-1 pt-1' : ''}>
                                {[post.advertisementNo, post.department, post.postName].filter(Boolean).join(', ')}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View Full Slip */}
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => navigate(`/verify/roll/${encodeURIComponent(rollNumber)}/slip`)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                <FileText size={16} /> View Full Examination Slip
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400">Verified on {data.verifiedAt} &nbsp;·&nbsp; AJK Public Service Commission, Muzaffarabad</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RollNumberVerify;
