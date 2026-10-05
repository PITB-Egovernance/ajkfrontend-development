import { createRoot } from 'react-dom/client';

// Blocking message dialog with a single OK button, styled like confirmStatus / ConfirmDelete.
const AlertDialog = ({ title, message, onClose }) => (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-message"
  >
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-100">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>

      <h2 id="alert-dialog-title" className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      <p id="alert-dialog-message" className="text-sm text-gray-600 mb-6">{message}</p>

      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors"
      >
        OK
      </button>
    </div>
  </div>
);

/** Show a blocking message; resolves when the user clicks OK. */
const alertDialog = ({ title, message }) =>
  new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const close = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve();
    };

    root.render(<AlertDialog title={title} message={message} onClose={close} />);
  });

export default alertDialog;
