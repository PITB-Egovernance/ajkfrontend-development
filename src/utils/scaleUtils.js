/**
 * Readable pay scale for a job post.
 *
 * `job.scale` is the raw column: it usually holds a grade *hash id* ("8RBVXPnv9dgp"), never something
 * to show a person. The backend resolves it into `job.scale_text` (the grade name, e.g. "BS-16" or
 * "BPS-17"). Always show that. A hash that could not be resolved is never printed — it becomes "—".
 */

// Same test the backend uses to tell a hash from readable text (JobDetail::getScaleTextAttribute).
const looksLikeHash = (value) => /^[A-Za-z0-9]{10,}$/.test(String(value ?? '').trim());

export const formatScale = (job, empty = '—') => {
  const readable = String(job?.scale_text ?? '').trim();
  const raw = String(job?.scale ?? '').trim();

  const value = readable || (raw && !looksLikeHash(raw) ? raw : '');
  if (!value) return empty;

  // A bare number ("17") is a BPS scale; a name ("BS-16", "BPS-17") is shown as it is.
  return /^\d+$/.test(value) ? `BPS-${value}` : value;
};
