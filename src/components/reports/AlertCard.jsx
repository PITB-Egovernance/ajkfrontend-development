import React from 'react';
import { AlertTriangle } from 'lucide-react';

const VARIANTS = {
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', title: 'text-amber-900', text: 'text-amber-700' },
  danger:  { bg: 'bg-rose-50',  border: 'border-rose-200',  icon: 'text-rose-600',  title: 'text-rose-900',  text: 'text-rose-700' },
  info:    { bg: 'bg-blue-50',  border: 'border-blue-200',  icon: 'text-blue-600',  title: 'text-blue-900',  text: 'text-blue-700' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', title: 'text-emerald-900', text: 'text-emerald-700' },
};

// Reusable inline alert/warning banner for report pages — e.g. surfacing
// import discrepancies that need review before a batch is finalized.
const AlertCard = ({ variant = 'warning', icon: Icon = AlertTriangle, title, description, children }) => {
  const theme = VARIANTS[variant] || VARIANTS.warning;
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${theme.border} ${theme.bg} p-4 mb-6`}>
      <Icon size={20} className={`flex-shrink-0 mt-0.5 ${theme.icon}`} />
      <div className="flex-1">
        {title && <h3 className={`text-sm font-semibold ${theme.title}`}>{title}</h3>}
        {description && <p className={`text-sm mt-0.5 ${theme.text}`}>{description}</p>}
        {children}
      </div>
    </div>
  );
};

export default AlertCard;
