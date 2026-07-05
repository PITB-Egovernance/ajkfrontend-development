import React, { createContext, useContext, useState, useCallback } from 'react';

// Blocks sidebar navigation while a long-running, queue-backed process (e.g.
// roll number slip generation) is in progress, so an admin can't wander off
// mid-job and lose track of it.
export const GenerationGuardContext = createContext(null);

export const GenerationGuardProvider = ({ children }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');

  const setBusy = useCallback((busy, message = 'Please wait for the current process to finish before navigating away.') => {
    setIsBusy(busy);
    setBusyMessage(busy ? message : '');
  }, []);

  const value = { isBusy, busyMessage, setBusy };

  return (
    <GenerationGuardContext.Provider value={value}>
      {children}
    </GenerationGuardContext.Provider>
  );
};

export const useGenerationGuard = () => {
  const context = useContext(GenerationGuardContext);

  if (!context) {
    throw new Error('useGenerationGuard must be used within a GenerationGuardProvider');
  }

  return context;
};

export default GenerationGuardContext;
