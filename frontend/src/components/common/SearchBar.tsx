import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SearchResult {
  students?: any[];
  logs?: any[];
}

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ students: [], logs: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/search?q=${query}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          setResults(response.data);
          setIsOpen(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults({ students: [], logs: [] });
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
          </svg>
        </div>
        <input
          type="search"
          className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search students, logs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
        />
        {query && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => { setQuery(''); setIsOpen(false); }}
          >
            <span className="text-gray-500 hover:text-gray-700">&times;</span>
          </button>
        )}
      </div>

      {isOpen && (results.students?.length || results.logs?.length) ? (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {results.students && results.students.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Students</h3>
              <ul>
                {results.students.map((student: any) => (
                  <li key={student._id} className="text-sm py-1 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 cursor-pointer">
                    <div className="font-medium">{student.user?.first_name} {student.user?.last_name}</div>
                    <div className="text-xs text-gray-500">{student.matriculation_number}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.logs && results.logs.length > 0 && (
            <div className="p-2 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Logs</h3>
              <ul>
                {results.logs.map((log: any) => (
                  <li key={log._id} className="text-sm py-1 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 cursor-pointer">
                    <div className="font-medium">{log.task_title}</div>
                    <div className="text-xs text-gray-500 truncate">{log.task_description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : isOpen && !loading && query.trim() ? (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
          No results found.
        </div>
      ) : null}
    </div>
  );
};
