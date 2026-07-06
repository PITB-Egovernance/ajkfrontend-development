import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import Button from 'components/ui/Button';
import SearchableSelect from 'components/ui/SearchableSelect';
import {
  Info,
  X,
  FileSpreadsheet,
  AlertCircle,
  Sparkles
} from 'lucide-react';

/**
 * Fuzzy Matching Engine
 * Compares system subject names against CSV headers to suggest the best column.
 */
const findBestMatch = (fieldName, csvHeaders) => {
  if (!fieldName || !csvHeaders || !Array.isArray(csvHeaders)) return '';

  const cleanField = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Exact match (case insensitive)
  const exact = csvHeaders.find(h => h.toLowerCase() === fieldName.toLowerCase());
  if (exact) return exact;

  // 2. Cleaned exact match
  const cleanedMatch = csvHeaders.find(h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanField);
  if (cleanedMatch) return cleanedMatch;

  // 3. Substring match
  const substringMatch = csvHeaders.find(h => {
    const cleanHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanHeader.includes(cleanField) || cleanField.includes(cleanHeader);
  });
  if (substringMatch) return substringMatch;

  // 4. Common aliases & abbreviations
  const aliasesMap = {
    'roll_number': ['roll no', 'roll_no', 'rollnumber', 'roll', 'rl_no', 'rl no'],
    'application_id': ['app id', 'app_id', 'applicationid', 'application', 'app_no', 'app no'],
    'english': ['eng', 'engl', 'english marks'],
    'mathematics': ['math', 'maths', 'mth'],
    'pakistan affairs': ['pak affairs', 'pak', 'pak_affairs', 'pa', 'pak studies'],
    'islamic studies': ['islamiat', 'isl', 'islamic_studies', 'is', 'islamic'],
    'general knowledge': ['gk', 'general_knowledge', 'gen knowledge', 'general knowledge']
  };

  for (const [key, aliases] of Object.entries(aliasesMap)) {
    if (cleanField === key || key.includes(cleanField)) {
      const matchedAlias = csvHeaders.find(h => {
        const cleanHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return aliases.some(alias => cleanHeader === alias || cleanHeader.includes(alias));
      });
      if (matchedAlias) return matchedAlias;
    }
  }

  return '';
};

const ColumnMapperModal = ({
  isOpen,
  onClose,
  csvHeaders = [],
  subjects = [],
  tempFileId,
  onConfirm
}) => {
  const [mappings, setMappings] = useState({
    identifier_type: 'roll_number', // Default candidate key identifier
    identifier_column: '',
    subject_mappings: {}
  });

  const [validationError, setValidationError] = useState('');
  const [sparkleActive, setSparkleActive] = useState(false);

  // Trigger Fuzzy Match Auto-suggestions on open or header load
  useEffect(() => {
    if (isOpen && csvHeaders.length > 0) {
      setValidationError('');

      // Auto-suggest Core Identifier (Roll Number)
      const rollMatch = findBestMatch('roll_number', csvHeaders);

      // Auto-suggest subjects
      const initialSubjectMappings = {};
      if (subjects.length === 0) {
        // MCQ case: Find the total marks column
        const marksCols = csvHeaders.filter(h => {
          const lh = h.toLowerCase();
          return !lh.includes('attendance') && !lh.includes('roll') && !lh.includes('name') && !lh.includes('cnic') && !lh.includes('application') && !lh.includes('id');
        });
        marksCols.forEach(col => {
          initialSubjectMappings[col] = col;
        });
      } else {
        // Written case: Auto-suggest subjects
        subjects.forEach(subject => {
          initialSubjectMappings[subject.subject_name] = findBestMatch(subject.subject_name, csvHeaders);
        });
      }

      setMappings({
        identifier_type: 'roll_number',
        identifier_column: rollMatch,
        subject_mappings: initialSubjectMappings
      });

      // Micro-animation for "Magic Match" feedback
      setSparkleActive(true);
      const timer = setTimeout(() => setSparkleActive(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, csvHeaders, subjects]);

  const handleIdentifierTypeChange = (type) => {
    const suggestedCol = findBestMatch(type, csvHeaders);
    setMappings(prev => ({
      ...prev,
      identifier_type: type,
      identifier_column: suggestedCol
    }));
  };

  const handleIdentifierColumnChange = (column) => {
    setMappings(prev => ({ ...prev, identifier_column: column }));
  };

  const handleSubjectMappingChange = (subjectName, column) => {
    setMappings(prev => ({
      ...prev,
      subject_mappings: {
        ...prev.subject_mappings,
        [subjectName]: column
      }
    }));
  };

  const handleDynamicSubjectToggle = (columnName) => {
    setMappings(prev => {
      const nextSubjectMappings = { ...prev.subject_mappings };
      if (nextSubjectMappings[columnName]) {
        delete nextSubjectMappings[columnName];
      } else {
        nextSubjectMappings[columnName] = columnName;
      }
      return {
        ...prev,
        subject_mappings: nextSubjectMappings
      };
    });
  };

  const handleConfirm = () => {
    // Validation
    if (!mappings.identifier_column) {
      setValidationError('Please map the Candidate Identifier column.');
      return;
    }

    const mappedSubjectValues = Object.values(mappings.subject_mappings).filter(Boolean);
    if (mappedSubjectValues.length === 0) {
      setValidationError('Please map at least one subject column to import marks.');
      return;
    }

    // Check for duplicate column mapping
    const allMappedColumns = [mappings.identifier_column, ...mappedSubjectValues];
    const uniqueMappedColumns = new Set(allMappedColumns);
    if (uniqueMappedColumns.size < allMappedColumns.length) {
      setValidationError('Error: You cannot map the same CSV column to multiple fields.');
      return;
    }

    setValidationError('');
    onConfirm({
      temp_file_id: tempFileId,
      mappings: {
        identifier_type: mappings.identifier_type,
        identifier_column: mappings.identifier_column,
        subjects: mappings.subject_mappings
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: '12px',
          padding: '4px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Map CSV Columns</h2>
            <p className="text-xs text-slate-500 mt-1">Flexible Column Ingestion</p>
          </div>
        </div>
        <IconButton onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent className="py-6 space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Validation Errors */}
        {validationError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="shrink-0" size={16} />
            <p className="text-xs font-semibold">{validationError}</p>
          </div>
        )}

        {/* Section 1: Candidate Identification */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            1. Candidate Identification
            <Tooltip title="We require a core unique field to search and map student files.">
              <Info size={14} className="text-slate-400 cursor-pointer" />
            </Tooltip>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-200">
            <SearchableSelect
              label="Identifier Key Type"
              value={mappings.identifier_type}
              onChange={(e) => handleIdentifierTypeChange(e.target.value)}
              options={[
                { value: 'roll_number', label: 'Roll Number' },
                { value: 'application_id', label: 'Application ID' },
              ]}
            />

            <SearchableSelect
              label="CSV Column Match"
              value={mappings.identifier_column}
              onChange={(e) => handleIdentifierColumnChange(e.target.value)}
              options={[
                { value: '', label: '-- Select Column --' },
                ...csvHeaders.map((header) => ({ value: header, label: header })),
              ]}
              error={!mappings.identifier_column ? "Please select corresponding CSV column" : undefined}
            />
          </div>
        </div>

        {/* Section 2: Subject Marks Mapping */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            2. Academic Subjects Marks Mapping
            <Tooltip title="Map each job-specific subject to its corresponding column in the uploaded sheet.">
              <Info size={14} className="text-slate-400 cursor-pointer" />
            </Tooltip>
          </h3>

          <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-lg">
            {subjects.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                  Select the columns from your CSV sheet that contain exam subject marks:
                </p>
                {csvHeaders
                  .filter((h) => {
                    const lh = h.toLowerCase();
                    return h !== mappings.identifier_column &&
                      !lh.includes('attendance') &&
                      !lh.includes('roll') &&
                      !lh.includes('name') &&
                      !lh.includes('cnic') &&
                      !lh.includes('application') &&
                      !lh.includes('id');
                  })
                  .map((colName) => {
                    const isChecked = !!mappings.subject_mappings[colName];
                    return (
                      <div
                        key={colName}
                        onClick={() => handleDynamicSubjectToggle(colName)}
                        className={`flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer select-none ${isChecked
                            ? 'border-emerald-500 bg-emerald-50/20 text-emerald-800 shadow-sm'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/30 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }} // handled by click
                            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 pointer-events-none"
                          />
                          <span className="font-semibold text-sm tracking-tight">{colName}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md transition-all ${isChecked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-400'
                          }`}>
                          {isChecked ? 'Subject Active' : 'Skip Column'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              subjects.map((subject) => {
                const mappedVal = mappings.subject_mappings[subject.subject_name] || '';
                return (
                  <div
                    key={subject.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 hover:bg-slate-50/50 rounded-lg border border-slate-200 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{subject.subject_name}</span>
                      <span className="ml-2 text-xs font-medium text-slate-500">(Max Marks: {subject.max_marks})</span>
                    </div>

                    <div className="w-full md:w-80">
                      <SearchableSelect
                        label="Maps to Column"
                        value={mappedVal}
                        onChange={(e) => handleSubjectMappingChange(subject.subject_name, e.target.value)}
                        options={[
                          { value: '', label: '-- Skip / Map Later --' },
                          ...csvHeaders
                            .filter((h) => !h.toLowerCase().includes('attendance'))
                            .map((header) => ({ value: header, label: header })),
                        ]}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>

      {/* Dialog Actions */}
      <DialogActions className="px-6 py-4 border-t border-slate-200 justify-between">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-slate-200 bg-white text-slate-600 font-semibold text-xs px-4 h-9 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 h-9 rounded-lg shadow-none"
        >
          Confirm & Validate
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnMapperModal;
