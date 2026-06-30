import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, GraduationCap, FileText, CheckCircle, XCircle, Clock, Briefcase, Award, Zap, HeartPulse, Shield, MapPin } from 'lucide-react';
import { InlineLoader } from 'components/ui/Loader';
import Button from 'components/ui/Button';
import ApplicationApi from 'api/applicationApi';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import { formatApplicationDocumentType } from 'utils/applicationOcrUtils';
import { formatDate } from 'utils/dateUtils';

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const response = await ApplicationApi.getById(id);
      const rawData = response.data?.application || response.application || response.data || response;
      
      // Parse snapshot_data if it's a string (common when data comes from Admin DB)
      let snapshot = rawData.snapshot_data;
      if (typeof snapshot === 'string') {
        try { snapshot = JSON.parse(snapshot); } catch { snapshot = {}; }
      } else if (!snapshot) {
        snapshot = {};
      }

      // Admin DB is source of truth (overlaid via _admin_status). Fall back to candidate status.
      const effectiveStatus = (rawData._admin_status !== null && rawData._admin_status !== undefined)
        ? rawData._admin_status
        : (rawData.status === 'submitted' || !rawData.status ? '' : rawData.status);

      const mappedApp = {
        id: rawData.hash_id || rawData.id,
        application_number: rawData.application_number,
        status: effectiveStatus,
        created_at: rawData.submitted_at || rawData.created_at,
        job: {
          title: rawData.job_post?.post_title || rawData.job?.title || 'N/A',
        },
        profile: {
          full_name: snapshot.name || rawData.candidate?.name || rawData.snapshot_data?.name,
          father_name: snapshot.father_name || rawData.candidate?.father_name || rawData.snapshot_data?.father_name,
          cnic: snapshot.cnic || rawData.candidate?.cnic || rawData.snapshot_data?.cnic,
          email: snapshot.email || rawData.candidate?.email || rawData.snapshot_data?.email,
          phone: snapshot.mobile_number || rawData.candidate?.mobile_number || rawData.snapshot_data?.mobile_number,
          domicile: snapshot.domicile_district || rawData.candidate?.domicile_district || rawData.snapshot_data?.domicile_district,
          dob: snapshot.date_of_birth || rawData.candidate?.date_of_birth || rawData.snapshot_data?.date_of_birth,
          gender: snapshot.gender || rawData.candidate?.gender || rawData.snapshot_data?.gender,
          religion: snapshot.religion || rawData.candidate?.religion || rawData.snapshot_data?.religion,
          permanent_address: snapshot.permanent_address || rawData.candidate?.permanent_address || rawData.snapshot_data?.permanent_address,
          current_address: snapshot.current_address || rawData.candidate?.current_address || rawData.snapshot_data?.current_address,
          mobile_verified: rawData.candidate?.mobile_verified,
          email_verified: rawData.candidate?.email_verified,
          is_blacklisted: rawData.candidate?.is_blacklisted,
          completion: rawData.candidate?.profile_completion || 0,
          photo: rawData.candidate?.profile_photo_url || null,
        },
        education: (snapshot.education || rawData.candidate?.education || rawData.education || []).map(edu => ({
          ...edu,
          degree_title: edu.degree_title || edu.degree_name || edu.degree_type,
          institution_name: edu.institution_name || edu.institution || edu.board_university,
        })),
        experiences: (snapshot.experience || rawData.candidate?.experience || rawData.experiences || []).map(exp => ({
          ...exp,
          organization_name: exp.organization_name || exp.organization || exp.company,
        })),
        certifications: (snapshot.certifications || rawData.candidate?.certifications || []).map(cert => {
          // If this looks like an experience object (has organization/start_date but no cert fields), skip it or label it
          const title = cert.title || cert.certification_name || cert.cert_name;
          const org = cert.issuing_organization || cert.issuing_authority || cert.organization_name || cert.organization;
          
          // Use issue_date or fall back to any available date if it's actually a cert
          const rawDate = cert.issue_date || cert.created_at;
          const formattedDate = rawDate && !rawDate.includes('0000-00-00')
            ? formatDate(rawDate)
            : 'N/A';

          return {
            ...cert,
            title: title || 'Unnamed Certification',
            issuing_organization: org || 'N/A',
            issue_date: formattedDate,
            expiry_date: cert.expiry_date ? formatDate(cert.expiry_date) : null,
          };
        }),
        skills: snapshot.skills || rawData.candidate?.skills || [],
        disability: rawData.candidate?.disability || null,
        gov_service: rawData.candidate?.is_govt_servant ? { years: rawData.candidate?.govt_service_years } : null,
        answers: rawData.answers || [],
        documents: rawData.candidate?.documents || rawData.documents || [],
        eligibility_summary: rawData.eligibility_summary || null,
        payment_summary: rawData.payment_summary || rawData.payment || null,
        preferred_exam_cities: (rawData.preferred_exam_cities || []).map(c => {
          let cityName = typeof c === 'string' ? c : (c.city || c.name);
          
          // Resolve common hash IDs found in the system
          const cityMap = {
            'zlJB4eA4yegp': 'Muzaffarabad',
            'JoawKZG4QNM9': 'Rawalakot',
            'MirpurHashID': 'Mirpur', // Add more if discovered
          };
          
          if (cityMap[cityName]) {
            cityName = cityMap[cityName];
          }

          return { 
            city: cityName, 
            status: typeof c === 'object' ? (c.status || 'active') : 'active' 
          };
        }),
      };

      setApplication(mappedApp);
    } catch (err) {
      toast.error(err.message || 'Error loading application details');
      navigate('/dashboard/roll-numbers');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (!lowerStatus) return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-sm font-semibold">Unreviewed</span>;
    if (lowerStatus === 'shortlisted') return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Shortlisted</span>;
    if (lowerStatus === 'interview') return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">Interview</span>;
    if (lowerStatus === 'rejected') return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">Rejected</span>;
    return <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-sm font-semibold capitalize">{status}</span>;
  };

  const calculateAgeFromDob = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  };

  const getPassTag = (passed) => (
    <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${passed ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
      {passed ? 'Pass' : 'Fail'}
    </span>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <InlineLoader text="Loading application details..." variant="ring" size="lg" />
      </div>
    );
  }

  if (!application) return <div className="text-center py-8 text-slate-600">No application found.</div>;

  const { profile, education, experiences, certifications, skills, disability, gov_service, documents, job, eligibility_summary, payment_summary, preferred_exam_cities } = application;
  const calculatedAge = calculateAgeFromDob(profile?.dob);

  const tabs = [
    { id: 'overview',     label: 'Personal Info',    icon: User },
    { id: 'exam_cities',  label: 'Exam Preferences', icon: MapPin },
    { id: 'education',    label: 'Education',        icon: GraduationCap },
    { id: 'experience',   label: 'Experience',       icon: Briefcase },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'skills',       label: 'Skills',           icon: Zap },
    { id: 'disability',   label: 'Disability',       icon: HeartPulse },
    { id: 'gov_service',  label: 'Gov. Service',     icon: Shield },
    { id: 'documents',    label: 'Documents',        icon: FileText },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div><p className="text-sm text-slate-500">Full Name</p><p className="font-medium text-slate-800">{profile?.full_name || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Father's Name</p><p className="font-medium text-slate-800">{profile?.father_name || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">CNIC</p><p className="font-medium text-slate-800">{profile?.cnic || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Date of Birth</p><p className="font-medium text-slate-800">{profile?.dob ? formatDate(profile.dob) : 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Gender</p><p className="font-medium text-slate-800 capitalize">{profile?.gender || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Religion</p><p className="font-medium text-slate-800 capitalize">{profile?.religion || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Domicile District</p><p className="font-medium text-slate-800">{profile?.domicile || 'N/A'}</p></div>
            </div>

            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mt-8 mb-4">Contact & Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Email Address {profile?.email_verified && <span className="text-emerald-600 text-xs font-bold ml-2">(Verified)</span>}</p>
                <p className="font-medium text-slate-800">{profile?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone Number {profile?.mobile_verified && <span className="text-emerald-600 text-xs font-bold ml-2">(Verified)</span>}</p>
                <p className="font-medium text-slate-800">{profile?.phone || 'N/A'}</p>
              </div>
              <div><p className="text-sm text-slate-500">Current Address</p><p className="font-medium text-slate-800">{profile?.current_address || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Permanent Address</p><p className="font-medium text-slate-800">{profile?.permanent_address || 'N/A'}</p></div>
            </div>

            {profile?.is_blacklisted && (
              <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-bold flex items-center gap-2"><XCircle size={18} /> Candidate is Blacklisted</p>
              </div>
            )}

          </div>
        );

      case 'exam_cities':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">
              Exam City Preferences
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Cities selected by the candidate in order of preference. Roll number center allocation respects this priority order.
            </p>
            {preferred_exam_cities && preferred_exam_cities.length > 0 ? (
              <div className="space-y-3">
                {preferred_exam_cities.map((city, idx) => (
                  <div
                    key={city.hash_id || idx}
                    className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      idx === 0 ? 'bg-emerald-600 text-white' :
                      idx === 1 ? 'bg-blue-600 text-white' :
                      'bg-slate-400 text-white'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                      <span className="font-semibold text-slate-800">{city.city}</span>
                      {idx === 0 && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full">
                          1st Choice
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                      city.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {city.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-lg">
                <MapPin size={28} className="text-amber-400 mx-auto mb-2" />
                <p className="text-amber-800 font-medium text-sm">No exam city preference selected by candidate.</p>
                <p className="text-amber-600 text-xs mt-1">Center will be auto-assigned during roll number allocation.</p>
              </div>
            )}
          </div>
        );

      case 'education':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">Education History</h3>
            {education.length > 0 ? (
              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div key={idx} className="p-5 border border-slate-100 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold rounded border border-emerald-200">
                            {edu.degree_level || 'Degree'}
                          </span>
                          <span className="bg-white px-2.5 py-0.5 rounded text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
                            Year: {edu.passing_year || 'N/A'}
                          </span>
                        </div>
                        <h4 className="font-bold text-lg text-slate-800">{edu.degree_title || edu.degree_name || edu.degree_type}</h4>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{edu.institution_name || edu.institution || edu.board_university}</p>
                        <p className="text-sm text-slate-500 mt-1">Major/Subjects: <span className="font-medium text-slate-800">{edu.major_subject || 'N/A'}</span></p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Marks</p>
                        <p className="font-semibold text-slate-800">{edu.total_marks || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Obtained Marks</p>
                        <p className="font-semibold text-slate-800">{edu.obtained_marks || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">CGPA / %</p>
                        <p className="font-bold text-slate-800">{edu.cgpa_percentage || edu.cgpa || edu.percentage || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Division / Grade</p>
                        <p className="font-bold text-emerald-700">{edu.division_grade || edu.grade || edu.division || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm">No education records found.</p>}
          </div>
        );

      case 'experience':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">Professional Experience</h3>
            {experiences.length > 0 ? (
              <div className="space-y-4">
                {experiences.map((exp, idx) => (
                  <div key={idx} className="p-5 border border-slate-100 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {exp.org_type && (
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] uppercase font-bold rounded border border-blue-200">
                              {exp.org_type}
                            </span>
                          )}
                          {(exp.is_current || !exp.end_date) && (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold rounded border border-emerald-200">
                              Current Role
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-lg text-slate-800">{exp.job_title}</h4>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{exp.organization_name || exp.organization || exp.company}</p>
                        
                        <div className="flex items-center gap-1.5 mt-3 bg-white w-fit px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                          <Clock size={14} className="text-slate-400" /> 
                          <span className="text-xs font-semibold text-slate-700">{exp.start_date ? formatDate(exp.start_date) : 'N/A'}</span>
                          <span className="text-xs text-slate-400 font-medium px-1">TO</span>
                          <span className="text-xs font-semibold text-slate-700">{exp.end_date ? formatDate(exp.end_date) : 'Present'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {exp.responsibilities && (
                      <div className="mt-4 bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Key Responsibilities</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{exp.responsibilities}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm">No experience records found.</p>}
          </div>
        );

      case 'certifications':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">Certifications</h3>
            {certifications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certifications.map((cert, idx) => (
                  <div key={idx} className="p-4 border border-slate-100 rounded-lg bg-slate-50 flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Award size={20} /></div>
                    <div>
                      <p className="font-semibold text-slate-800">{cert.title || cert.certification_name}</p>
                      <p className="text-sm text-slate-500 mt-1">{cert.issuing_organization}</p>
                      <p className="text-xs text-slate-400 mt-1">{cert.issue_date} {cert.expiry_date ? `- ${cert.expiry_date}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm">No certifications found.</p>}
          </div>
        );

      case 'skills':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">Skills & Competencies</h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-md border border-slate-200">
                    {skill.skill_name || skill.name}
                  </span>
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm">No skills listed.</p>}
          </div>
        );

      case 'disability':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">Disability Information</h3>
            {disability ? (
              <div className="p-5 border border-slate-100 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                  <HeartPulse size={20} className="text-emerald-600" />
                  <h4 className="font-semibold">Declared Disabled</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Disability Type</p>
                    <p className="font-medium text-slate-800 capitalize">{disability.disability_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Details</p>
                    <p className="font-medium text-slate-800 capitalize">{disability.disability_details || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Assistance Required</p>
                    <p className="font-medium text-slate-800 capitalize">{disability.assistance_required || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Scribe Required</p>
                    <p className={`font-medium ${disability.scribe_required ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {disability.scribe_required ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            ) : <p className="text-slate-500 text-sm">Candidate has not declared any disability.</p>}
          </div>
        );

      case 'gov_service':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">Government Service</h3>
            {gov_service ? (
              <div className="p-5 border border-slate-100 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                  <Shield size={20} className="text-emerald-600" />
                  <h4 className="font-semibold">Current Government Servant</h4>
                </div>
                <div><p className="text-xs text-slate-500 uppercase font-medium">Years of Service</p><p className="font-medium text-slate-800">{gov_service.years} Years</p></div>
              </div>
            ) : <p className="text-slate-500 text-sm">Not a government servant.</p>}
          </div>
        );

      case 'documents':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">Uploaded Documents</h3>
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden group flex flex-col bg-white">
                    <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium text-sm text-slate-700 capitalize break-words">
                          {formatApplicationDocumentType(doc)}
                        </span>
                        {doc.ocr_verified && (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold whitespace-nowrap border border-emerald-200">
                            <CheckCircle size={10} strokeWidth={3} /> AI Verified
                          </span>
                        )}
                      </div>
                      
                      {doc.ocr_verified && (doc.is_name_matched !== undefined || doc.is_cnic_matched !== undefined) && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {doc.is_name_matched !== null && doc.is_name_matched !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${doc.is_name_matched ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              Name {doc.is_name_matched ? 'Match' : 'Mismatch'}
                            </span>
                          )}
                          {doc.is_cnic_matched !== null && doc.is_cnic_matched !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${doc.is_cnic_matched ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              CNIC {doc.is_cnic_matched ? 'Match' : 'Mismatch'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center h-48">
                      {doc.file_url ? (
                        <div className="w-full flex flex-col items-center justify-center">
                          {doc.mime_type?.startsWith('image/') || doc.file_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                            <a 
                              href={doc.file_url?.startsWith('http') ? doc.file_url : `${Config.apiUrl.replace('/api/v1', '').replace('/v1', '')}/${doc.file_url}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full h-32 mb-2 rounded overflow-hidden border border-slate-200 block transition-colors"
                            >
                              <img 
                                src={doc.file_url?.startsWith('http') ? doc.file_url : `${Config.apiUrl.replace('/api/v1', '').replace('/v1', '')}/${doc.file_url}`}
                                alt={doc.doc_type || 'Document'}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <FileText size={40} className="text-slate-300 mb-3" strokeWidth={1.5} />
                          )}
                          <a 
                            href={doc.file_url?.startsWith('http') ? doc.file_url : `${Config.apiUrl.replace('/api/v1', '').replace('/v1', '')}/${doc.file_url}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-800 text-sm font-medium hover:underline"
                          >
                            {doc.mime_type?.startsWith('image/') || doc.file_url.match(/\.(jpeg|jpg|gif|png)$/i) ? 'Open Full Size' : 'View Document'}
                          </a>
                        </div>
                      ) : <p className="text-slate-400 text-sm font-medium">File not available</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm">No documents uploaded.</p>}
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <Button
            onClick={() => navigate('/dashboard/roll-numbers')}
            variant="secondary"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft size={18} /> Back to Applications
          </Button>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-t-4 border-t-emerald-600">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 font-bold text-2xl shadow-inner border border-emerald-200 overflow-hidden">
              {profile?.photo ? (
                <img src={profile.photo} alt="Candidate" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{profile?.full_name || 'Applicant'}</h2>
              <p className="text-slate-500 font-medium">CNIC: {profile?.cnic || '—'}</p>
              
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Applied Job</span>
            <p className="font-semibold text-slate-800">{job?.title || 'Unknown Job'}</p>
            <div className="mt-2">
              {getStatusBadge(application.status)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6 p-6 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Age</p>
              <p className="text-sm font-bold text-slate-800 mt-1 flex items-center">
                {calculatedAge !== null ? `${calculatedAge} Years` : 'N/A'}
                {eligibility_summary?.checks?.age_passed !== undefined && getPassTag(eligibility_summary?.checks?.age_passed)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Gender</p>
              <p className="text-sm font-bold text-slate-800 mt-1 flex items-center capitalize">
                {profile?.gender || 'N/A'}
                {eligibility_summary?.checks?.gender_passed !== undefined && getPassTag(eligibility_summary?.checks?.gender_passed)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">District</p>
              <p className="text-sm font-bold text-slate-800 mt-1 flex items-center">
                {profile?.domicile || 'N/A'}
                {eligibility_summary?.checks?.district_passed !== undefined && getPassTag(eligibility_summary?.checks?.district_passed)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Education</p>
              <p className="text-sm font-bold text-slate-800 mt-1 flex items-center">
                {education?.[0]?.degree_level || eligibility_summary?.candidate_info?.qualification_levels?.[0] || 'N/A'}
                {eligibility_summary?.checks?.qualification_passed !== undefined && getPassTag(eligibility_summary?.checks?.qualification_passed)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Payment</p>
              <p className="text-sm font-bold text-slate-800 mt-1 flex items-center capitalize">
                {payment_summary?.status || payment_summary?.payment_status || 'N/A'}
                {getPassTag((payment_summary?.status || payment_summary?.payment_status || '').toLowerCase() === 'paid')}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">PSID</p>
              <p className="text-sm font-bold text-slate-800 mt-1 break-all">
                {payment_summary?.psid_number || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
          <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                    isActive 
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {renderTabContent()}
        </div>

      </div>
    </div>
  );
};

export default ApplicationDetail;
