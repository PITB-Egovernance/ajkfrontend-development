import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from 'App';
import reportWebVitals from 'reportWebVitals';
import ToastProvider from 'components/ToastProvider';
import { AuthProvider } from 'context/AuthContext';
import { SidebarProvider } from 'context/SidebarContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <SidebarProvider>
          <App />
        </SidebarProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);

reportWebVitals();
