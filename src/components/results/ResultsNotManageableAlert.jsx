import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Why a post's results can't be managed (downloaded / imported) yet — see useResultsManageStatus.
const ResultsNotManageableAlert = ({ message, title = "Results can't be managed yet", className = '' }) => {
  if (!message) return null;

  return (
    <div role="alert" className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}>
      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5">{message}</p>
      </div>
    </div>
  );
};

export default ResultsNotManageableAlert;
