import React, { useState, useMemo } from 'react';
import { RotateCw, X, ArrowRight, UserMinus, UserPlus, Info, ChevronDown } from 'lucide-react';
import Button from 'components/ui/Button';

const ReplacementModal = ({ isOpen, outgoing, incoming, allProvisional = [], onClose, onConfirm, loading }) => {
  const [notes, setNotes] = useState('');
  const [selectedIncomingId, setSelectedIncomingId] = useState(incoming?.id);
  const [showManualSelection, setShowManualSelection] = useState(false);

  const selectedIncoming = useMemo(() => {
    return allProvisional.find(a => a.id === selectedIncomingId) || incoming;
  }, [selectedIncomingId, allProvisional, incoming]);

  if (!isOpen || !outgoing || !incoming) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100">
        <div className="p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <RotateCw size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Merit Rotation Preview</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">UC-R07 • Atomic Replacement Chain</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
              <X size={20} />
            </button>
          </div>

          {/* Replacement Logic Comparison */}
          <div className="flex items-center gap-6 mb-8">
            {/* Outgoing */}
            <div className="flex-1 bg-rose-50 border-2 border-rose-100 rounded-3xl p-6 relative">
              <div className="absolute -top-3 -right-3 bg-rose-500 text-white p-2 rounded-xl shadow-lg">
                <UserMinus size={16} />
              </div>
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2 block">Outgoing</span>
              <h4 className="text-base font-black text-rose-900 truncate">{outgoing.application?.candidate_name}</h4>
              <p className="text-xs font-bold text-rose-600 mt-1">Rank #{outgoing.merit_rank}</p>
              <div className="mt-3 px-3 py-1 bg-rose-100/50 rounded-full inline-block text-[9px] font-black text-rose-700 uppercase">
                Status: {outgoing.status}
              </div>
            </div>

            <div className="text-slate-300">
              <ArrowRight size={32} strokeWidth={3} />
            </div>

            {/* Incoming */}
            <div className="flex-1 bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-6 relative">
              <div className="absolute -top-3 -right-3 bg-indigo-500 text-white p-2 rounded-xl shadow-lg">
                <UserPlus size={16} />
              </div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Incoming</span>
              <h4 className="text-base font-black text-indigo-900 truncate">{selectedIncoming?.application?.candidate_name}</h4>
              <p className="text-xs font-bold text-indigo-600 mt-1">Rank #{selectedIncoming?.merit_rank}</p>
              <div className="mt-3 px-3 py-1 bg-indigo-100/50 rounded-full inline-block text-[9px] font-black text-indigo-700 uppercase">
                Promoted to Selection
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Manual Selection Toggle */}
            {allProvisional.length > 1 && (
              <div>
                <button 
                  onClick={() => setShowManualSelection(!showManualSelection)}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-700"
                >
                  {showManualSelection ? 'Use Automatic (Next in Line)' : 'Override with Manual Selection'}
                  <ChevronDown size={14} className={showManualSelection ? 'rotate-180' : ''} />
                </button>
                
                {showManualSelection && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {allProvisional
                      .filter(p => p.id !== outgoing.id && p.merit_rank > outgoing.merit_rank)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedIncomingId(p.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                            selectedIncomingId === p.id 
                              ? 'bg-white border-indigo-500 shadow-md' 
                              : 'bg-white/50 border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-black text-slate-800">{p.application?.candidate_name}</span>
                            <span className="text-[10px] font-bold text-slate-400">Roll: {p.application?.application_number}</span>
                          </div>
                          <span className="text-xs font-black text-indigo-600">Rank #{p.merit_rank}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <Info className="text-blue-600 shrink-0" size={18} />
              <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase tracking-tight">
                This action is irreversible. The outgoing candidate will be marked as "Replaced" and the incoming candidate will be promoted to the merit vacancy.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Rotation Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference meeting minutes or official order for this replacement..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all min-h-[80px]"
              />
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50/80 border-t border-slate-100 flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 h-16 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-white"
          >
            Abort
          </Button>
          <Button 
            onClick={() => onConfirm(outgoing.id, { 
              replacement_award_id: selectedIncomingId !== incoming?.id ? selectedIncomingId : null,
              notes 
            })}
            loading={loading}
            className="flex-[2] h-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 border-none"
          >
            Confirm Merit Rotation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReplacementModal;
