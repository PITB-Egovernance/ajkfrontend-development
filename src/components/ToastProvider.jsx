import React from 'react';
import { Toaster } from 'react-hot-toast';

const ToastProvider = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          // Cap every toast type at 3 seconds — react-hot-toast defaults
          // success/blank to 3000ms but loading to Infinity, so we
          // override that explicitly below.
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '10px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          },
          success: {
            duration: 3000,
            style: { border: '2px solid #10b981' },
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            duration: 3000,
            style: { border: '2px solid #ef4444' },
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
          loading: {
            duration: 3000,
            style: { border: '2px solid #6366f1' },
          },
        }}
      />
    </>
  );
};

export default ToastProvider;
