import React from 'react';
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';

/**
 * CSVPreviewTable Component
 * Shows a limited preview of CSV data with validation status from backend dry-run
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of row objects { status, data, error }
 */

const CSVPreviewTable = ({ data }) => {
  if (!data || !data.length) return null;

  const PREVIEW_LIMIT = 100;
  const visibleRows = data.slice(0, PREVIEW_LIMIT);
  const totalRows = data.length;
  const hasMore = totalRows > PREVIEW_LIMIT;

  // Extract keys from the first row's data object to build headers
  const firstRowData = data[0].data || data[0];
  const headers = Object.keys(firstRowData);

  return (
    <div className="w-full overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <FileText size={16} className="text-emerald-600" />
          Dry Run Preview
        </h4>
        <div className="flex items-center gap-3">
          {hasMore && (
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
              Performance Limit Active
            </span>
          )}
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            Showing {visibleRows.length} of {totalRows} records
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Validation</th>
              {headers.map(header => (
                <th key={header} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const rowStatus = row.status || 'valid';
              const rowData = row.data || row;
              const rowError = row.error || null;

              return (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {rowStatus === 'valid' ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                        <CheckCircle2 size={12} /> Ready
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] uppercase bg-red-50 px-2 py-0.5 rounded-full w-fit">
                          <AlertCircle size={12} /> Error
                        </div>
                        {rowError && <span className="text-[10px] text-red-500 font-medium leading-tight max-w-[150px] break-words">{rowError}</span>}
                      </div>
                    )}
                  </td>
                  {headers.map(header => (
                    <td key={header} className="px-6 py-4 text-sm text-slate-700 font-medium group-hover:text-slate-950 transition-colors">
                      {rowData[header] !== null && rowData[header] !== undefined ? String(rowData[header]) : '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500 font-medium italic">
          If any rows show "Error", please correct your CSV and re-upload before committing.
        </p>
      </div>
    </div>
  );
};


export default CSVPreviewTable;
