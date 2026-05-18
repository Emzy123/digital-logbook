import React from 'react';
import api from '../../services/api';

interface ExportButtonProps {
  entity: 'students' | 'logentries';
  format?: 'csv' | 'xlsx';
  filters?: {
    startDate?: string;
    endDate?: string;
    department?: string;
  };
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  entity,
  format = 'csv',
  filters = {},
  label
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ format, ...filters });
      const response = await api.get(`/export/${entity}?${params.toString()}`, {
        responseType: 'blob',
      });

      const mimeType = format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entity}_export_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. You may not have permission to export this data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleExport()}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-wait shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {loading ? 'Exporting...' : (label || `Export ${entity === 'students' ? 'Students' : 'Log Entries'} (${format.toUpperCase()})`)}
      </button>

      {/* Format toggle */}
      <select
        className="text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
        value={format}
        onChange={(e) => {
          // We re-render with updated format by lifting state if needed
          // For now, this is a controlled UI cue; parent should manage format state
        }}
      >
        <option value="csv">CSV</option>
        <option value="xlsx">Excel</option>
      </select>
    </div>
  );
};
