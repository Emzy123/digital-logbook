import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function LogReviewDashboard() {
  const { studentId } = useParams();
  const [logs, setLogs] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [assessmentStatus, setAssessmentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'summaries' | 'visits' | 'assessment'>('summaries');
  const [visitForm, setVisitForm] = useState({ date: '', remarks: '' });
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState<any>({});
  const [submittingAssessment, setSubmittingAssessment] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      const [logsRes, summariesRes, visitsRes, assessmentRes] = await Promise.all([
        api.get(`/supervisors/students/${studentId}/logs`),
        api.get(`/supervisors/students/${studentId}/weekly-summaries`),
        api.get(`/supervisors/students/${studentId}/visits`),
        api.get(`/supervisors/students/${studentId}/assessment-status`)
      ]);
      setLogs(logsRes.data);
      setSummaries(summariesRes.data);
      setVisits(visitsRes.data);
      setAssessmentStatus(assessmentRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSummary = async (summaryId: string, status: string) => {
    setReviewing(summaryId);
    try {
        await api.put(`/supervisors/weekly-summaries/${summaryId}/review`, { status, supervisor_comment: comment });
        fetchData();
        setComment('');
    } catch (e) {
        alert('Error reviewing summary');
    } finally {
        setReviewing(null);
    }
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVisit(true);
    try {
        await api.post(`/supervisors/students/${studentId}/visits`, {
           visit_date: visitForm.date,
           remarks: visitForm.remarks
        });
        setVisitForm({ date: '', remarks: '' });
        fetchData();
    } catch (e) {
        alert('Error logging visit');
    } finally {
        setSubmittingVisit(false);
    }
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentStatus?.assessorType) return;
    setSubmittingAssessment(true);

    const payload: any = { comments: assessmentForm.comments };
    if (assessmentStatus.assessorType === 'industry') {
      payload.itf_8c_scores = {
        attendance: Number(assessmentForm.attendance || 0),
        punctuality: Number(assessmentForm.punctuality || 0),
        initiative: Number(assessmentForm.initiative || 0),
        relationship_with_staff: Number(assessmentForm.relationship_with_staff || 0),
        practical_skills: Number(assessmentForm.practical_skills || 0),
        general_conduct: Number(assessmentForm.general_conduct || 0)
      };
    } else {
      payload.itf_8b_scores = {
        logbook_maintenance: Number(assessmentForm.logbook_maintenance || 0),
        knowledge_of_reports: Number(assessmentForm.knowledge_of_reports || 0),
        student_participation: Number(assessmentForm.student_participation || 0),
        technical_skills_gained: Number(assessmentForm.technical_skills_gained || 0)
      };
    }

    try {
        await api.post(`/supervisors/students/${studentId}/assessment`, payload);
        alert('Assessment submitted successfully!');
        fetchData();
    } catch (e: any) {
        alert(e.response?.data?.message || 'Error submitting assessment');
    } finally {
        setSubmittingAssessment(false);
    }
  };

  const getLogsForSummary = (start: string, end: string) => {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    return logs.filter(l => {
      const logDate = new Date(l.entry_date).getTime();
      return logDate >= startDate && logDate <= endDate;
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
       <div className="flex flex-col gap-2 mb-6">
         <Link to="/supervisor-dashboard" className="text-primary-600 hover:text-primary-800 font-semibold mb-2 inline-flex items-center gap-2 transition-colors">&larr; Back to Students List</Link>
         <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Student Supervision</h1>
         <p className="text-gray-500">Sign off on weekly summaries, log school visits, and complete ITF evaluations.</p>
       </div>

       <div className="flex space-x-4 border-b border-gray-200 mb-6">
         <button onClick={() => setActiveTab('summaries')} className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === 'summaries' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Weekly Sign-Offs</button>
         <button onClick={() => setActiveTab('visits')} className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === 'visits' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Supervisor Visits</button>
         <button onClick={() => setActiveTab('assessment')} className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === 'assessment' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Final Assessment</button>
       </div>

       <div className="bg-white shadow-lg overflow-hidden rounded-2xl border border-gray-200/60">
           {loading ? (
             <div className="p-16 text-center text-gray-500 font-medium animate-pulse">Fetching records...</div>
           ) : activeTab === 'summaries' ? (
             summaries.length === 0 ? (
               <div className="p-16 text-center">
                   <p className="text-gray-900 font-bold text-xl">No weekly summaries pending review</p>
                   <p className="text-gray-500 mt-2">This student has not submitted any weekly summaries yet.</p>
               </div>
             ) : (
               <ul className="divide-y divide-gray-100">
                 {summaries.map((summary: any) => {
                   const weekLogs = getLogsForSummary(summary.start_date, summary.end_date);
                   return (
                     <li key={summary._id} className="p-8 hover:bg-gray-50/50 transition-colors">
                       <div className="flex justify-between items-start mb-5">
                         <div>
                            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Week {summary.week_number} Summary</h3>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-sm text-gray-500 font-medium">From: {new Date(summary.start_date).toDateString()} to {new Date(summary.end_date).toDateString()}</span>
                                <span className={`text-xs font-bold px-2.5 py-1 uppercase tracking-wider rounded-md ${summary.status === 'submitted' ? 'bg-blue-100 text-blue-800' : summary.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {summary.status}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500"><strong>Department:</strong> {summary.department_attached}</p>
                         </div>
                       </div>
                       
                       <div className="bg-white p-5 rounded-xl border border-gray-200/60 mb-5 text-sm text-gray-700 whitespace-pre-wrap shadow-sm">
                          <strong className="block mb-2 font-bold text-gray-800">Student's Summary of the Week:</strong>
                          {summary.summary_text}
                       </div>

                       <div className="mb-6 space-y-3">
                         <details className="group border border-gray-200 rounded-lg bg-gray-50 [&_summary::-webkit-details-marker]:hidden">
                           <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-700 text-sm flex items-center justify-between">
                              View Daily Logs for this Week ({weekLogs.length})
                              <span className="transition group-open:rotate-180">▼</span>
                           </summary>
                           <div className="px-4 pb-4 space-y-4">
                             {weekLogs.length === 0 ? (
                               <p className="text-sm text-gray-500">No daily logs found for this week's date range.</p>
                             ) : weekLogs.map((l: any) => (
                               <div key={l._id} className="bg-white border border-gray-200 rounded-lg p-3 text-sm shadow-sm">
                                 <div className="flex justify-between mb-1">
                                   <strong className="text-gray-900">{l.task_title}</strong>
                                   <span className="text-xs text-gray-500">{new Date(l.entry_date).toDateString()} ({l.total_hours} hrs)</span>
                                 </div>
                                 <p className="text-gray-600 mb-2 truncate">{l.task_description}</p>
                               </div>
                             ))}
                           </div>
                         </details>
                       </div>
                       
                       {summary.status === 'submitted' && (
                           <div className="mt-6 border-t border-gray-100 pt-6">
                               <label className="block text-sm font-bold text-gray-800 mb-2">Weekly Sign-Off / Comments</label>
                               <textarea 
                                 className="w-full rounded-xl border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-3 border mb-4 text-sm resize-y"
                                 rows={3}
                                 placeholder="Add your endorsing comments or reasons for rejection..."
                                 value={reviewing === summary._id ? comment : ''}
                                 onChange={(e) => {
                                     if(reviewing !== summary._id) setReviewing(summary._id);
                                     setComment(e.target.value);
                                 }}
                               ></textarea>
                               <div className="flex gap-4">
                                   <button onClick={() => handleReviewSummary(summary._id, 'approved')} className="flex-1 bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 font-bold text-sm transition-all shadow-md active:scale-[0.98]">
                                       Approve Week
                                   </button>
                                   <button onClick={() => handleReviewSummary(summary._id, 'rejected')} className="flex-1 bg-red-600 text-white px-5 py-3 rounded-xl hover:bg-red-700 font-bold text-sm transition-all shadow-md active:scale-[0.98]">
                                       Reject Week
                                   </button>
                               </div>
                           </div>
                       )}
                       
                       {summary.status !== 'submitted' && summary.supervisor_comment && (
                           <div className="mt-6 bg-primary-50/50 p-4 rounded-xl border border-primary-100">
                               <span className="block text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">Supervisor's Remarks</span>
                               <p className="text-sm font-medium text-gray-800">{summary.supervisor_comment}</p>
                           </div>
                       )}
                     </li>
                   );
                 })}
               </ul>
             )
           ) : activeTab === 'visits' ? (
             <div className="p-8">
               <h2 className="text-xl font-bold text-gray-900 mb-6">Log a New Visit</h2>
               <form onSubmit={handleLogVisit} className="mb-10 bg-gray-50 p-6 rounded-xl border border-gray-200">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-1">Visit Date *</label>
                     <input type="date" required value={visitForm.date} onChange={e => setVisitForm({ ...visitForm, date: e.target.value })} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" />
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks *</label>
                     <input type="text" required value={visitForm.remarks} onChange={e => setVisitForm({ ...visitForm, remarks: e.target.value })} placeholder="e.g. Discussed progress with industry supervisor" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" />
                   </div>
                 </div>
                 <button type="submit" disabled={submittingVisit} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 transition disabled:opacity-70">
                   {submittingVisit ? 'Saving...' : 'Save Visit Record'}
                 </button>
               </form>

               <h2 className="text-xl font-bold text-gray-900 mb-4">Past Visits</h2>
               {visits.length === 0 ? (
                 <p className="text-gray-500">No visits logged for this student yet.</p>
               ) : (
                 <div className="overflow-x-auto border border-gray-200 rounded-xl">
                   <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Supervisor</th>
                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {visits.map(v => (
                         <tr key={v._id}>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{new Date(v.visit_date).toLocaleDateString()}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.supervisor_id?.first_name} {v.supervisor_id?.last_name}</td>
                           <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{v.remarks}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
           ) : activeTab === 'assessment' ? (
               <div className="p-8 max-w-2xl mx-auto">
                 {assessmentStatus?.assessment ? (
                   <div className="text-center p-8 bg-green-50 rounded-xl border border-green-200">
                     <h2 className="text-2xl font-bold text-green-800 mb-2">Assessment Completed</h2>
                     <p className="text-green-700 font-medium text-lg">Grade: {assessmentStatus.assessment.grade} ({assessmentStatus.assessment.percentage}%)</p>
                     <p className="text-sm text-green-600 mt-2">You have already submitted the final evaluation for this student.</p>
                   </div>
                 ) : !assessmentStatus?.assessorType ? (
                   <div className="text-center p-8 text-gray-500">Checking assessment eligibility...</div>
                 ) : (
                   <form onSubmit={handleSubmitAssessment} className="space-y-6">
                     <div className="mb-6">
                       <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Final Evaluation Form</h2>
                       <p className="text-gray-500 text-sm">Please complete the official {assessmentStatus.assessorType === 'industry' ? 'ITF Form 8C' : 'ITF Form 8B'} assessment.</p>
                     </div>

                     {assessmentStatus.assessorType === 'industry' ? (
                       <div className="space-y-4">
                         {['attendance', 'punctuality', 'initiative', 'relationship_with_staff', 'practical_skills', 'general_conduct'].map(field => (
                           <div key={field}>
                             <label className="block text-sm font-semibold text-gray-700 capitalize mb-1">{field.replace(/_/g, ' ')} (Max 10)</label>
                             <input type="number" min="0" max="10" required 
                               value={assessmentForm[field] || ''} 
                               onChange={e => setAssessmentForm({ ...assessmentForm, [field]: e.target.value })} 
                               className="block w-full rounded-lg border border-gray-300 px-3 py-2" />
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="space-y-4">
                         {[
                           { key: 'logbook_maintenance', label: 'Logbook Maintenance (Max 15)', max: 15 },
                           { key: 'knowledge_of_reports', label: 'Knowledge of Reports (Max 15)', max: 15 },
                           { key: 'student_participation', label: 'Student Participation (Max 10)', max: 10 },
                           { key: 'technical_skills_gained', label: 'Technical Skills Gained (Max 10)', max: 10 }
                         ].map(f => (
                           <div key={f.key}>
                             <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                             <input type="number" min="0" max={f.max} required 
                               value={assessmentForm[f.key] || ''} 
                               onChange={e => setAssessmentForm({ ...assessmentForm, [f.key]: e.target.value })} 
                               className="block w-full rounded-lg border border-gray-300 px-3 py-2" />
                           </div>
                         ))}
                       </div>
                     )}

                     <div>
                       <label className="block text-sm font-semibold text-gray-700 mb-1">General Comments / Remarks</label>
                       <textarea rows={4} required value={assessmentForm.comments || ''} onChange={e => setAssessmentForm({ ...assessmentForm, comments: e.target.value })} className="block w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Overall appraisal..."></textarea>
                     </div>

                     <button type="submit" disabled={submittingAssessment} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 disabled:opacity-70 shadow-sm">
                       {submittingAssessment ? 'Submitting...' : 'Submit Final Assessment'}
                     </button>
                   </form>
                 )}
               </div>
             ) : null}
       </div>
    </div>
  );
}
