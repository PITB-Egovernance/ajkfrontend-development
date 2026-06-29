import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, FileCheck2, Filter, Hash, MapPin, Search, Send, Users } from 'lucide-react';
import { MenuItem, TextField } from '@mui/material';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';

const examTypeMeta = {
  'one-paper-mcqs': { title: 'One Paper MCQs Roll Number Management', badge: 'One Paper MCQs', description: 'Club one or multiple posts and generate one common roll number slip per candidate.', papers: ['One Paper'] },
  'two-paper-mcqs': { title: 'Two Paper MCQs Roll Number Management', badge: 'Two Paper MCQs', description: 'Paper 1 and Paper 2 schedules remain separate, while selected jobs can be clubbed under one roll number.', papers: ['Paper 1', 'Paper 2'] },
  'written-exams': { title: 'Written Exams Roll Number Management', badge: 'Written Exams', description: 'Written exams flow shell is ready for the same allocation pattern.', papers: ['Written Exam'], pending: true },
  'cce-exams': { title: 'CCE Exams Roll Number Management', badge: 'CCE Exams', description: 'CCE exams flow shell is ready for the same allocation pattern.', papers: ['CCE Exam'], pending: true },
};

const advertisementsByType = {
  'one-paper-mcqs': [
    { id: 'adv-01', advertisement: 'Advertisement 01/2026', meta: 'One Paper MCQs', posts: [
      { id: 'ad', post: 'Assistant Director', caseNo: 'Case AD-01 | BPS-17', department: 'Services & General Administration', applicants: 248 },
      { id: 'dd', post: 'Deputy Director', caseNo: 'Case DD-02 | BPS-18', department: 'Planning & Development', applicants: 132 },
      { id: 'sa', post: 'System Analyst', caseNo: 'Case SA-03 | BPS-17', department: 'Information Technology', applicants: 84 },
    ] },
    { id: 'adv-02', advertisement: 'Advertisement 02/2026', meta: 'One Paper MCQs', posts: [
      { id: 'pr', post: 'Programmer', caseNo: 'Case PR-04 | BPS-16', department: 'Information Technology', applicants: 96 },
      { id: 'ao', post: 'Accounts Officer', caseNo: 'Case AO-05 | BPS-17', department: 'Finance Department', applicants: 72 },
    ] },
  ],
  'two-paper-mcqs': [
    { id: 'adv-03', advertisement: 'Advertisement 03/2026', meta: 'Two Paper MCQs', posts: [
      { id: 'da', post: 'Data Analyst', caseNo: 'Case DA-06 | BPS-17', department: 'Planning & Development', applicants: 156 },
      { id: 'na', post: 'Network Administrator', caseNo: 'Case NA-07 | BPS-16', department: 'Information Technology', applicants: 72 },
      { id: 'dba', post: 'Database Administrator', caseNo: 'Case DBA-08 | BPS-17', department: 'Information Technology', applicants: 118 },
    ] },
  ],
};

const centers = [
  { id: 'c-1', center: 'AJK PSC Hall Muzaffarabad', district: 'Muzaffarabad', capacity: 160 },
  { id: 'c-2', center: 'Govt. Boys Degree College', district: 'Mirpur', capacity: 120 },
  { id: 'c-3', center: 'Post Graduate College', district: 'Rawalakot', capacity: 110 },
  { id: 'c-4', center: 'Girls Degree College Bagh', district: 'Bagh', capacity: 140 },
];

const assignedCandidates = [
  { id: 1, photo: 'AK', roll: 'MCQ-01-00001', name: 'Ali Khan', cnic: '11111-1111111-1', district: 'Muzaffarabad', center: 'AJK PSC Hall Muzaffarabad' },
  { id: 2, photo: 'SR', roll: 'MCQ-01-00002', name: 'Sara Riaz', cnic: '22222-2222222-2', district: 'Mirpur', center: 'Govt. Boys Degree College' },
  { id: 3, photo: 'HN', roll: 'MCQ-01-00003', name: 'Hassan Noor', cnic: '33333-3333333-3', district: 'Rawalakot', center: 'Post Graduate College' },
];

const StepHeader = ({ number, title, subtitle }) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-sm font-bold text-white">{number}</div>
    <div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);


const RollNumberExamFlow = () => {
  const navigate = useNavigate();
  const { examType = 'one-paper-mcqs' } = useParams();
  const meta = examTypeMeta[examType] || examTypeMeta['one-paper-mcqs'];
  const advertisements = advertisementsByType[examType] || advertisementsByType['one-paper-mcqs'];
  const defaultPostIds = advertisements.flatMap((ad) => ad.posts.slice(0, 2).map((post) => post.id));
  const [stage, setStage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState(defaultPostIds);
  const [selectedCenterIds, setSelectedCenterIds] = useState(['c-1', 'c-2']);
  const [generated, setGenerated] = useState(false);
  const [scheduleDates, setScheduleDates] = useState(() => meta.papers.map((_, index) => (index === 1 ? '2026-08-18' : '2026-08-16')));

  const allPosts = useMemo(() => advertisements.flatMap((ad) => ad.posts.map((post) => ({ ...post, advertisement: ad.advertisement, advertisementMeta: ad.meta }))), [advertisements]);
  const selectedPosts = useMemo(() => allPosts.filter((post) => selectedPostIds.includes(post.id)), [allPosts, selectedPostIds]);
  const selectedCenters = useMemo(() => centers.filter((center) => selectedCenterIds.includes(center.id)), [selectedCenterIds]);
  const selectedApplicants = selectedPosts.reduce((sum, post) => sum + post.applicants, 0);
  const selectedCapacity = selectedCenters.reduce((sum, center) => sum + center.capacity, 0);
  const capacityShortage = Math.max(0, selectedApplicants - selectedCapacity);
  const capacityPassed = selectedApplicants > 0 && selectedCapacity >= selectedApplicants;

  const togglePost = (postId) => setSelectedPostIds((current) => current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId]);
  const toggleCenter = (centerId) => setSelectedCenterIds((current) => current.includes(centerId) ? current.filter((id) => id !== centerId) : [...current, centerId]);
  const generateRollNumbers = () => {
    if (!capacityPassed) return;
    setGenerated(true);
    setStage(3);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2"><Hash size={24} className="text-emerald-800" /></div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{meta.title}</h1>
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">{meta.badge}</span>
              </div>
              <p className="text-sm text-slate-500">{meta.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={() => navigate('/dashboard/roll-numbers')}><ArrowLeft size={15} /> Back</Button>
            <Button variant="outline" size="sm" className="gap-2 bg-white"><FileCheck2 size={15} /> Save Draft</Button>
          </div>
        </div>

        {meta.pending && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            <AlertTriangle size={16} /> This exam type is ready as a frontend shell. API integration can follow the same one/two paper endpoints.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-lg border-blue-200 bg-blue-50"><CardContent className="flex items-center gap-3 p-4"><Users size={24} className="text-blue-700" /><div><p className="text-xs font-semibold text-blue-700">Selected Applicants</p><p className="text-2xl font-bold text-blue-950">{selectedApplicants}</p></div></CardContent></Card>
          <Card className="rounded-lg border-emerald-200 bg-emerald-50"><CardContent className="flex items-center gap-3 p-4"><MapPin size={24} className="text-emerald-700" /><div><p className="text-xs font-semibold text-emerald-700">Selected Capacity</p><p className="text-2xl font-bold text-emerald-950">{selectedCapacity}</p></div></CardContent></Card>
          <Card className="rounded-lg border-violet-200 bg-violet-50"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 size={24} className="text-violet-700" /><div><p className="text-xs font-semibold text-violet-700">Generated</p><p className="text-2xl font-bold text-violet-950">{generated ? selectedApplicants : 0}</p></div></CardContent></Card>
        </div>

        {stage !== 3 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {['Select Posts', 'Center Allocation & Generate'].map((label, index) => {
              const step = index + 1;
              return <button key={label} type="button" onClick={() => setStage(step)} className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${stage === step ? 'border-emerald-700 bg-emerald-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-xs">{step}</span>{label}</button>;
            })}
          </div>
        )}

        {stage === 1 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="1" title="Select Advertisement, Posts, Departments & Applicants" subtitle="Advertisement alag column mein hai. Checkbox sirf post/designation ke sath hai." />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <TextField size="small" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} className="lg:col-span-4" InputProps={{ startAdornment: <Search size={16} className="mr-2 text-slate-400" /> }} />
              <TextField select size="small" label="Advertisement" defaultValue="all" className="lg:col-span-3"><MenuItem value="all">All Advertisements</MenuItem>{advertisements.map((ad) => <MenuItem key={ad.id} value={ad.id}>{ad.advertisement}</MenuItem>)}</TextField>
              <TextField select size="small" label="Post" defaultValue="all" className="lg:col-span-2"><MenuItem value="all">All Posts</MenuItem>{allPosts.map((post) => <MenuItem key={post.id} value={post.id}>{post.post}</MenuItem>)}</TextField>
              <TextField select size="small" label="Department" defaultValue="all" className="lg:col-span-2"><MenuItem value="all">All Departments</MenuItem><MenuItem value="it">Information Technology</MenuItem><MenuItem value="sgad">S&GAD</MenuItem></TextField>
              <Button variant="outline" className="h-10 gap-2 bg-white lg:col-span-1"><Filter size={15} /> Filter</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="w-[260px] px-4 py-3">Advertisement</th><th className="px-4 py-3">Designation / Post</th><th className="px-4 py-3">Department</th><th className="px-4 py-3 text-right">Applicants</th></tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {advertisements.map((ad) => {
                    const rows = ad.posts.filter((post) => !search || `${ad.advertisement} ${post.post} ${post.department}`.toLowerCase().includes(search.toLowerCase()));
                    return rows.map((post, index) => (
                      <tr key={post.id} className="hover:bg-slate-50">
                        {index === 0 && <td rowSpan={rows.length} className="border-r border-slate-100 bg-slate-50 px-4 py-3 align-top"><div className="font-bold text-slate-900">{ad.advertisement}</div><div className="mt-1 text-xs font-medium text-slate-500">{ad.meta} | multiple posts demo</div></td>}
                        <td className="px-4 py-3"><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={selectedPostIds.includes(post.id)} onChange={() => togglePost(post.id)} className="h-4 w-4 rounded border-slate-300 accent-emerald-800" /><span><span className="block font-semibold text-slate-900">{post.post}</span><span className="block text-xs text-slate-500">{post.caseNo}</span></span></label></td>
                        <td className="px-4 py-3 text-slate-600">{post.department}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{post.applicants}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-3">
              <div><p className="text-xs font-semibold text-emerald-700">Selected Posts</p><p className="text-lg font-bold text-emerald-950">{selectedPosts.length}</p></div>
              <div><p className="text-xs font-semibold text-emerald-700">Total Applicants</p><p className="text-lg font-bold text-emerald-950">{selectedApplicants}</p></div>
              <div><p className="text-xs font-semibold text-emerald-700">Roll Slip Rule</p><p className="text-lg font-bold text-emerald-950">One roll number</p></div>
            </div>
            <div className="flex justify-end"><Button className="gap-2" disabled={!selectedPosts.length} onClick={() => setStage(2)}>Next: Center Allocation <ArrowRight size={15} /></Button></div>
          </CardContent></Card>
        )}

        {stage === 2 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="2" title="Center Allocation & Generate Roll Numbers" subtitle="Center select karain, district/preference rule choose karain, phir roll numbers generate karain." />
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{meta.papers.map((paper, index) => <div key={paper} className="rounded-lg border border-slate-200 bg-white p-4"><div className="mb-4 flex items-center gap-2"><CalendarDays size={17} className="text-emerald-700" /><h3 className="text-sm font-bold text-slate-900">{paper} Schedule</h3></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><TextField size="small" type="date" label="Start Date" value={scheduleDates[index] || scheduleDates[0]} onChange={(event) => setScheduleDates((current) => current.map((date, dateIndex) => dateIndex === index ? event.target.value : date))} InputLabelProps={{ shrink: true }} /><TextField size="small" type="time" label="Start Time" defaultValue={index === 1 ? '14:00' : '10:00'} InputLabelProps={{ shrink: true }} /><TextField size="small" label="Duration" defaultValue={index === 1 ? '120 Minutes' : '90 Minutes'} InputProps={{ startAdornment: <Clock3 size={15} className="mr-2 text-slate-400" /> }} /></div></div>)}</div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="w-12 px-4 py-3"></th><th className="px-4 py-3">Center Name</th><th className="px-4 py-3">District</th><th className="px-4 py-3 text-right">Capacity</th><th className="px-4 py-3">Start Date</th><th className="px-4 py-3">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 bg-white">{centers.map((center) => <tr key={center.id} className="hover:bg-slate-50"><td className="px-4 py-3"><input type="checkbox" checked={selectedCenterIds.includes(center.id)} onChange={() => toggleCenter(center.id)} className="h-4 w-4 rounded border-slate-300 accent-emerald-800" /></td><td className="px-4 py-3 font-medium text-slate-800">{center.center}</td><td className="px-4 py-3 text-slate-600">{center.district}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">{center.capacity}</td><td className="px-4 py-3 font-medium text-slate-700">{scheduleDates[0]}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Available</span></td></tr>)}</tbody>
                  </table>
                </div>
                <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${capacityPassed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{capacityPassed ? `Capacity check passed. ${selectedCapacity} seats selected for ${selectedApplicants} applicants.` : `Selected center capacity is short by ${capacityShortage} seats. More centers select karain.`}</div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Center Allocation by District or by Preference</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"><input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 accent-emerald-800" />By District</label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"><input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 accent-emerald-800" />By Preference</label>
                  </div>
                </div>
              </div>
              {/* Job History and Center Allocation History are hidden for now. */}
</div>
            <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="gap-2 bg-white" onClick={() => setStage(1)}><ArrowLeft size={15} /> Back</Button><Button className="gap-2" disabled={!capacityPassed} onClick={generateRollNumbers}><Send size={15} /> Generate Roll Numbers</Button></div>
          </CardContent></Card>
        )}

        {stage === 3 && (
          <Card className="rounded-lg"><CardContent className="space-y-5 p-5">
            <StepHeader number="3" title="Generated Candidates List" subtitle="Generate ke baad roll number slip candidate dashboard mein selected job ke against show hogi." />
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Roll numbers generated. Candidate dashboard par har selected job ke against same roll number slip available hogi.</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="w-20 px-4 py-3">Photo</th><th className="px-4 py-3">Roll No</th><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Selected Jobs</th><th className="px-4 py-3">Center</th><th className="px-4 py-3 text-right">Slip</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{assignedCandidates.map((candidate) => <tr key={candidate.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-700">{candidate.photo}</div></td><td className="px-4 py-3 font-bold text-slate-900">{candidate.roll}</td><td className="px-4 py-3"><div className="font-semibold text-slate-900">{candidate.name}</div><div className="text-xs text-slate-500">{candidate.cnic} | {candidate.district}</div></td><td className="px-4 py-3 text-slate-600">{selectedPosts.map((post) => post.post).join(' + ') || 'No post selected'}</td><td className="px-4 py-3 text-slate-600">{candidate.center}</td><td className="px-4 py-3 text-right"><Button variant="outline" size="sm" className="bg-white">View Slip</Button></td></tr>)}</tbody></table></div>
            <div className="flex justify-start"><Button variant="outline" className="gap-2 bg-white" onClick={() => setStage(2)}><ArrowLeft size={15} /> Back to Allocation</Button></div>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default RollNumberExamFlow;







