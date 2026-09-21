import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Imperative information / warning / error modal — same mount-on-demand pattern as
 * confirmStatus. Use it when a toast is too small to explain *why* something was
 * refused (locked records, capacity limits, dates not reached yet ...).
 *
 *   await showNotice({
 *     tone: 'warning',                       // 'warning' | 'error' | 'info'
 *     title: 'Cannot delete advertisement',
 *     message: 'Candidates have already applied ...',
 *     details: [{ label: 'Applications', value: 12 }],   // optional key/value rows
 *   });
 *
 * confirmNotice() is the two-button variant; it resolves true when confirmed.
 */

const TONES = {
  warning: { ring: 'bg-amber-100', icon: 'text-amber-500', btn: 'bg-amber-500 hover:bg-amber-600',
    path: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
  error: { ring: 'bg-red-100', icon: 'text-red-500', btn: 'bg-red-500 hover:bg-red-600',
    path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  info: { ring: 'bg-sky-100', icon: 'text-sky-500', btn: 'bg-sky-500 hover:bg-sky-600',
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
};

const NoticeDialog = ({ tone = 'warning', title, message, details, confirmLabel, cancelLabel, onConfirm, onCancel }) => {
  const t = TONES[tone] || TONES.warning;
  const rows = (details || []).filter((d) => d && d.value !== undefined && d.value !== null && d.value !== '');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${t.ring}`}>
          <svg className={`w-8 h-8 ${t.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={t.path} />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
        {message && <p className="text-sm text-gray-600 mb-4 whitespace-pre-line break-words">{message}</p>}

        {rows.length > 0 && (
          <dl className="w-full mb-5 rounded-xl border border-gray-200 bg-gray-50 text-left text-sm divide-y divide-gray-200">
            {rows.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-4 px-4 py-2">
                <dt className="text-gray-500">{d.label}</dt>
                <dd className="font-semibold text-gray-800 break-words text-right">{String(d.value)}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex gap-3 w-full">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            onClick={onConfirm}
            autoFocus
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${t.btn}`}
          >
            {confirmLabel || (onCancel ? 'Continue' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
};

const mount = (props, withCancel) =>
  new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = (result) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(result);
    };

    root.render(
      <NoticeDialog
        {...props}
        onConfirm={() => cleanup(true)}
        onCancel={withCancel ? () => cleanup(false) : undefined}
      />
    );
  });

export const showNotice = (props) => mount(props, false);
export const confirmNotice = (props) => mount(props, true);

export default showNotice;
