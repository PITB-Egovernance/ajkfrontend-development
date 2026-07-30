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
