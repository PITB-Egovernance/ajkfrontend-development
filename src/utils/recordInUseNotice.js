import toast from 'react-hot-toast';
import alertDialog from 'components/ui/alertDialog';

// When the backend refuses to delete a record that other records still use (409, errors.code
// RECORD_IN_USE — see the backend's config/deletion_guards.php), explain it in an alert dialog on
// every screen, instead of each screen's generic "Failed to delete" toast.

const SUPPRESS_MS = 3000;
let suppressErrorToastsUntil = 0;

export const RECORD_IN_USE = 'RECORD_IN_USE';

/** Show the in-use explanation; the screen's own error toast for the same failure is skipped. */
export const showRecordInUse = (message) => {
  suppressErrorToastsUntil = Date.now() + SUPPRESS_MS;
  return alertDialog({ title: 'Cannot delete: record in use', message });
};

/** Install once at startup (src/index.js). */
export const installRecordInUseNotice = () => {
  if (typeof window === 'undefined' || window.__recordInUseNotice) return;
  window.__recordInUseNotice = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 409) {
      try {
        const body = await response.clone().json();
        if (body?.errors?.code === RECORD_IN_USE) showRecordInUse(body.message);
      } catch {
        // not a JSON error body
      }
    }
    return response;
  };

  // The screen that sent the delete usually follows with its own error toast; while the alert is
  // up, skip it (and close that screen's "Deleting…" loading toast instead of leaving it spinning).
  const originalError = toast.error;
  toast.error = (message, options) => {
    if (Date.now() < suppressErrorToastsUntil) {
      if (options?.id) toast.dismiss(options.id);
      return options?.id;
    }
    return originalError(message, options);
  };
};
