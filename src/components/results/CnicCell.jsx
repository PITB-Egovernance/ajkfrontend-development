import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from 'context/AuthContext';
import { getUserRole } from 'utils/roleUtils';
import ResultsApi from 'api/resultsApi';
import toast from 'react-hot-toast';

/**
 * CnicCell Component
 * Displays masked CNIC with a reveal toggle for authorized roles
 * 
 * @param {Object} props
 * @param {string|number} props.resultId - The ID of the result record
 * @param {string} props.maskedCnic - The initially masked CNIC string
 */

const CnicCell = ({ resultId, maskedCnic }) => {
  const [cnic, setCnic] = useState(maskedCnic);
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const userRole = getUserRole(user);

  // Restricted roles that can reveal the full CNIC
  const canReveal = ['admin', 'director'].includes(userRole);

  const handleToggleReveal = async () => {
    if (isRevealed) {
      // Hide full CNIC and return to masked version
      setCnic(maskedCnic);
      setIsRevealed(false);
      return;
    }

    // Prompt for reason (requirement for audit log on backend)
    const reason = window.prompt('Please provide a reason for unmasking this CNIC:');
    if (!reason || !reason.trim()) {
      if (reason !== null) toast.error('Reason is required for unmasking');
      return;
    }

    setLoading(true);
    try {
      const response = await ResultsApi.unmaskCnic(resultId, reason);
      const fullCnic = response.data?.cnic || response.cnic;
      
      if (fullCnic) {
        setCnic(fullCnic);
        setIsRevealed(true);
        toast.success('CNIC revealed (Audit logged)');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to reveal CNIC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 group">
      <span className={`font-mono text-sm tracking-tight ${isRevealed ? 'text-emerald-700 font-semibold' : 'text-slate-600'}`}>
        {cnic}
      </span>
      {canReveal && (
        <button
          onClick={handleToggleReveal}
          disabled={loading}
          className={`p-1 rounded-md transition-all duration-200 ${
            isRevealed 
              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
              : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-600'
          }`}
          title={isRevealed ? "Hide full CNIC" : "Reveal full CNIC (Requires reason)"}
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            isRevealed ? <EyeOff size={14} /> : <Eye size={14} />
          )}
        </button>
      )}
    </div>
  );
};

export default CnicCell;
