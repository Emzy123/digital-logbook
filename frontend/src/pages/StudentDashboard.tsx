import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';


export default function StudentDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/students/logs?limit=5');
      setLogs(res.data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
         <Link to="/logs/new" className="px-5 py-2.5 bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 transition font-medium">
           + New Entry
         </Link>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <h3 className="text-gray-500 text-sm font-medium uppercase tracking-widest">Total Entries</h3>
           <p className="mt-2 text-4xl font-extrabold text-gray-900">{logs.length}</p>
         </div>
       </div>

       <div>
         <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">Recent Logs</h2>
         <div className="bg-white shadow-sm overflow-hidden rounded-xl border border-gray-200">
           {loading ? (
             <div className="p-12 text-center">
                 <div className="inline-block animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mb-4"></div>
                 <p className="text-gray-500">Loading your logs...</p>
             </div>
           ) : logs.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center">
                 <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 </div>
                 <p className="text-gray-600 font-medium text-lg">No log entries found</p>
                 <p className="text-gray-500 mt-1">Start documenting your daily activities.</p>
                 <Link to="/logs/new" className="mt-6 px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 transition">Create your first entry</Link>
             </div>
           ) : (
             <ul className="divide-y divide-gray-200">
               {logs.map((log: any) => (
                 <li key={log._id} className="p-6 hover:bg-gray-50 transition-colors">
                   <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-lg font-semibold text-gray-900">{log.task_title}</h3>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{log.task_description}</p>
                     </div>
                     <span className={`flex-shrink-0 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full shadow-sm ml-4 ${
                       log.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                       log.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                       'bg-amber-100 text-amber-800 border border-amber-200'
                     }`}>
                       {log.status}
                     </span>
                   </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        {new Date(log.entry_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                        {log.total_hours > 0 && (
                           <>
                              <span className="mx-2">•</span>
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              {log.total_hours} hrs
                           </>
                        )}
                      </div>
                      {(log.status === 'draft' || log.status === 'needs_revision') && (
                        <Link
                          to={`/logs/${log._id}/edit`}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-800 border border-primary-300 rounded-md px-3 py-1 hover:bg-primary-50 transition-colors"
                        >
                          ✏️ Edit
                        </Link>
                      )}
                    </div>
                 </li>
               ))}
             </ul>
           )}
         </div>
       </div>
    </div>
  );
}
