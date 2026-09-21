/**
 * Edit / Delete rules for advertisements, mirrored from the backend
 * (App\Models\Advertisement::lifecycleFlags). The backend is the source of truth and
 * ships a `lifecycle` object with every advertisement; this only derives the same
 * answer when that object is missing (e.g. an older API response), and the backend
 * enforces the delete rule again regardless. Closed advertisements (permanently or by the
 * calendar) stay editable; they just cannot be deleted.
 */

const REOPENED = ['reopen', 'temporary_closed'];

const startOfDay = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isPermanentlyClosed = (ad) => String(ad?.status || '').toLowerCase() === 'permanently_closed';

export const isAutoClosed = (ad) => {
  const status = String(ad?.status || '').toLowerCase();
  if (isPermanentlyClosed(ad) || REOPENED.includes(status)) return false;
  const dates = [ad?.closing_date, ad?.extend_date].map((v) => (v ? startOfDay(v) : null)).filter(Boolean);
  if (dates.length === 0) return false;
  const last = new Date(Math.max(...dates.map((d) => d.getTime())));
  return last < startOfDay(new Date());
};

export const DELETE_LOCK_MESSAGES = {
  ADVERTISEMENT_PERMANENTLY_CLOSED:
    'This advertisement is permanently closed. It can still be edited, but it can no longer be deleted.',
  ADVERTISEMENT_AUTO_CLOSED:
    'The closing date of this advertisement has passed, so it is closed. It can still be edited, but it can no longer be deleted.',
  ADVERTISEMENT_HAS_APPLICATIONS:
    'This advertisement cannot be deleted because candidates have already applied to it. Deleting it would remove their applications from the record.',
};

/** True when the delete lock is the "closed" one (as opposed to "candidates have applied"). */
export const isClosedDeleteLock = (deleteLockCode) =>
  deleteLockCode === 'ADVERTISEMENT_PERMANENTLY_CLOSED' || deleteLockCode === 'ADVERTISEMENT_AUTO_CLOSED';

/** { canEdit, canDelete, editLockCode, editLockMessage, deleteLockCode, deleteLockMessage } */
export const getAdvertisementLifecycle = (ad) => {
  const lc = ad?.lifecycle;
  if (lc && typeof lc.can_edit === 'boolean') {
    return {
      canEdit: lc.can_edit,
      canDelete: lc.can_delete,
      editLockCode: lc.edit_lock_code || null,
      editLockMessage: lc.edit_lock_message || null,
      deleteLockCode: lc.delete_lock_code || null,
      deleteLockMessage: lc.delete_lock_message || null,
    };
  }

  const closedCode = isPermanentlyClosed(ad)
    ? 'ADVERTISEMENT_PERMANENTLY_CLOSED'
    : isAutoClosed(ad)
      ? 'ADVERTISEMENT_AUTO_CLOSED'
      : null;
  const applied = Number(ad?.total_applications ?? 0) > 0;
  const deleteCode = closedCode || (applied ? 'ADVERTISEMENT_HAS_APPLICATIONS' : null);

  return {
    canEdit: true,
    canDelete: !deleteCode,
    editLockCode: null,
    editLockMessage: null,
    deleteLockCode: deleteCode,
    deleteLockMessage: deleteCode ? DELETE_LOCK_MESSAGES[deleteCode] : null,
  };
};
