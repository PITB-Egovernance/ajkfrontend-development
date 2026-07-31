import React from 'react';

// Reusable Pass/Fail pill used across marksheet and statistics tables.
const PassFailBadge = ({ value }) => {
  const isPass = String(value).trim().toLowerCase() === 'pass';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
    >
      {isPass ? 'Pass' : 'Fail'}
    </span>
  );
};

export default PassFailBadge;
