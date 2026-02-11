import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from 'App';
import reportWebVitals from 'reportWebVitals';
<<<<<<< HEAD
import ToastProvider from 'Components/ToastProvider';
=======
import ToastProvider from 'components/ToastProvider';
import { AuthProvider } from 'context/AuthContext';
import { SidebarProvider } from 'context/SidebarContext';
>>>>>>> dev-hussain

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
