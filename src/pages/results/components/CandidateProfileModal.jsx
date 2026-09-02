import React, { useEffect, useState } from 'react';
import { X, User, GraduationCap, Briefcase, FileText, Download, AlertTriangle, FileBadge } from 'lucide-react';
import Button from 'components/ui/Button';
import PostResultApi from 'api/postResultApi';
import toast from 'react-hot-toast';

// Candidate profile/documents live on the separate candidate-portal service —
// this modal is a thin, read-only viewer over whatever shape that service
// returns, so field names are read defensively (several possible key
// spellings tried per section) rather than assumed exact.
const PERSONAL_FIELD_LABELS = {
  full_name: 'Full Name', candidate_name: 'Full Name', name: 'Full Name',
  cnic: 'CNIC', candidate_cnic: 'CNIC',
  email: 'Email', candidate_email: 'Email',
  mobile: 'Mobile', phone: 'Mobile', candidate_mobile: 'Mobile',
  dob: 'Date of Birth', date_of_birth: 'Date of Birth',
  gender: 'Gender',
  district: 'District', domicile_district: 'Domicile District', district_code: 'District',
  religion: 'Religion',
  address: 'Address', permanent_address: 'Permanent Address', current_address: 'Current Address',
  father_name: "Father's Name",
  disability: 'Disability',
};

const humanizeKey = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const Field = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{String(value)}</p>
    </div>
  );
};

const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
      <Icon size={15} className="text-emerald-700" />
      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export default function CandidateProfileModal({ isOpen, onClose, identifier, candidateName }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!isOpen || !identifier) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);
    PostResultApi.getCandidateProfile(identifier)
      .then((res) => { if (!cancelled) setProfile(res.data || res); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load candidate profile'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, identifier]);

  if (!isOpen) return null;

  const personalDetails = profile?.personal_details || profile?.personalDetails || profile || {};
  const education = profile?.education_records || profile?.education || [];
  const experience = profile?.experience_records || profile?.experience || [];
  const documents = profile?.documents || [];

  const handleDownloadDocument = async (doc) => {
    const docHash = doc.doc_type || doc.type || doc.hash || doc.id;
    if (!docHash) { toast.error('This document has no identifiable type/hash to download'); return; }
    try {
      await PostResultApi.downloadCandidateDocument(identifier, docHash, doc.original_filename || doc.file_name);
    } catch (err) {
      toast.error(err.message || 'Failed to download document');
    }
  };

  const handleDownloadApplicationForm = async () => {
    try {
      await PostResultApi.downloadApplicationForm(identifier, `application-form-${identifier}.pdf`);
    } catch (err) {
      toast.error(err.message || 'Failed to download application form');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{candidateName || 'Candidate Profile'}</h3>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Application {identifier}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider animate-pulse">Loading profile...</p>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Couldn't load this profile</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <>
              <SectionCard icon={User} title="Personal Details">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  {Object.entries(personalDetails)
                    .filter(([k, v]) => typeof v !== 'object')
                    .map(([k, v]) => (
                      <Field key={k} label={PERSONAL_FIELD_LABELS[k] || humanizeKey(k)} value={v} />
                    ))}
                </div>
              </SectionCard>

              {education.length > 0 && (
                <SectionCard icon={GraduationCap} title="Education">
                  <div className="space-y-3">
                    {education.map((e, i) => (
                      <div key={i} className="text-sm text-slate-700 border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                        <span className="font-semibold">{e.degree || e.qualification || e.level}</span>
                        {e.institute && <span className="text-slate-500"> — {e.institute}</span>}
                        {(e.marks_obtained || e.obtained_marks) && (
                          <span className="text-slate-500"> · {e.marks_obtained || e.obtained_marks}/{e.total_marks} marks</span>
                        )}
                        {e.year && <span className="text-slate-500"> · {e.year}</span>}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {experience.length > 0 && (
                <SectionCard icon={Briefcase} title="Experience">
                  <div className="space-y-3">
                    {experience.map((e, i) => (
                      <div key={i} className="text-sm text-slate-700 border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                        <span className="font-semibold">{e.designation || e.position}</span>
                        {e.organization && <span className="text-slate-500"> — {e.organization}</span>}
                        {(e.from_date || e.start_date) && (
                          <span className="text-slate-500"> · {e.from_date || e.start_date} to {e.to_date || e.end_date || 'present'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              <SectionCard icon={FileText} title="Documents">
                <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                  <Button size="sm" variant="outline" onClick={handleDownloadApplicationForm}>
                    <FileBadge size={14} className="mr-1.5" /> Download Full Application Form
                  </Button>
                </div>
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-400">No uploaded documents on record.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white">
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {(doc.doc_type || doc.type || 'Document').replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          <Download size={13} /> Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
