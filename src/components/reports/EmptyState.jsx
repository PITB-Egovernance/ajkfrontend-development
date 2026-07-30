import React from 'react';
import { Inbox } from 'lucide-react';

// Reusable "no data" placeholder for report tables.
const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'Try adjusting your filters or search criteria.',
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="p-4 bg-slate-100 rounded-full mb-4">
      <Icon size={32} className="text-slate-400" />
    </div>
    <h3 className="text-base font-semibold text-slate-700">{title}</h3>
    <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>
  </div>
);

export default EmptyState;
