// Static/mock data for the Reporting & Analytics module.
// All values below are illustrative placeholders — this module has no live
// backend wiring yet. Replace with real API responses once endpoints exist.

// Deterministic pseudo-random generator so the mock tables render the same
// way on every reload (mulberry32).
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260727);
const pickIndexed = (arr, i) => arr[i % arr.length];
const intBetween = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

export const ADVERTISEMENTS = [
  { value: 'ADV-01-2025', label: 'Advertisement No. 01/2025' },
  { value: 'ADV-02-2025', label: 'Advertisement No. 02/2025' },
  { value: 'ADV-03-2025', label: 'Advertisement No. 03/2025' },
  { value: 'ADV-04-2025', label: 'Advertisement No. 04/2025' },
];

export const DEPARTMENTS = [
  'Health Department',
  'Education Department',
  'Police Department',
  'Finance Department',
  'Agriculture Department',
  'Forest Department',
  'Revenue Department',
  'Social Welfare Department',
  'Local Government Department',
  'Planning & Development Department',
];

export const POSTS = [
  'Assistant',
  'Junior Clerk',
  'Naib Tehsildar',
  'Sub Inspector',
  'Lecturer',
  'Medical Officer',
  'Agriculture Officer',
  'Forest Ranger',
  'Statistical Officer',
  'Accountant',
];

export const CATEGORIES = [
  'Open Merit',
  'Women Quota',
  'Disable Quota',
  'Minority Quota',
  'Ex-Cadet Quota',
  'Sports Quota',
];

export const GENDERS = ['Male', 'Female'];

export const DISTRICTS = [
  'Muzaffarabad',
  'Mirpur',
  'Kotli',
  'Bhimber',
  'Bagh',
  'Poonch (Rawalakot)',
  'Sudhnoti',
  'Hattian Bala',
  'Neelum',
  'Haveli',
];

export const DEGREES = [
  'Matric',
  'FA / FSc',
  'DAE',
  'BA',
  'BSc',
  'BS Computer Science',
  'MA',
  'MSc',
  'MBBS',
  'LLB',
  'MBA',
];

export const UNIVERSITIES = [
  'University of Azad Jammu & Kashmir (UAJK)',
  'Mirpur University of Science & Technology (MUST)',
  'Allama Iqbal Open University (AIOU)',
  'University of the Punjab',
  'COMSATS University',
  'NUML Islamabad',
  'Bahauddin Zakariya University',
  'Quaid-i-Azam University',
];

export const BADGES = ['Badge A', 'Badge B', 'Badge C', 'Badge D'];

export const EXAM_CENTERS = [
  'Govt. Degree College Muzaffarabad',
  'Govt. Degree College Mirpur',
  'Govt. Degree College Kotli',
  'Govt. Boys High School Bhimber',
  'Govt. Degree College Bagh',
  'Govt. Degree College Rawalakot',
  'Govt. Degree College Pallandri',
  'Govt. Degree College Hattian Bala',
];

export const SHIFTS = ['Morning', 'Evening'];

const FIRST_NAMES_M = ['Muhammad Ahmed', 'Usman Ali', 'Bilal Hussain', 'Zeeshan Khalid', 'Tariq Mehmood', 'Faisal Javed', 'Adnan Rasheed', 'Imran Sarwar', 'Waqas Naeem', 'Kamran Shahzad'];
const FIRST_NAMES_F = ['Ayesha Bibi', 'Sana Rani', 'Mehwish Kausar', 'Farah Naz', 'Rabia Shaheen', 'Hina Yasmeen', 'Sadia Perveen', 'Nadia Iqbal', 'Sobia Anjum', 'Mariam Sultana'];
const FATHER_NAMES = ['Ghulam Rasool', 'Muhammad Sharif', 'Abdul Rasheed', 'Muhammad Yaqoob', 'Karam Dad', 'Muhammad Sadiq', 'Ghulam Nabi', 'Muhammad Yasin', 'Abdul Qayyum', 'Muhammad Anwar'];

// ── Module 1: Application Summary Report ───────────────────────────────────
export const applicationSummaryRows = Array.from({ length: 36 }).map((_, i) => {
  const advertisement = pickIndexed(ADVERTISEMENTS, i).label;
  const postName = pickIndexed(POSTS, i);
  const department = pickIndexed(DEPARTMENTS, i + 2);
  const category = pickIndexed(CATEGORIES, i + 1);
  const gender = pickIndexed(GENDERS, i);
  const district = pickIndexed(DISTRICTS, i + 3);
  const degree = pickIndexed(DEGREES, i + 4);
  const university = pickIndexed(UNIVERSITIES, i + 1);
  const badge = pickIndexed(BADGES, i);
  const day = 1 + (i % 28);
  return {
    id: i + 1,
    srNo: i + 1,
    advertisement,
    postName,
    department,
    category,
    gender,
    district,
    degree,
    university,
    badge,
    totalApplications: intBetween(8, 220),
    // Used only for the "Date Range" filter — not shown as a table column.
    submittedDate: `2026-0${1 + (i % 6)}-${String(day).padStart(2, '0')}`,
  };
});

// ── Module 2 / Page 1: Center-wise Candidate Report ─────────────────────────
export const centerWiseCandidateRows = Array.from({ length: 48 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i) : pickIndexed(FIRST_NAMES_F, i);
  const district = pickIndexed(DISTRICTS, i + 5);
  const examinationCenter = pickIndexed(EXAM_CENTERS, i);
  const advertisement = pickIndexed(ADVERTISEMENTS, i + 1).label;
  const postName = pickIndexed(POSTS, i + 3);
  const day = 10 + (i % 15);
  return {
    id: i + 1,
    srNo: i + 1,
    rollNo: `AJK-${25000 + i}`,
    candidateName,
    fatherName: pickIndexed(FATHER_NAMES, i + 2),
    postName,
    advertisementNo: advertisement,
    examinationCenter,
    gender,
    district,
    badge: pickIndexed(BADGES, i + 1),
    // Used only for the "Shift" / "Date" filters — not shown as a table column.
    shift: pickIndexed(SHIFTS, i),
    examDate: `2026-08-${String(day).padStart(2, '0')}`,
  };
});

// ── Module 2 / Page 2: Candidate Distribution Report ────────────────────────
export const candidateDistributionRows = Array.from({ length: 24 }).map((_, i) => {
  const shift = pickIndexed(SHIFTS, i);
  const day = 10 + (i % 15);
  return {
    id: i + 1,
    srNo: i + 1,
    centerName: pickIndexed(EXAM_CENTERS, i),
    advertisementNo: pickIndexed(ADVERTISEMENTS, i + 2).label,
    postName: pickIndexed(POSTS, i + 6),
    date: `2026-08-${String(day).padStart(2, '0')}`,
    time: shift === 'Morning' ? '09:00 AM' : '02:00 PM',
    shift,
    totalCandidates: intBetween(20, 180),
  };
});

// ── Module 3: Marks & Result Reports ────────────────────────────────────────

export const WRITTEN_EXAM_SUBJECTS = [
  'General Knowledge',
  'English',
  'Pakistan Studies',
  'Islamic Studies',
  'Professional Subject',
];

export const CCE_OPTIONAL_SUBJECTS = [
  'Economics',
  'Political Science',
  'Public Administration',
  'International Relations',
  'Sociology',
  'History',
];

export const CCE_COMPULSORY_SUBJECTS = [
  'General Knowledge',
  'Essay & Precis',
  'Islamic Studies / Pakistan Affairs',
  'English (Compulsory)',
];

// One row per candidate per subject — mirrors how a "compiled marksheet" is
// laid out on paper (subject-wise rows grouped by roll number).
export const writtenMarksheetRows = (() => {
  const rows = [];
  let rowId = 1;
  const CANDIDATE_COUNT = 10;
  for (let c = 0; c < CANDIDATE_COUNT; c++) {
    const gender = pickIndexed(GENDERS, c);
    const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, c) : pickIndexed(FIRST_NAMES_F, c);
    const fatherName = pickIndexed(FATHER_NAMES, c + 3);
    const rollNo = `WEX-${31000 + c}`;
    const advertisementNo = pickIndexed(ADVERTISEMENTS, c + 1).label;
    const post = pickIndexed(POSTS, c + 2);

    // Compute all subject scores first so "Aggregate" (candidate average) can
    // be embedded on every one of that candidate's subject rows.
    const subjectScores = WRITTEN_EXAM_SUBJECTS.map((subject, s) => ({
      subject,
      obtainedMarks: intBetween(28, 98),
      totalMarks: 100,
    }));
    const aggregate = Math.round(
      (subjectScores.reduce((sum, s) => sum + s.obtainedMarks, 0) / (subjectScores.length * 100)) * 10000
    ) / 100;
    const overallResult = aggregate >= 40 ? 'Pass' : 'Fail';

    for (let s = 0; s < subjectScores.length; s++) {
      const { subject, obtainedMarks, totalMarks } = subjectScores[s];
      rows.push({
        id: rowId,
        srNo: rowId,
        rollNo,
        candidateName,
        fatherName,
        advertisementNo,
        post,
        subject,
        obtainedMarks,
        totalMarks,
        percentage: Math.round((obtainedMarks / totalMarks) * 10000) / 100,
        // Candidate's overall aggregate % and final result — repeated on
        // every subject row, matching how a compiled marksheet is printed.
        aggregate,
        result: overallResult,
      });
      rowId++;
    }
  }
  return rows;
})();

// One row per candidate — CCE marksheets aggregate optional + compulsory
// subject marks into a single written score plus a viva score.
export const cceMarksheetRows = Array.from({ length: 18 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i + 1);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 4) : pickIndexed(FIRST_NAMES_F, i + 4);
  const optionalSubjects = [
    pickIndexed(CCE_OPTIONAL_SUBJECTS, i),
    pickIndexed(CCE_OPTIONAL_SUBJECTS, i + 3),
  ];
  const writtenMarks = intBetween(320, 720);
  const vivaMarks = intBetween(60, 190);
  const aggregate = writtenMarks + vivaMarks;
  const aggregatePercent = Math.round((aggregate / 1000) * 10000) / 100;
  return {
    id: i + 1,
    srNo: i + 1,
    rollNo: `CCE-${42000 + i}`,
    candidateName,
    advertisementNo: pickIndexed(ADVERTISEMENTS, i + 3).label,
    post: pickIndexed(POSTS, i + 5),
    optionalSubjects,
    compulsorySubjects: CCE_COMPULSORY_SUBJECTS,
    writtenMarks,
    totalWrittenMarks: 800,
    vivaMarks,
    totalVivaMarks: 200,
    aggregate,
    aggregatePercent,
    result: aggregatePercent >= 50 ? 'Pass' : 'Fail',
  };
});

// Curated (hand-authored, not generated) summary used by the Pass/Fail
// Statistics Report — stat cards, pie/bar charts, and the table view all
// derive from this single object.
export const passFailStatistics = {
  overall: { totalCandidates: 1240, pass: 812, fail: 428 },
  examTypes: [
    { examType: 'One Paper MCQs', totalCandidates: 310, pass: 221, fail: 89 },
    { examType: 'Two Paper MCQs', totalCandidates: 268, pass: 174, fail: 94 },
    { examType: 'Written Exam', totalCandidates: 412, pass: 261, fail: 151 },
    { examType: 'CCE', totalCandidates: 250, pass: 156, fail: 94 },
  ],
  subjectWise: [
    { examType: 'Written Exam', subject: 'General Knowledge', totalCandidates: 412, pass: 300, fail: 112 },
    { examType: 'Written Exam', subject: 'English', totalCandidates: 412, pass: 268, fail: 144 },
    { examType: 'Written Exam', subject: 'Pakistan Studies', totalCandidates: 412, pass: 312, fail: 100 },
    { examType: 'Written Exam', subject: 'Islamic Studies', totalCandidates: 412, pass: 330, fail: 82 },
    { examType: 'Written Exam', subject: 'Professional Subject', totalCandidates: 412, pass: 245, fail: 167 },
    { examType: 'CCE', subject: 'General Knowledge', totalCandidates: 250, pass: 192, fail: 58 },
    { examType: 'CCE', subject: 'Essay & Precis', totalCandidates: 250, pass: 165, fail: 85 },
    { examType: 'CCE', subject: 'English (Compulsory)', totalCandidates: 250, pass: 178, fail: 72 },
    { examType: 'CCE', subject: 'Optional Subjects (avg.)', totalCandidates: 250, pass: 170, fail: 80 },
  ],
};

export const MERIT_STATUSES = ['Recommended', 'Waitlisted', 'Not Recommended'];

// One row per candidate, ranked within its (advertisement, post) group —
// simulates a category-wise merit list (open merit / gender / district quota
// resolution happens per group in a real system; the mock keeps ranking
// simple and deterministic).
export const meritListRows = (() => {
  const rows = [];
  const GROUP_COUNT = 6;
  const CANDIDATES_PER_GROUP = 5;
  const TOTAL_POSSIBLE_MARKS = 500;

  for (let g = 0; g < GROUP_COUNT; g++) {
    const advertisementNo = pickIndexed(ADVERTISEMENTS, g).label;
    const post = pickIndexed(POSTS, g + 1);
    const candidates = [];

    for (let c = 0; c < CANDIDATES_PER_GROUP; c++) {
      const idx = g * CANDIDATES_PER_GROUP + c;
      const gender = pickIndexed(GENDERS, idx);
      candidates.push({
        rollNo: `MER-${51000 + idx}`,
        candidateName: gender === 'Male' ? pickIndexed(FIRST_NAMES_M, idx + 1) : pickIndexed(FIRST_NAMES_F, idx + 1),
        fatherName: pickIndexed(FATHER_NAMES, idx + 4),
        district: pickIndexed(DISTRICTS, idx + 2),
        gender,
        totalMarks: intBetween(360, 480),
      });
    }

    // Rank within the group by total marks, highest first.
    candidates.sort((a, b) => b.totalMarks - a.totalMarks);

    for (let rankIdx = 0; rankIdx < candidates.length; rankIdx++) {
      const rank = rankIdx + 1;
      const cand = candidates[rankIdx];
      rows.push({
        id: `${g}-${rankIdx}`,
        rank,
        rollNo: cand.rollNo,
        candidateName: cand.candidateName,
        fatherName: cand.fatherName,
        district: cand.district,
        advertisementNo,
        gender: cand.gender,
        post,
        totalMarks: cand.totalMarks,
        totalPossibleMarks: TOTAL_POSSIBLE_MARKS,
        percentage: Math.round((cand.totalMarks / TOTAL_POSSIBLE_MARKS) * 10000) / 100,
        meritStatus: rank <= 2 ? 'Recommended' : rank <= 3 ? 'Waitlisted' : 'Not Recommended',
      });
    }
  }
  return rows;
})();

// Curated tie groups — every candidate in this report shares its group's
// aggregate with at least one other candidate. Earlier roll number wins the
// tie, per the stated rule.
export const tieBreakingRows = (() => {
  const TIE_GROUPS = [
    { aggregate: 412.5, size: 2 },
    { aggregate: 398.0, size: 3 },
    { aggregate: 445.25, size: 2 },
    { aggregate: 375.75, size: 2 },
    { aggregate: 420.0, size: 3 },
  ];
  const rows = [];
  let srNo = 1;

  for (let g = 0; g < TIE_GROUPS.length; g++) {
    const { aggregate, size } = TIE_GROUPS[g];
    const advertisementNo = pickIndexed(ADVERTISEMENTS, g).label;
    const post = pickIndexed(POSTS, g + 2);
    const candidates = [];

    for (let c = 0; c < size; c++) {
      const idx = g * 10 + c;
      const gender = pickIndexed(GENDERS, idx);
      candidates.push({
        rollNo: `TIE-${6000 + idx}`,
        candidateName: gender === 'Male' ? pickIndexed(FIRST_NAMES_M, idx + 2) : pickIndexed(FIRST_NAMES_F, idx + 2),
        fatherName: pickIndexed(FATHER_NAMES, idx + 5),
        district: pickIndexed(DISTRICTS, idx + 1),
        gender,
      });
    }

    // Earlier roll number is preferred when aggregates are equal.
    candidates.sort((a, b) => (a.rollNo < b.rollNo ? -1 : 1));

    for (let c = 0; c < candidates.length; c++) {
      const cand = candidates[c];
      rows.push({
        id: srNo,
        srNo,
        rollNo: cand.rollNo,
        candidateName: cand.candidateName,
        fatherName: cand.fatherName,
        district: cand.district,
        advertisementNo,
        post,
        gender: cand.gender,
        aggregate,
        tieBreakRule: 'Earlier Roll Number Preferred',
        finalRank: c + 1,
        // Used only for row highlighting — not a display column.
        tieGroup: g,
      });
      srNo++;
    }
  }
  return rows;
})();

export const IMPORT_DISCREPANCY_STATUSES = ['Match', 'Modified', 'Missing', 'Duplicate'];

// Simulates comparing a freshly imported Excel batch against previously
// recorded marks.
export const importDiscrepancyRows = (() => {
  const rows = [];
  const COUNT = 20;

  for (let i = 0; i < COUNT; i++) {
    const gender = pickIndexed(GENDERS, i);
    const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 5) : pickIndexed(FIRST_NAMES_F, i + 5);
    const status = pickIndexed(IMPORT_DISCREPANCY_STATUSES, i);
    const basePrevious = intBetween(120, 480);

    let previousMarks = basePrevious;
    let importedMarks = basePrevious;
    if (status === 'Modified') {
      importedMarks = basePrevious + intBetween(5, 35) * (i % 2 === 0 ? 1 : -1);
    } else if (status === 'Missing') {
      previousMarks = null; // no prior record on file
      importedMarks = basePrevious;
    }
    // 'Match' and 'Duplicate' keep imported === previous — a duplicate is
    // flagged because the roll number appears more than once in the import,
    // not because the marks themselves differ.

    rows.push({
      id: i + 1,
      candidateName,
      rollNo: `IMP-${71000 + i}`,
      previousMarks,
      importedMarks,
      difference: previousMarks === null ? null : importedMarks - previousMarks,
      status,
    });
  }
  return rows;
})();

export const TOP_MARKS_STATUSES = ['Pending Verification', 'Verified', 'Documents Submitted'];

// Highest-scoring candidates who cleared the merit cutoff and are now in the
// document verification pipeline.
export const topMarksMeritRows = Array.from({ length: 20 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 6) : pickIndexed(FIRST_NAMES_F, i + 6);
  return {
    id: i + 1,
    srNo: i + 1,
    rollNo: `TOP-${81000 + i}`,
    candidateName,
    fatherName: pickIndexed(FATHER_NAMES, i + 1),
    district: pickIndexed(DISTRICTS, i + 4),
    advertisementNo: pickIndexed(ADVERTISEMENTS, i + 1).label,
    post: pickIndexed(POSTS, i + 3),
    gender,
    marks: intBetween(420, 495),
    status: pickIndexed(TOP_MARKS_STATUSES, i),
  };
});

export const REJECTION_REASONS = [
  'CNIC Mismatch',
  'Age Limit Exceeded',
  'Invalid Domicile Certificate',
  'Missing Educational Documents',
  'Forged / Fake Documents',
  'Experience Certificate Not Verified',
  'Photograph Mismatch',
  'Duplicate Application',
];

// Candidates rejected at the initial document verification stage.
export const candidateRejectionRows = Array.from({ length: 18 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i + 1);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 2) : pickIndexed(FIRST_NAMES_F, i + 2);
  return {
    id: i + 1,
    srNo: i + 1,
    rollNo: `REJ-${91000 + i}`,
    candidateName,
    fatherName: pickIndexed(FATHER_NAMES, i + 6),
    district: pickIndexed(DISTRICTS, i + 6),
    advertisementNo: pickIndexed(ADVERTISEMENTS, i + 2).label,
    post: pickIndexed(POSTS, i + 4),
    gender,
    rejectionReason: pickIndexed(REJECTION_REASONS, i),
    status: 'Rejected',
  };
});

export const FINAL_REJECTION_REASONS = [
  'Appeal Rejected — Document Mismatch Confirmed',
  'Appeal Rejected — Age Limit Exceeded',
  'Appeal Rejected — Fraudulent Documents',
  'No Appeal Filed Within Deadline',
  'Appeal Rejected — Domicile Verification Failed',
];

// Candidates whose rejection was upheld after the appeal process.
export const finalRejectedCandidateRows = Array.from({ length: 14 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 7) : pickIndexed(FIRST_NAMES_F, i + 7);
  return {
    id: i + 1,
    srNo: i + 1,
    rollNo: `FRJ-${95000 + i}`,
    candidateName,
    fatherName: pickIndexed(FATHER_NAMES, i + 8),
    district: pickIndexed(DISTRICTS, i + 8),
    advertisementNo: pickIndexed(ADVERTISEMENTS, i + 3).label,
    post: pickIndexed(POSTS, i + 7),
    gender,
    finalRejectionReason: pickIndexed(FINAL_REJECTION_REASONS, i),
    finalStatus: 'Finally Rejected',
  };
});

// ── Module 4: Interview / Viva Reports ──────────────────────────────────────
// Row fields below are snake_case on purpose — they mimic the shape the real
// MarksReportController-style endpoints will return, so each page's mapRow()
// (snake_case → camelCase) already matches the live response and needs no
// changes once reportsApi's mock methods are swapped for real fetch() calls.

export const INTERVIEW_BOARDS = ['Interview Board - I', 'Interview Board - II', 'Interview Board - III'];
export const INTERVIEW_SCHEDULE_STATUSES = ['Scheduled', 'Completed', 'Rescheduled', 'Cancelled'];
export const EVALUATION_STATUSES = ['Completed', 'Pending'];
export const FINAL_MERIT_STATUSES = ['Selected', 'Waiting List', 'Not Selected', 'Reserved Category', 'Recommended'];

const INTERVIEW_REMARKS = [
  'Strong communication skills',
  'Good subject knowledge',
  'Satisfactory performance',
  'Excellent overall impression',
  'Needs improvement in confidence',
];

export const interviewScheduleApiRows = Array.from({ length: 20 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 1) : pickIndexed(FIRST_NAMES_F, i + 1);
  const day = 3 + (i % 18);
  return {
    sr_no: i + 1,
    roll_no: `SCH-${72000 + i}`,
    candidate_name: candidateName,
    father_name: pickIndexed(FATHER_NAMES, i + 4),
    advertisement_no: pickIndexed(ADVERTISEMENTS, i).label,
    post: pickIndexed(POSTS, i + 1),
    interview_board: pickIndexed(INTERVIEW_BOARDS, i),
    interview_date: `2026-10-${String(day).padStart(2, '0')}`,
    interview_time: i % 3 === 0 ? '09:30 AM' : i % 3 === 1 ? '11:00 AM' : '02:00 PM',
    venue: pickIndexed(EXAM_CENTERS, i + 2),
    status: pickIndexed(INTERVIEW_SCHEDULE_STATUSES, i),
  };
});

export const interviewMarksCompilationApiRows = Array.from({ length: 20 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i + 1);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 2) : pickIndexed(FIRST_NAMES_F, i + 2);
  const status = pickIndexed(EVALUATION_STATUSES, i);
  const totalInterviewMarks = 100;
  const interviewMarks = status === 'Completed' ? intBetween(45, 98) : null;
  return {
    sr_no: i + 1,
    roll_no: `IMC-${74000 + i}`,
    candidate_name: candidateName,
    father_name: pickIndexed(FATHER_NAMES, i + 5),
    advertisement_no: pickIndexed(ADVERTISEMENTS, i + 1).label,
    post: pickIndexed(POSTS, i + 2),
    interview_board: pickIndexed(INTERVIEW_BOARDS, i + 1),
    interview_marks: interviewMarks,
    total_interview_marks: totalInterviewMarks,
    percentage: interviewMarks === null ? null : Math.round((interviewMarks / totalInterviewMarks) * 10000) / 100,
    remarks: status === 'Completed' ? pickIndexed(INTERVIEW_REMARKS, i) : 'Evaluation pending',
    status,
  };
});

// Ranked within each (advertisement, post) group by combined written +
// interview score, mirroring how a real combined-merit computation groups
// candidates per vacancy.
export const combinedMeritApiRows = (() => {
  const rows = [];
  const GROUP_COUNT = 4;
  const CANDIDATES_PER_GROUP = 5;
  const WRITTEN_TOTAL = 500;
  const INTERVIEW_TOTAL = 100;
  const GRAND_TOTAL = WRITTEN_TOTAL + INTERVIEW_TOTAL;

  for (let g = 0; g < GROUP_COUNT; g++) {
    const advertisementNo = pickIndexed(ADVERTISEMENTS, g + 1).label;
    const post = pickIndexed(POSTS, g + 2);
    const candidates = [];

    for (let c = 0; c < CANDIDATES_PER_GROUP; c++) {
      const idx = g * CANDIDATES_PER_GROUP + c;
      const gender = pickIndexed(GENDERS, idx);
      candidates.push({
        rollNo: `CMB-${76000 + idx}`,
        candidateName: gender === 'Male' ? pickIndexed(FIRST_NAMES_M, idx + 3) : pickIndexed(FIRST_NAMES_F, idx + 3),
        fatherName: pickIndexed(FATHER_NAMES, idx + 7),
        gender,
        writtenMarks: intBetween(300, 470),
        interviewMarks: intBetween(45, 95),
      });
    }

    // Rank within the group by combined written + interview score.
    candidates.sort((a, b) => (b.writtenMarks + b.interviewMarks) - (a.writtenMarks + a.interviewMarks));

    for (let rankIdx = 0; rankIdx < candidates.length; rankIdx++) {
      const rank = rankIdx + 1;
      const cand = candidates[rankIdx];
      const aggregate = cand.writtenMarks + cand.interviewMarks;
      const finalStatus =
        rank === 1 ? 'Selected' :
        rank === 2 ? 'Waiting List' :
        rank === 3 ? 'Reserved Category' :
        rank === 4 ? 'Recommended' : 'Not Selected';
      rows.push({
        merit_rank: rank,
        roll_no: cand.rollNo,
        candidate_name: cand.candidateName,
        father_name: cand.fatherName,
        advertisement_no: advertisementNo,
        post,
        gender: cand.gender,
        written_marks: cand.writtenMarks,
        interview_marks: cand.interviewMarks,
        aggregate_marks: aggregate,
        final_percentage: Math.round((aggregate / GRAND_TOTAL) * 10000) / 100,
        final_merit_status: finalStatus,
        remarks:
          finalStatus === 'Selected' ? 'Recommended for appointment' :
          finalStatus === 'Not Selected' ? 'Did not meet merit cutoff' : '',
      });
    }
  }
  return rows;
})();

// ── Module 5: Administrative & Audit Reports ────────────────────────────────
// Row fields below are snake_case on purpose — see the Interview / Viva
// Reports note above for why (mimics the anticipated live response shape).

export const COMPLAINT_TYPES = [
  'Marks Discrepancy',
  'Result Delay',
  'Document Rejection Appeal',
  'Interview Scheduling Issue',
  'Roll Number Error',
  'Harassment Complaint',
];

export const COMPLAINT_STATUSES = ['Pending', 'Under Review', 'Resolved', 'Closed', 'Rejected'];

const ASSIGNED_OFFICERS = [
  'Ch. Abdul Rehman',
  'Ms. Nazia Hameed',
  'Mr. Tariq Farooq',
  'Syed Kashif Hussain',
  'Ms. Amina Malik',
];

const COMPLAINT_REMARKS = [
  'Awaiting candidate response',
  'Escalated to exam branch',
  'Verified against original record',
  'Resolved after re-checking marks',
  'Closed — no further action required',
];

export const grievanceComplaintApiRows = Array.from({ length: 24 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 8) : pickIndexed(FIRST_NAMES_F, i + 8);
  const status = pickIndexed(COMPLAINT_STATUSES, i);
  const complaintMonth = 1 + (i % 8);
  const complaintDay = 1 + (i % 26);
  const isResolvedLike = status === 'Resolved' || status === 'Closed';
  const resolutionMonth = 1 + ((i + 1) % 8);
  const resolutionDay = 3 + ((complaintDay + 2) % 25);
  return {
    complaint_id: `GRV-2026-${String(1000 + i)}`,
    candidate_name: candidateName,
    roll_no: `CND-${52000 + i}`,
    advertisement_no: pickIndexed(ADVERTISEMENTS, i + 1).label,
    post: pickIndexed(POSTS, i + 2),
    complaint_type: pickIndexed(COMPLAINT_TYPES, i),
    complaint_date: `2026-${String(complaintMonth).padStart(2, '0')}-${String(complaintDay).padStart(2, '0')}`,
    assigned_officer: pickIndexed(ASSIGNED_OFFICERS, i),
    status,
    resolution_date: isResolvedLike
      ? `2026-${String(resolutionMonth).padStart(2, '0')}-${String(resolutionDay).padStart(2, '0')}`
      : null,
    remarks: pickIndexed(COMPLAINT_REMARKS, i),
  };
});

// One row per (advertisement, post) posting — an aggregate recruitment
// funnel, not a per-candidate list.
export const vacancyFunnelApiRows = [
  { advertisement_no: 'Advertisement No. 01/2025', post: 'Assistant',           vacancies: 12, applications_received: 480, eligible: 410, written_qualified: 180, interview_qualified: 40, selected: 12 },
  { advertisement_no: 'Advertisement No. 01/2025', post: 'Junior Clerk',        vacancies: 20, applications_received: 620, eligible: 545, written_qualified: 230, interview_qualified: 60, selected: 20 },
  { advertisement_no: 'Advertisement No. 02/2025', post: 'Sub Inspector',       vacancies: 8,  applications_received: 390, eligible: 340, written_qualified: 120, interview_qualified: 24, selected: 8  },
  { advertisement_no: 'Advertisement No. 02/2025', post: 'Naib Tehsildar',      vacancies: 6,  applications_received: 210, eligible: 175, written_qualified: 70,  interview_qualified: 18, selected: 6  },
  { advertisement_no: 'Advertisement No. 03/2025', post: 'Lecturer',            vacancies: 15, applications_received: 340, eligible: 300, written_qualified: 150, interview_qualified: 45, selected: 15 },
  { advertisement_no: 'Advertisement No. 03/2025', post: 'Medical Officer',     vacancies: 10, applications_received: 260, eligible: 230, written_qualified: 110, interview_qualified: 30, selected: 10 },
  { advertisement_no: 'Advertisement No. 04/2025', post: 'Agriculture Officer', vacancies: 5,  applications_received: 150, eligible: 128, written_qualified: 55,  interview_qualified: 15, selected: 5  },
].map((row) => ({
  ...row,
  selection_percentage: Math.round((row.selected / row.applications_received) * 10000) / 100,
}));

// One row per year — recruitment cycle totals used to compare performance
// year over year.
export const yearOverYearApiRows = [
  { year: 2022, advertisements: 6,  applications: 12500, qualified: 5200, selected: 620 },
  { year: 2023, advertisements: 7,  applications: 14800, qualified: 6100, selected: 710 },
  { year: 2024, advertisements: 8,  applications: 16200, qualified: 7050, selected: 780 },
  { year: 2025, advertisements: 9,  applications: 18400, qualified: 8100, selected: 860 },
  { year: 2026, advertisements: 10, applications: 19600, qualified: 8900, selected: 940 },
].map((row) => ({
  ...row,
  pass_percentage: Math.round((row.qualified / row.applications) * 10000) / 100,
  selection_percentage: Math.round((row.selected / row.applications) * 10000) / 100,
}));

// One row per reservation/quota category.
export const SELECTION_CATEGORIES = ['Open Merit', 'Women Quota', 'Disabled Quota', 'District Quota'];

export const categorySelectionApiRows = [
  { category: 'Open Merit',     applicants: 3800, qualified: 1650, selected: 210, reserved_seats: 210, filled_seats: 210, remaining_seats: 0 },
  { category: 'Women Quota',    applicants: 620,  qualified: 260,  selected: 40,  reserved_seats: 45,  filled_seats: 40,  remaining_seats: 5 },
  { category: 'Disabled Quota', applicants: 95,   qualified: 38,   selected: 8,   reserved_seats: 10,  filled_seats: 8,   remaining_seats: 2 },
  { category: 'District Quota', applicants: 480,  qualified: 190,  selected: 30,  reserved_seats: 32,  filled_seats: 30,  remaining_seats: 2 },
].map((row) => ({
  ...row,
  selection_ratio: Math.round((row.selected / row.applicants) * 10000) / 100,
}));

// Candidates shortlisted for interview.
export const interviewShortlistRows = Array.from({ length: 22 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 3) : pickIndexed(FIRST_NAMES_F, i + 3);
  const day = 5 + (i % 20);
  return {
    id: i + 1,
    srNo: i + 1,
    rollNo: `INT-${61000 + i}`,
    candidateName,
    fatherName: pickIndexed(FATHER_NAMES, i + 9),
    district: pickIndexed(DISTRICTS, i + 2),
    advertisementNo: pickIndexed(ADVERTISEMENTS, i).label,
    post: pickIndexed(POSTS, i + 1),
    gender,
    interviewDate: `2026-09-${String(day).padStart(2, '0')}`,
    interviewTime: i % 2 === 0 ? '10:00 AM' : '02:30 PM',
    status: 'Shortlisted',
  };
});

// Final interview award list — includes qualification and DOB for
// eligibility verification alongside the interview score.
export const awardListInterviewRows = Array.from({ length: 16 }).map((_, i) => {
  const gender = pickIndexed(GENDERS, i + 1);
  const candidateName = gender === 'Male' ? pickIndexed(FIRST_NAMES_M, i + 5) : pickIndexed(FIRST_NAMES_F, i + 5);
  const birthYear = 1990 + (i % 11);
  const birthMonth = 1 + (i % 12);
  const birthDay = 1 + (i % 28);
  const interviewMarks = intBetween(55, 100);
  const totalMarks = 100;
  return {
    id: i + 1,
    srNo: i + 1,
    rollNo: `AWD-${65000 + i}`,
    candidateName,
    fatherName: pickIndexed(FATHER_NAMES, i + 3),
    qualification: pickIndexed(DEGREES, i + 5),
    district: pickIndexed(DISTRICTS, i + 4),
    dateOfBirth: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
    advertisementNo: pickIndexed(ADVERTISEMENTS, i + 1).label,
    post: pickIndexed(POSTS, i + 2),
    gender,
    interviewMarks,
    totalMarks,
    finalStatus: interviewMarks >= 65 ? 'Selected' : 'Not Selected',
  };
});
