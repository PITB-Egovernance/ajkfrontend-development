import React, { useEffect, useRef } from 'react';
import { Toaster, useToasterStore, toast } from 'react-hot-toast';

// Only the most recent alert stays on screen — without this, clicking a
// failing action (e.g. retry/submit) repeatedly stacks an unbounded number
// of toasts instead of replacing the previous one.
const TOAST_LIMIT = 1;

// Class applied to react-hot-toast's own positioning wrapper (via
// containerClassName below) — used to tell "click landed on a toast" apart
// from "click landed elsewhere on the page".
const TOAST_CONTAINER_CLASS = 'ajk-toast-container';

const ToastProvider = ({ children }) => {
  const { toasts } = useToasterStore();
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  // Cap the number of simultaneously visible toasts. Interactive
  // confirmation toasts (duration: Infinity — e.g. "Confirm Rejection")
  // are left alone since they require an explicit choice, not a timeout.
  useEffect(() => {
    toasts
      .filter((t) => t.visible && t.duration !== Infinity)
      .slice(TOAST_LIMIT)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  // A click anywhere on the page dismisses any visible alert early — EXCEPT
  // a click on the alert itself, so its text can be selected/copied instead
  // of the toast vanishing under the cursor. Interactive confirmation toasts
  // are excluded from auto-dismiss entirely for the same reason as above.
  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.closest(`.${TOAST_CONTAINER_CLASS}`)) return;
      toastsRef.current.forEach((t) => {
        if (t.visible && t.duration !== Infinity) {
          toast.dismiss(t.id);
        }
      });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        containerClassName={TOAST_CONTAINER_CLASS}
        toastOptions={{
          // Cap every toast type at 5 seconds — react-hot-toast defaults
          // success/blank to 3000ms but loading to Infinity, so we
          // override that explicitly below.
          duration: 5000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '10px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          },
          success: {
            duration: 5000,
            style: { border: '2px solid #10b981' },
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            duration: 5000,
            style: { border: '2px solid #ef4444' },
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
          loading: {
            duration: 5000,
            style: { border: '2px solid #6366f1' },
          },
        }}
      />
    </>
  );
};

export default ToastProvider;
