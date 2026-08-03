import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import './index.css';
import App from 'App';
import reportWebVitals from 'reportWebVitals';
import ToastProvider from 'components/ToastProvider';
import { AuthProvider } from 'context/AuthContext';
import { SidebarProvider } from 'context/SidebarContext';
import { GenerationGuardProvider } from 'context/GenerationGuardContext';

const appTheme = createTheme({
  typography: {
    fontFamily: "'Poppins', sans-serif",
  },
  components: {
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        // height: 40 is the single-line form-control token — forcing it on
        // multiline (textarea) inputs clamps the bordered container while
        // the actual textarea grows to its real height (minRows), so the
        // label's shrink position ends up landing inside the visible text
        // instead of on the border. Only single-line inputs get the fixed
        // height; multiline ones grow naturally.
        root: ({ ownerState }) => ({
          ...(!ownerState.multiline && { height: 40 }),
          borderRadius: 6,
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(148, 163, 184, 0.45)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(15, 23, 42, 0.35)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#047857',
            borderWidth: 1,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: '#dc2626',
          },
        }),
        input: {
          padding: '8px 12px',
          boxSizing: 'border-box',
          fontSize: '1rem',
          lineHeight: 1.25,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          paddingRight: '32px !important',
        },
        icon: {
          right: 10,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          marginTop: 4,
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <ToastProvider>
        <AuthProvider>
          <SidebarProvider>
            <GenerationGuardProvider>
              <App />
            </GenerationGuardProvider>
          </SidebarProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);

reportWebVitals();
