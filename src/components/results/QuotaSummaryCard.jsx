import React from 'react';
import { Card, CardContent } from 'components/ui/Card';
import { Briefcase, Users, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * QuotaSummaryCard Component
 * Displays summary of available seats vs filled/remaining status for merit management
 * 
 * @param {Object} props
 * @param {number} props.totalSeats
 * @param {number} props.filled
 * @param {number} props.withheld
 * @param {number} props.remaining
 */

const QuotaSummaryCard = ({ totalSeats = 0, filled = 0, withheld = 0, remaining = 0 }) => {
  const stats = [
    { 
      label: 'Total Seats', 
      value: totalSeats, 
      icon: Briefcase, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    },
    { 
      label: 'Recommended', 
      value: filled, 
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
    { 
      label: 'Withheld', 
      value: withheld, 
      icon: AlertCircle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50',
      border: 'border-amber-100'
    },
    { 
      label: 'Remaining', 
      value: remaining, 
      icon: Users, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50',
      border: 'border-indigo-100'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {stats.map((stat, idx) => (
        <Card key={idx} className={`border ${stat.border} shadow-sm hover:shadow-md transition-all duration-300`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                <stat.icon size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1 tabular-nums">
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuotaSummaryCard;
