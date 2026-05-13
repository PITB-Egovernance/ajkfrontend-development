import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import toast from 'react-hot-toast';

/**
 * DegreeGroupSelector Component
 * 
 * Displays degrees grouped by degree_group with expandable sections.
 * Each group shows all related degrees as checkboxes.
 * All checkboxes are pre-selected by default.
 * Selected degrees are stored as comma-separated values (e.g., "BSCS,BSSE,BSIT")
 */
const DegreeGroupSelector = ({ value = '', onChange, required = false, label = 'Eligible Degrees' }) => {
  const [degreeGroups, setDegreeGroups] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedDegrees, setSelectedDegrees] = useState({});
  const [loading, setLoading] = useState(true);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  // Parse comma-separated degree values into a set for easy lookup
  useEffect(() => {
    if (value && typeof value === 'string') {
      const degrees = value.split(',').map(d => d.trim()).filter(d => d);
      const degreeSet = {};
      degrees.forEach(d => {
        degreeSet[d] = true;
      });
      setSelectedDegrees(degreeSet);
    } else {
      setSelectedDegrees({});
    }
  }, [value]);

  // Fetch degrees and group them by degree_group
  useEffect(() => {
    fetchDegrees();
  }, []);

  const fetchDegrees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/degrees?per_page=1000`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();

      if (result.success || result.status === 200) {
        const degrees = Array.isArray(result.data?.data) ? result.data.data : result.data || [];
        
        // Group degrees by degree_group
        const grouped = {};
        degrees.forEach(degree => {
          const groupName = degree.degree_group || 'Other';
          if (!grouped[groupName]) {
            grouped[groupName] = [];
          }
          grouped[groupName].push({
            id: degree.hash_id || degree.id,
            name: degree.degree_name || degree.name,
            code: degree.degree_code || degree.name,
          });
        });

        setDegreeGroups(grouped);

        // Initialize expanded groups and pre-select all degrees
        const allGroupsExpanded = {};
        const allSelected = {};
        Object.keys(grouped).forEach(groupName => {
          allGroupsExpanded[groupName] = false;
          grouped[groupName].forEach(degree => {
            allSelected[degree.code] = true; // Pre-select all
          });
        });

        setExpandedGroups(allGroupsExpanded);
        setSelectedDegrees(allSelected);

        // Notify parent of all selected degrees
        const allDegreesCodes = Object.keys(allSelected);
        onChange?.(allDegreesCodes.join(','));
      } else {
        toast.error(result.message || 'Failed to load degrees');
      }
    } catch (error) {
      console.error('Error fetching degrees:', error);
      toast.error('Failed to load degrees');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const toggleDegree = (degreeCode) => {
    const updatedSelection = { ...selectedDegrees };
    updatedSelection[degreeCode] = !updatedSelection[degreeCode];
    setSelectedDegrees(updatedSelection);

    // Convert to comma-separated format and notify parent
    const selectedCodes = Object.keys(updatedSelection)
      .filter(code => updatedSelection[code])
      .sort()
      .join(',');
    
    onChange?.(selectedCodes);
  };

  const selectAllInGroup = (groupName) => {
    const group = degreeGroups[groupName] || [];
    const updatedSelection = { ...selectedDegrees };

    // Check if all degrees in this group are already selected
    const allSelected = group.every(degree => updatedSelection[degree.code]);

    // Toggle all degrees in this group
    group.forEach(degree => {
      updatedSelection[degree.code] = !allSelected;
    });

    setSelectedDegrees(updatedSelection);

    // Notify parent
    const selectedCodes = Object.keys(updatedSelection)
      .filter(code => updatedSelection[code])
      .sort()
      .join(',');
    
    onChange?.(selectedCodes);
  };

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
          <span className="text-sm text-slate-600">Loading degrees...</span>
        </div>
      </div>
    );
  }

  const groupNames = Object.keys(degreeGroups).sort();

  if (groupNames.length === 0) {
    return (
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-700">No degrees available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>

      <div className="space-y-2 border border-slate-200 rounded-lg bg-white p-4">
        {groupNames.map(groupName => {
          const group = degreeGroups[groupName] || [];
          const isExpanded = expandedGroups[groupName];
          const groupAllSelected = group.every(degree => selectedDegrees[degree.code]);

          return (
            <div key={groupName} className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Group Header - Expandable */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50 to-slate-50 hover:from-emerald-100 hover:to-slate-100 cursor-pointer transition-colors"
                onClick={() => toggleGroup(groupName)}
              >
                <div className="flex items-center gap-3 flex-1">
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-emerald-700 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={18} className="text-slate-600 flex-shrink-0" />
                  )}
                  <span className="font-medium text-slate-800">{groupName}</span>
                  <span className="text-sm text-slate-500">({group.length})</span>
                </div>

                {/* Select All Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInGroup(groupName);
                  }}
                  className="flex items-center gap-2 ml-2"
                  title={groupAllSelected ? 'Unselect all in this group' : 'Select all in this group'}
                >
                  {groupAllSelected ? (
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  ) : (
                    <Circle size={20} className="text-slate-400" />
                  )}
                </button>
              </div>

              {/* Group Content - Degrees */}
              {isExpanded && (
                <div className="px-4 py-3 bg-slate-50 space-y-2 border-t border-slate-200">
                  {group.map(degree => (
                    <label
                      key={degree.code}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors group/item"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDegrees[degree.code] || false}
                        onChange={() => toggleDegree(degree.code)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-700">
                          {degree.name}
                        </div>
                        {degree.code && degree.code !== degree.name && (
                          <div className="text-xs text-slate-500">
                            Code: {degree.code}
                          </div>
                        )}
                      </div>
                      {selectedDegrees[degree.code] && (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary of Selected Degrees */}
      {Object.keys(selectedDegrees).filter(code => selectedDegrees[code]).length > 0 && (
        <div className="text-sm text-slate-600">
          <span className="font-medium">
            {Object.keys(selectedDegrees).filter(code => selectedDegrees[code]).length}
          </span>
          {' '}degree(s) selected: {Object.keys(selectedDegrees).filter(code => selectedDegrees[code]).join(', ')}
        </div>
      )}
    </div>
  );
};

export default DegreeGroupSelector;
