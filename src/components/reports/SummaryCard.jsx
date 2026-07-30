import React from 'react';
import { Card, CardContent } from 'components/ui/Card';

const COLOR_THEMES = {
  blue:    { bg: 'from-blue-50 to-blue-100',       border: 'border-blue-200',    text: 'text-blue-700',    value: 'text-blue-900' },
  emerald: { bg: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', value: 'text-emerald-900' },
  amber:   { bg: 'from-amber-50 to-amber-100',     border: 'border-amber-200',   text: 'text-amber-700',   value: 'text-amber-900' },
  violet:  { bg: 'from-violet-50 to-violet-100',   border: 'border-violet-200',  text: 'text-violet-700',  value: 'text-violet-900' },
  rose:    { bg: 'from-rose-50 to-rose-100',       border: 'border-rose-200',    text: 'text-rose-700',    value: 'text-rose-900' },
  slate:   { bg: 'from-slate-50 to-slate-100',     border: 'border-slate-200',   text: 'text-slate-700',   value: 'text-slate-900' },
};

// Reusable dashboard stat card — used across all Reporting & Analytics pages.
const SummaryCard = ({ label, value, icon: Icon, color = 'emerald' }) => {
  const theme = COLOR_THEMES[color] || COLOR_THEMES.emerald;
  return (
    <Card className={`bg-gradient-to-br ${theme.bg} border ${theme.border}`}>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${theme.text}`}>{label}</p>
          <h2 className={`text-3xl font-bold mt-1 ${theme.value}`}>{value}</h2>
        </div>
        {Icon && (
          <div className="p-3 rounded-lg bg-white/70 shadow-sm">
            <Icon size={22} className={theme.text} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
