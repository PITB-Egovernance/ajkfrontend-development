import React from 'react';

// Reusable skeleton placeholders shown while report data is (simulated to be) loading.
export const StatCardsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse">
        <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
        <div className="h-7 w-16 bg-slate-200 rounded" />
      </div>
    ))}
  </div>
);

const LoadingSkeleton = ({ rows = 6 }) => (
  <div className="rounded-lg overflow-hidden">
    <div className="h-11 bg-slate-100 animate-pulse rounded-t-lg" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 border-t border-slate-100 flex items-center px-4 gap-4 animate-pulse">
        <div className="h-3 bg-slate-200 rounded" style={{ width: `${60 - (i % 4) * 8}%` }} />
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
