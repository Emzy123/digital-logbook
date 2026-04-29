import { useEffect, useState } from 'react';
import api from '../services/api';

export default function WeeklySummaryView() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ week_number: 1, start_date: '', end_date: '', summary_text: '' });

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      const res = await api.get('/weekly-summaries');
      setSummaries(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (id: string, weekNum: number) => {
      try {
          const res = await api.get(`/weekly-summaries/${id}/pdf`, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `weekly-summary-week-${weekNum}.pdf`);
          document.body.appendChild(link);
          link.click();
      } catch(e) {
          alert('Failed to generate PDF');
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await api.post('/weekly-summaries', formData);
          setModalOpen(false);
          fetchSummaries();
      } catch(e) {
          alert('Error saving summary');
      }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
       <div className="flex items-center justify-between mb-8">
         <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Weekly Summaries</h1>
            <p className="text-gray-500 mt-1">Compile and review your weekly progress reflections.</p>
         </div>
         <button onClick={() => setModalOpen(true)} className="px-5 py-2.5 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition font-semibold">
           + Compile New Week
         </button>
       </div>

       {isModalOpen && (
           <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                   <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                       <h3 className="text-lg font-bold text-gray-900">Compile Weekly Summary</h3>
                       <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                   </div>
                   <form onSubmit={handleSubmit} className="p-6 space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div>
                               <label className="block text-sm font-semibold text-gray-700">Week Number</label>
                               <input type="number" required value={formData.week_number} onChange={(e) => setFormData({...formData, week_number: parseInt(e.target.value)})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                           </div>
                           <div>
                               <label className="block text-sm font-semibold text-gray-700">Start Date</label>
                               <input type="date" required value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                           </div>
                           <div>
                               <label className="block text-sm font-semibold text-gray-700">End Date</label>
                               <input type="date" required value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                           </div>
                       </div>
                       <div>
                           <label className="block text-sm font-semibold text-gray-700">Weekly Reflection / Summary Text</label>
                           <textarea required rows={5} value={formData.summary_text} onChange={(e) => setFormData({...formData, summary_text: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="Summarize the core concepts learned this week..." />
                       </div>
                       <div className="flex justify-end pt-4">
                           <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded font-medium shadow hover:bg-primary-700">Save Weekly Summary</button>
                       </div>
                   </form>
               </div>
           </div>
       )}

       <div className="bg-white shadow-sm overflow-hidden rounded-xl border border-gray-200">
           {loading ? (
             <div className="p-12 text-center text-gray-500 font-medium">Loading summaries...</div>
           ) : summaries.length === 0 ? (
             <div className="p-12 text-center">
                 <p className="text-gray-600 font-medium text-lg">No Weekly Summaries</p>
                 <p className="text-gray-500 mt-1">You have not compiled any weekly reports yet.</p>
             </div>
           ) : (
             <ul className="divide-y divide-gray-200">
               {summaries.map((summary: any) => (
                 <li key={summary._id} className="p-6 hover:bg-gray-50 transition-colors">
                   <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-lg font-bold text-gray-900">Week {summary.week_number}</h3>
                        <p className="text-sm text-gray-500 font-medium mt-1">{new Date(summary.start_date).toDateString()} &mdash; {new Date(summary.end_date).toDateString()}</p>
                     </div>
                     <div className="flex items-center gap-3">
                         <span className={`px-3 py-1 text-xs font-bold uppercase rounded-md ${summary.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{summary.status}</span>
                         <button onClick={() => handleDownloadPdf(summary._id, summary.week_number)} className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                             <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                             PDF Report
                         </button>
                     </div>
                   </div>
                   <div className="mt-4 text-sm text-gray-700 bg-gray-50 p-4 border border-gray-100 rounded-lg">
                       {summary.summary_text}
                   </div>
                 </li>
               ))}
             </ul>
           )}
       </div>
    </div>
  );
}
