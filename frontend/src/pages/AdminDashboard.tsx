import { useEffect, useState } from 'react';
import { Button } from '@headlessui/react';
import axios from 'axios';
import { SearchBar } from '../components/common/SearchBar';
import { ExportButton } from '../components/common/ExportButton';
import api from '../services/api';

const EMPTY_FORM = { first_name: '', last_name: '', email: '', phone: '', password: '', role: 'industry_supervisor', establishment_id: '' };

function CreateSupervisorModal({ onClose, onCreated, establishments }: { onClose: () => void; onCreated: () => void; establishments: any[] }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/admin/supervisors/create', form);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create supervisor.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';

  const isIndustry = form.role === 'industry_supervisor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Supervisor</h2>
        <p className="text-sm text-gray-500 mb-6">Add a new industry or school supervisor account to the system.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name *</label>
              <input type="text" className={inputCls} required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="First name" />
            </div>
            <div>
              <label className={labelCls}>Last Name *</label>
              <input type="text" className={inputCls} required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email Address *</label>
            <input type="email" className={inputCls} required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="supervisor@company.com" />
          </div>

          <div>
            <label className={labelCls}>Phone Number</label>
            <input type="tel" className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234 800 000 0000" />
          </div>

          <div>
            <label className={labelCls}>Supervisor Role *</label>
            <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, establishment_id: '' }))}>
              <option value="industry_supervisor">Industry Supervisor</option>
              <option value="school_supervisor">School Supervisor</option>
            </select>
          </div>

          {isIndustry && (
            <div>
              <label className={labelCls}>Establishment (Company) *</label>
              <select
                className={inputCls}
                required={isIndustry}
                value={form.establishment_id}
                onChange={e => setForm(f => ({ ...f, establishment_id: e.target.value }))}
              >
                <option value="">— Select an Establishment —</option>
                {establishments.map(est => (
                  <option key={est._id} value={est._id}>{est.name} {est.city ? `(${est.city})` : ''}</option>
                ))}
              </select>
              {establishments.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No establishments yet — create one in the Establishments tab first.</p>
              )}
            </div>
          )}

          <div>
            <label className={labelCls}>Temporary Password *</label>
            <input type="password" className={inputCls} required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" />
            <p className="mt-1 text-xs text-gray-400">The supervisor will use this to log in for the first time.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-70 disabled:cursor-wait">
              {submitting ? 'Creating...' : 'Create Supervisor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const EMPTY_ESTABLISHMENT_FORM = { name: '', city: '', state: '', contact_person: '', contact_phone: '' };

function CreateEstablishmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_ESTABLISHMENT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/establishments', form);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create establishment.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Establishment</h2>
        <p className="text-sm text-gray-500 mb-6">Add a new company or placement institution for students.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Establishment Name *</label>
            <input type="text" className={inputCls} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Zenith Bank Plc" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>City</label>
              <input type="text" className={inputCls} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Lagos" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input type="text" className={inputCls} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. Lagos State" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contact Person</label>
              <input type="text" className={inputCls} value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <label className={labelCls}>Contact Phone</label>
              <input type="text" className={inputCls} value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="e.g. 08000000000" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-70 disabled:cursor-wait">
              {submitting ? 'Creating...' : 'Create Establishment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [assignmentSelections, setAssignmentSelections] = useState<Record<string, { industry: string; school: string }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEstablishmentModal, setShowEstablishmentModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await api.get('/admin/users');
        setUsers(res.data);
      } else if (activeTab === 'audit') {
        const res = await api.get('/admin/audit-logs');
        setAuditLogs(res.data);
      } else if (activeTab === 'establishments') {
        const res = await api.get('/establishments');
        setEstablishments(res.data);
      } else if (activeTab === 'assignments') {
        const [supRes, stuRes, estRes] = await Promise.all([
          api.get('/admin/supervisors'),
          api.get('/admin/students'),
          api.get('/establishments'),
        ]);
        setSupervisors(supRes.data);
        setStudents(stuRes.data);
        setEstablishments(estRes.data);
        const init: Record<string, { industry: string; school: string }> = {};
        stuRes.data.forEach((st: any) => {
          init[st._id] = {
            industry: st.assignment?.industry_supervisor_id || '',
            school: st.assignment?.school_supervisor_id || '',
          };
        });
        setAssignmentSelections(init);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (studentId: string) => {
    const sel = assignmentSelections[studentId] || { industry: '', school: '' };
    setSaveStatus(s => ({ ...s, [studentId]: 'saving' }));
    try {
      await api.post('/admin/assignments', {
        studentProfileId: studentId,
        industrySupervisorId: sel.industry || null,
        schoolSupervisorId: sel.school || null,
      });
      setSaveStatus(s => ({ ...s, [studentId]: 'saved' }));
      setTimeout(() => setSaveStatus(s => { const n = { ...s }; delete n[studentId]; return n; }), 2000);
    } catch (e) {
      setSaveStatus(s => ({ ...s, [studentId]: 'error' }));
    }
  };

  const handleBulkImport = async () => {
    const samplePayload = {
      users: [
        { email: 'studentX@example.com', first_name: 'John', last_name: 'Doe', password: 'securePassword123', role: 'student' }
      ]
    };
    try {
      await api.post('/admin/users/bulk', samplePayload);
      alert('Bulk import simulated successfully');
      fetchData();
    } catch(e) {
      alert('Bulk import failed.');
    }
  };

  const tabBtn = (tab: string, label: string) =>
    <button onClick={() => setActiveTab(tab)} className={`pb-3 px-1 font-semibold text-sm transition-colors ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>;

  return (
    <>
      {showCreateModal && (
        <CreateSupervisorModal onClose={() => setShowCreateModal(false)} onCreated={fetchData} establishments={establishments} />
      )}
      {showEstablishmentModal && (
        <CreateEstablishmentModal onClose={() => setShowEstablishmentModal(false)} onCreated={fetchData} />
      )}

      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex-1 max-w-xl mx-8">
            <SearchBar />
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Add Supervisor
            </button>
            {activeTab === 'users' && (
              <button onClick={handleBulkImport} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg shadow-sm hover:bg-gray-800 transition font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Bulk Import
              </button>
            )}
            <ExportButton entity="students" label="Export Students" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 mb-6">
          {tabBtn('users', 'User Directory')}
          {tabBtn('establishments', 'Establishments')}
          {tabBtn('assignments', 'Supervisor Assignments')}
          {tabBtn('audit', 'Security Audit Logs')}
        </div>

        <div className="bg-white shadow-lg overflow-hidden rounded-xl border border-gray-200">
          {loading ? (
            <div className="p-16 text-center text-gray-500 font-medium">Fetching administrative records...</div>
          ) : activeTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User Account</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Registered</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No users found.</td></tr>
                  ) : users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                            {user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wide">
                          {user.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.phone || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-wide ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.is_active ? 'Active' : 'Locked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          ) : activeTab === 'establishments' ? (
            <div className="p-4">
              <div className="mb-4 flex justify-between items-center px-2">
                <p className="text-sm text-gray-500">Manage placement locations for students.</p>
                <button
                  onClick={() => setShowEstablishmentModal(true)}
                  className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg shadow-sm hover:bg-primary-200 transition font-semibold text-sm"
                >
                  + Add Establishment
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Person</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {establishments.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No establishments found.</td></tr>
                    ) : establishments.map(est => (
                      <tr key={est._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{est.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{est.city}{est.state ? `, ${est.state}` : ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{est.contact_person || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{est.contact_phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          ) : activeTab === 'assignments' ? (
            <div className="overflow-x-auto">
              {students.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <p className="font-medium text-lg">No student profiles yet</p>
                  <p className="text-sm mt-1">Students must save their Profile before they can be assigned a supervisor.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Matric No.</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Industry Supervisor</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">School Supervisor</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map(student => {
                      const sel = assignmentSelections[student._id] || { industry: '', school: '' };
                      const status = saveStatus[student._id];
                      const studentEstId = student.establishment_id?.toString();
                      // Industry sups filtered to match the student's chosen establishment
                      const industrySups = supervisors.filter(s =>
                        s.role === 'industry_supervisor' && s.establishment_id?.toString() === studentEstId
                      );
                      const allIndustrySups = supervisors.filter(s => s.role === 'industry_supervisor');
                      const schoolSups = supervisors.filter(s => s.role === 'school_supervisor');
                      return (
                        <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                                {student.user_id?.first_name?.[0]}{student.user_id?.last_name?.[0]}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-sm">{student.user_id?.first_name} {student.user_id?.last_name}</div>
                                <div className="text-xs text-gray-400">{student.user_id?.email}</div>
                                {student.establishment_id ? (
                                  <div className="text-xs text-primary-600 font-semibold mt-0.5">{student.establishment_id.name}{student.establishment_id.city ? ` · ${student.establishment_id.city}` : ''}</div>
                                ) : (
                                  <div className="text-xs text-amber-500 italic mt-0.5">No establishment</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{student.matriculation_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap min-w-[220px]">
                            {!studentEstId ? (
                              <p className="text-xs text-amber-600 italic">Student has not selected a placement establishment yet.</p>
                            ) : industrySups.length === 0 && allIndustrySups.length > 0 ? (
                              <p className="text-xs text-red-500 italic">No industry supervisors are registered for this student's establishment.</p>
                            ) : (
                              <select
                                className="block w-full text-sm rounded-lg border border-gray-300 px-2 py-1.5 focus:ring-primary-500 focus:border-primary-500"
                                value={sel.industry}
                                onChange={e => setAssignmentSelections(prev => ({ ...prev, [student._id]: { ...sel, industry: e.target.value } }))}
                              >
                                <option value="">— Unassigned —</option>
                                {industrySups.map(s => <option key={s._id} value={s._id}>{s.first_name} {s.last_name}</option>)}
                              </select>
                            )}
                            {allIndustrySups.length === 0 && <p className="text-xs text-amber-600 mt-1">No industry supervisors yet — use "Add Supervisor"</p>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                            <select
                              className="block w-full text-sm rounded-lg border border-gray-300 px-2 py-1.5 focus:ring-primary-500 focus:border-primary-500"
                              value={sel.school}
                              onChange={e => setAssignmentSelections(prev => ({ ...prev, [student._id]: { ...sel, school: e.target.value } }))}
                            >
                              <option value="">— Unassigned —</option>
                              {schoolSups.map(s => <option key={s._id} value={s._id}>{s.first_name} {s.last_name}</option>)}
                            </select>
                            {schoolSups.length === 0 && <p className="text-xs text-amber-600 mt-1">No school supervisors yet — use "Add Supervisor"</p>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              disabled={status === 'saving'}
                              onClick={() => handleAssign(student._id)}
                              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                status === 'saved' ? 'bg-green-500 text-white' :
                                status === 'error' ? 'bg-red-500 text-white' :
                                status === 'saving' ? 'bg-gray-400 text-white cursor-wait' :
                                'bg-primary-600 text-white hover:bg-primary-700'
                              }`}
                            >
                              {status === 'saving' ? 'Saving...' : status === 'saved' ? '✓ Saved' : status === 'error' ? '✗ Failed' : 'Assign'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Initiator</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">No audit logs yet.</td></tr>
                  ) : auditLogs.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50 font-mono text-sm border-l-4 border-l-transparent hover:border-l-primary-500 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{log.action}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{log.target_resource}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{log.user_id ? log.user_id.email : 'System Action'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
