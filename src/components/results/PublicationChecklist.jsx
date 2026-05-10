import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/Card';
import { CheckCircle2, XCircle, AlertCircle, ClipboardCheck, Info } from 'lucide-react';

/**
 * PublicationChecklist Component
 * Validates result readiness before final publication
 * 
 * @param {Object} props
 * @param {Array} props.checks - Array of check objects { label, passed, error }
 */

const PublicationChecklist = ({ checks = [] }) => {
  const allPassed = checks.length > 0 && checks.every(c => c.passed);

  return (
    <Card className={`border transition-all duration-500 ${
      allPassed 
        ? 'border-emerald-200 bg-emerald-50/30' 
        : 'border-amber-200 bg-amber-50/30'
    }`}>
      <CardHeader className="pb-3 border-b border-white/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-black flex items-center gap-2.5 tracking-tight">
            <div className={`p-2 rounded-lg ${allPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              <ClipboardCheck size={20} strokeWidth={2.5} />
            </div>
            Pre-Publication Checklist
          </CardTitle>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            allPassed ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-amber-500 text-white'
          }`}>
            {allPassed ? 'Ready to Publish' : 'Needs Attention'}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {checks.map((check, idx) => (
            <div 
              key={idx} 
              className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                check.passed ? 'bg-white/40' : 'bg-white shadow-sm ring-1 ring-red-100'
              }`}
            >
              <div className="mt-0.5">
                {check.passed ? (
                  <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={3} />
                ) : (
                  <XCircle size={18} className="text-red-500" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold leading-tight ${check.passed ? 'text-slate-600' : 'text-slate-900'}`}>
                  {check.label}
                </p>
                {!check.passed && check.error && (
                  <p className="text-[11px] text-red-500 font-bold mt-1 bg-red-50 px-2 py-0.5 rounded inline-block">
                    {check.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {!allPassed && (
          <div className="mt-4 p-4 bg-white/80 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-sm">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
              <Info size={16} strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] text-amber-900 font-black uppercase tracking-widest leading-normal">
                Mandatory Action Required
              </p>
              <p className="text-xs text-amber-800 font-semibold mt-0.5">
                One or more critical checks have failed. Review the errors above. The "Publish" button will remain disabled until all items are resolved.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PublicationChecklist;
