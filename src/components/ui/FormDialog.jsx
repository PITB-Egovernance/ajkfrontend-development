import React, { useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { FullPageFormContext } from 'context/FullPageFormContext';

/**
 * Add/Edit form container that follows the Admin form rule:
 *
 *   more than 3 fields  -> opens as a full page (replaces the list in the content area)
 *   3 fields or fewer   -> opens as a popup dialog
 *
 * Drop-in replacement for MUI's <Dialog>: same props, same DialogTitle / DialogContent /
 * DialogActions children — just say how many inputs the form has:
 *
 *   <FormDialog open={open} onClose={close} fieldCount={5} maxWidth="sm" fullWidth>
 *     <DialogTitle>Add Company</DialogTitle>
 *     <DialogContent>...five fields...</DialogContent>
 *     <DialogActions>...</DialogActions>
 *   </FormDialog>
 *
 * The full-page form renders through a portal into the layout's content slot, so it lives
 * in the same React tree as the page: state, handlers and validation are untouched, and the
 * list underneath stays mounted (just hidden) — filters and pagination are still there when
 * the admin comes back. Falls back to a popup when no layout slot is available.
 */
export const FULL_PAGE_FIELD_THRESHOLD = 3;

export default function FormDialog({ open, onClose, fieldCount = 0, backLabel = 'Back to list', children, ...dialogProps }) {
  const { slot, setActive } = useContext(FullPageFormContext);
  const fullPage = fieldCount > FULL_PAGE_FIELD_THRESHOLD && Boolean(slot);

  useEffect(() => {
    if (!open || !fullPage) return undefined;
    setActive(true);
    window.scrollTo({ top: 0 });
    return () => setActive(false);
  }, [open, fullPage, setActive]);

  // Escape closes the full-page form, like it closes a popup.
  useEffect(() => {
    if (!open || !fullPage) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(e, 'escapeKeyDown'); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, fullPage, onClose]);

  if (!fullPage) {
    return <Dialog open={open} onClose={onClose} {...dialogProps}>{children}</Dialog>;
  }

  if (!open) return null;

  return createPortal(
    <div className="w-full">
      <button
        type="button"
        onClick={() => onClose?.({}, 'backButtonClick')}
        className="mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={16} /> {backLabel}
      </button>
      <div className="mx-auto w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-sm">
        {children}
      </div>
    </div>,
    slot
  );
}
