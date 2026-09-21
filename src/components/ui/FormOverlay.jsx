import React, { useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { FullPageFormContext } from 'context/FullPageFormContext';
import { FULL_PAGE_FIELD_THRESHOLD } from 'components/ui/FormDialog';

/**
 * Same "more than 3 fields = full page, otherwise popup" rule as FormDialog, for the
 * hand-built (non-MUI) add/edit forms. Pass the form itself as children — this component
 * supplies either the popup chrome (backdrop + animated card) or the full-page frame.
 *
 *   <FormOverlay open={showModal} onClose={() => setShowModal(false)} fieldCount={5} cardClassName="max-w-2xl">
 *     <form onSubmit={handleSubmit}>...</form>
 *   </FormOverlay>
 */
export default function FormOverlay({
  open,
  onClose,
  fieldCount = 0,
  cardClassName = 'max-w-2xl',
  backLabel = 'Back to list',
  children,
}) {
  const { slot, setActive } = useContext(FullPageFormContext);
  const fullPage = fieldCount > FULL_PAGE_FIELD_THRESHOLD && Boolean(slot);

  useEffect(() => {
    if (!open || !fullPage) return undefined;
    setActive(true);
    window.scrollTo({ top: 0 });
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      setActive(false);
    };
  }, [open, fullPage, setActive, onClose]);

  if (fullPage) {
    if (!open) return null;
    return createPortal(
      <div className="form-fill-width">
        <button
          type="button"
          onClick={() => onClose?.()}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> {backLabel}
        </button>
        <div className="form-fill-width overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {children}
        </div>
      </div>,
      slot
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => onClose?.()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-xl shadow-2xl ${cardClassName} w-full max-h-[90vh] overflow-y-auto scrollbar-hide`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
