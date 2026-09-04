import React, { useEffect, useState } from 'react';
import { X, User, GraduationCap, Briefcase, FileText, Download, AlertTriangle, FileBadge, Award, ShieldAlert } from 'lucide-react';
import Button from 'components/ui/Button';
import PostResultApi from 'api/postResultApi';
import toast from 'react-hot-toast';

// Candidate profile/documents live on the separate candidate-portal service —
// this modal renders its real `data.personal` shape (confirmed live against
// GET /api/admin/candidates/{id} on the candidate portal), with a few
// defensive fallback key spellings kept in case that contract shifts.
const PERSONAL_FIELD_LABELS = {
  name: 'Full Name', full_name: 'Full Name', candidate_name: 'Full Name',
  father_name: "Father's Name",
  cnic: 'CNIC', candidate_cnic: 'CNIC',
  email: 'Email', candidate_email: 'Email',
  mobile_number: 'Mobile', mobile: 'Mobile', phone: 'Mobile', candidate_mobile: 'Mobile',
  other_contact: 'Alternate Contact',
  date_of_birth: 'Date of Birth', dob: 'Date of Birth',
  gender: 'Gender',
  domicile_district: 'Domicile District', district: 'District', district_code: 'District',
  religion: 'Religion',
  permanent_address: 'Permanent Address', current_address: 'Current Address', address: 'Address',
  is_govt_servant: 'Government Servant',
  profile_completion: 'Profile Completion (%)',
};

// Fields intentionally left out of the generic grid — internal ids/urls/
// verification flags that aren't useful to an admin reviewing a profile.
const PERSONAL_FIELD_SKIP = new Set([
  'id', 'uuid', 'hash_id', 'profile_photo_url', 'mobile_verified', 'email_verified',
  'other_contact_verified', 'govt_servant_type', 'govt_service_years', 'govt_service_months',
  'govt_service_days', 'noc_doc_id', 'is_active', 'is_blacklisted',
]);

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

  const personalDetails = profile?.personal || profile?.personal_details || profile?.personalDetails || {};
  const education = profile?.education || profile?.education_records || [];
  const experience = profile?.experience || profile?.experience_records || [];
  const skills = profile?.skills || [];
  const certifications = profile?.certifications || [];
  const disability = profile?.disability;
  const documents = profile?.documents || [];

  const handleDownloadDocument = async (doc) => {
    // Confirmed live against the candidate portal: {docHash} must be this
    // specific document's own uuid/id (e.g. "f554694e-..." or 488) — NOT its
    // doc_type category ("cnic_back" etc, which multiple documents can
    // share and which 404s as "Record not found").
    const docHash = doc.uuid || doc.id || doc.doc_type || doc.type || doc.hash;
    if (!docHash) { toast.error('This document has no identifiable id to download'); return; }
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
                    .filter(([k, v]) => typeof v !== 'object' && !PERSONAL_FIELD_SKIP.has(k))
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
                        <span className="font-semibold">
                          {e.degree_title || e.degree_level || e.professional_qualification || e.required_qualification_name || e.degree || e.qualification || e.level || 'Education Record'}
                        </span>
                        {e.major_subject && <span className="text-slate-500"> · {e.major_subject}</span>}
                        {(e.institution_name || e.institute) && <span className="text-slate-500"> — {e.institution_name || e.institute}</span>}
                        {(e.obtained_marks || e.marks_obtained) && (
                          <span className="text-slate-500"> · {e.obtained_marks ?? e.marks_obtained}/{e.total_marks} marks</span>
                        )}
                        {e.division_grade && <span className="text-slate-500"> · {e.division_grade}</span>}
                        {(e.passing_year || e.year) && <span className="text-slate-500"> · {e.passing_year || e.year}</span>}
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
                        <span className="font-semibold">{e.job_title || e.designation || e.position}</span>
                        {(e.organization_name || e.organization) && <span className="text-slate-500"> — {e.organization_name || e.organization}</span>}
                        {(e.start_date || e.from_date) && (
                          <span className="text-slate-500"> · {String(e.start_date || e.from_date).slice(0, 10)} to {e.is_current ? 'present' : String(e.end_date || e.to_date || '').slice(0, 10) || 'present'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {skills.length > 0 && (
                <SectionCard icon={Award} title="Skills">
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {typeof s === 'string' ? s : (s.name || s.skill_name || JSON.stringify(s))}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {certifications.length > 0 && (
                <SectionCard icon={Award} title="Certifications">
                  <div className="space-y-3">
                    {certifications.map((c, i) => (
                      <div key={i} className="text-sm text-slate-700 border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                        <span className="font-semibold">{c.name || c.certification_name || c.title}</span>
                        {c.issuing_organization && <span className="text-slate-500"> — {c.issuing_organization}</span>}
                        {c.issue_date && <span className="text-slate-500"> · {String(c.issue_date).slice(0, 10)}</span>}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {disability && (
                <SectionCard icon={ShieldAlert} title="Disability">
                  <p className="text-sm text-slate-700">
                    {typeof disability === 'string' ? disability : (disability.type || disability.description || JSON.stringify(disability))}
                  </p>
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
