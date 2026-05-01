const normalizeDocType = (doc = {}) => {
  const rawType = (doc.doc_type || doc.document_type || doc.type || '').toString().toLowerCase();
  return rawType.replace(/[\s-]+/g, '_');
};

const isDocVerified = (documents = [], ...matchers) =>
  documents.some((doc) => {
    if (!doc?.ocr_verified) return false;
    const docType = normalizeDocType(doc);
    return matchers.some((matcher) => docType.includes(matcher));
  });

export const getApplicationOcrBatch = (documents = []) => {
  const cnicFrontVerified = isDocVerified(documents, 'cnic_front', 'cnic_front_side', 'front_cnic', 'cnicfront');
  const educationVerified = isDocVerified(
    documents,
    'education',
    'degree',
    'transcript',
    'marksheet',
    'bachelor',
    'master',
    'matric',
    'intermediate',
    'phd',
    'diploma',
    'certificate'
  );
  const domicileVerified = isDocVerified(documents, 'domicile', 'domicile_certificate');
  const experienceVerified = isDocVerified(documents, 'experience', 'employment');
  const otherCertificationsVerified = isDocVerified(documents, 'certification', 'other_certificate', 'experience_letter');

  // Red: CNIC front and education are both not verified.
  if (!cnicFrontVerified && !educationVerified) {
    return 'red';
  }

  // Green: minimum mandatory verification available.
  if (domicileVerified && cnicFrontVerified && educationVerified) {
    return 'green';
  }

  // Yellow: only optional documents are pending.
  if (cnicFrontVerified && educationVerified && (!experienceVerified || !otherCertificationsVerified)) {
    return 'yellow';
  }

  return 'red';
};

export const getApplicationOcrBatchLabel = (batch = '') => {
  if (batch === 'green') return 'OCR Verified';
  if (batch === 'yellow') return 'OCR Partially Verified';
  if (batch === 'red') return 'OCR Not Verified';
  return 'N/A';
};

export const getApplicationOcrBatchPillClass = (batch = '') => {
  if (batch === 'red') return 'bg-red-100 text-red-700 border-red-200';
  if (batch === 'yellow') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (batch === 'green') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export const formatApplicationDocumentType = (doc = {}) => {
  const value = (doc.doc_type || doc.document_type || doc.type || '').toString().trim();
  if (!value) return 'unknown';
  return value.replace(/_/g, ' ');
};

