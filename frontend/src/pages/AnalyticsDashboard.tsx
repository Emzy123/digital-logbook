import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/analytics/metrics');
      setMetrics(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
      try {
          const res = await api.post('/analytics/generate-final-report', {}, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Final_ITF_Report_${new Date().toISOString().split('T')[0]}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
      } catch(e) {
          alert('Failed to generate report.');
      }
  };

  if (loading || !metrics) {
      return <div className="p-16 text-center text-gray-500 font-medium">Loading analytics data...</div>;
  }

  const roleData = metrics.roleDistribution.map((item: any) => ({ name: item._id, value: item.count }));
  const statusData = metrics.logsByStatus.map((item: any) => ({ name: item._id, ObjectCount: item.count }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
       <div className="flex items-center justify-between mb-8">
         <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Analytics & Reporting</h1>
         <button onClick={handleGenerateReport} className="px-5 py-2.5 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition font-semibold flex items-center gap-2">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
           Compile Final ITF Report
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Total System Users</h3>
               <p className="text-4xl font-extrabold text-gray-900">{metrics.overview.totalUsers}</p>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Total Logs Handled</h3>
               <p className="text-4xl font-extrabold text-primary-600">{metrics.overview.totalLogs}</p>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Assessments Logged</h3>
               <p className="text-4xl font-extrabold text-green-600">{metrics.overview.totalAssessments}</p>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
               <h3 className="text-lg font-bold text-gray-900 mb-6">User Roles Distribution</h3>
               <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label>
                            {roleData.map((_entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                    </ResponsiveContainer>
               </div>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
               <h3 className="text-lg font-bold text-gray-900 mb-6">Log Entries By Status</h3>
               <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="ObjectCount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
               </div>
           </div>
       </div>
    </div>
  );
}
