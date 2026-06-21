import React from 'react';
import { createRoot } from 'react-dom/client';

const ConfirmStatusDialog = ({ newStatus, onConfirm, onCancel }) => {
  const isActivating = newStatus === 'active';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isActivating ? 'bg-emerald-100' : 'bg-orange-100'
          }`}
        >
          <svg
            className={`w-8 h-8 ${isActivating ? 'text-emerald-500' : 'text-orange-500'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={
                isActivating
                  ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  : 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'
              }
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {isActivating ? 'Activate Record?' : 'Deactivate Record?'}
        </h2>

        {/* Message */}
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to mark this as{' '}
          <span className={`font-semibold ${isActivating ? 'text-emerald-600' : 'text-orange-600'}`}>
            {newStatus}
          </span>
          ?
        </p>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
              isActivating
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            Yes, {isActivating ? 'Activate' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};

const confirmStatus = ({ newStatus }) => {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = (result) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(result);
    };

    root.render(
      <ConfirmStatusDialog
        newStatus={newStatus}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />
    );
  });
};

export default confirmStatus;
