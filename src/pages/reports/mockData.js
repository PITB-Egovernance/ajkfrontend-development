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
