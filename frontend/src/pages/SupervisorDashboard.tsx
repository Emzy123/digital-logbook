import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/supervisors/assigned-students');
      setAssignments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
           {user?.role === 'industry_supervisor' ? 'Industry Supervisor Dashboard' : 
            user?.role === 'school_supervisor' ? 'School Supervisor Dashboard' : 
            'Supervisor Dashboard'}
         </h1>
       </div>

       <div>
         <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">Assigned Students</h2>
         <div className="bg-white shadow-sm overflow-hidden rounded-xl border border-gray-200">
           {loading ? (
             <div className="p-12 text-center text-gray-500 font-medium">Loading assignments...</div>
           ) : assignments.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center">
                 <p className="text-gray-600 font-medium text-lg">No students assigned</p>
                 <p className="text-gray-500 mt-1">You currently have no students assigned for supervision.</p>
             </div>
           ) : (
             <ul className="divide-y divide-gray-200">
               {assignments.map((assignment: any) => {
                 const student = assignment.student_id?.user_id;
                 if(!student) return null;
                 return (
                   <li key={assignment._id} className="p-6 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                     <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-bold text-lg shadow-inner">
                           {student.first_name[0]}{student.last_name[0]}
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{student.first_name} {student.last_name}</h3>
                            <p className="text-sm text-gray-500 font-medium">{student.email}</p>
                            {assignment.student_id?.establishment_id ? (
                              <p className="text-xs text-primary-600 font-semibold mt-0.5 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                {assignment.student_id.establishment_id.name}
                                {assignment.student_id.establishment_id.city && ` · ${assignment.student_id.establishment_id.city}`}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-500 mt-0.5 italic">No establishment selected</p>
                            )}
                        </div>
                     </div>
                     <div className="flex flex-col gap-3 items-end">
                        <Link to={`/supervisors/students/${assignment.student_id._id}/logs`} className="px-5 py-2 border border-primary-600 text-primary-700 hover:bg-primary-50 hover:text-primary-800 rounded-lg transition-all font-semibold shadow-sm inline-flex items-center gap-2 text-sm text-center">
                            Review Weekly Summaries <span aria-hidden="true">&rarr;</span>
                        </Link>
                        {user?.role === 'industry_supervisor' && (
                          <Link to={`/supervisors/students/${assignment.student_id._id}/assessment`} className="px-5 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-all font-semibold shadow-sm inline-flex items-center gap-2 text-sm text-center">
                              Complete ITF Form 8C <span aria-hidden="true">&rarr;</span>
                          </Link>
                        )}
                        {user?.role === 'school_supervisor' && (
                          <Link to={`/supervisors/students/${assignment.student_id._id}/grading`} className="px-5 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-all font-semibold shadow-sm inline-flex items-center gap-2 text-sm text-center">
                              Complete ITF Form 8B <span aria-hidden="true">&rarr;</span>
                          </Link>
                        )}
                     </div>
                   </li>
                 )
               })}
             </ul>
           )}
         </div>
       </div>
    </div>
  );
}
