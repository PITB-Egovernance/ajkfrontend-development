import React from 'react';
import { useNavigate } from 'react-router-dom';

// Reusable breadcrumb + title header for Reporting & Analytics pages.
// breadcrumbs: [{ label, path? }] — the last entry (no path) renders as plain text.
const ReportPageHeader = ({ icon: Icon, title, subtitle, breadcrumbs = [], actions }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
      <div>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center flex-wrap gap-1 text-xs text-slate-500 mb-2">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-300">/</span>}
                {crumb.path ? (
                  <button
                    type="button"
                    onClick={() => navigate(crumb.path)}
                    className="hover:text-emerald-700 hover:underline"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-slate-700 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Icon size={22} className="text-emerald-700" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
};

export default ReportPageHeader;
