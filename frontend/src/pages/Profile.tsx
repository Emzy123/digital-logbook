import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface ProfileData {
  id?: string;
  matriculation_number: string;
  department: string;
  program_level: string;
  current_semester: number | '';
  start_date: string;
  end_date: string;
  establishment_id?: string;
  bank_name: string;
  account_number: string;
  placement_letter_url?: string;
  passport_photo_url?: string;
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  };
  user_id?: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

const emptyProfile: ProfileData = {
  matriculation_number: '',
  department: '',
  program_level: '',
  current_semester: '',
  start_date: '',
  end_date: '',
  establishment_id: '',
  bank_name: '',
  account_number: '',
  emergency_contact: { name: '', phone: '', relationship: '' },
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [establishments, setEstablishments] = useState<any[]>([]);

  const placementRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchEstablishments();
  }, []);

  const fetchEstablishments = async () => {
    try {
      const res = await api.get('/establishments');
      setEstablishments(res.data);
    } catch(e) {}
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/students/profile');
      const data = res.data;
      setProfile({
        id: data._id,
        matriculation_number: data.matriculation_number || '',
        department: data.department || '',
        program_level: data.program_level || '',
        current_semester: data.current_semester || '',
        start_date: data.start_date ? data.start_date.split('T')[0] : '',
        end_date: data.end_date ? data.end_date.split('T')[0] : '',
        establishment_id: data.establishment_id || '',
        bank_name: data.bank_name || '',
        account_number: data.account_number || '',
        placement_letter_url: data.placement_letter_url,
        passport_photo_url: data.passport_photo_url,
        emergency_contact: data.emergency_contact || { name: '', phone: '', relationship: '' },
        user_id: data.user_id,
      });
    } catch (e: any) {
      if (e.response?.status !== 404) {
        setError('Failed to load profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleEmergencyChange = (field: keyof ProfileData['emergency_contact'], value: string) => {
    setProfile(prev => ({
      ...prev,
      emergency_contact: { ...prev.emergency_contact, [field]: value }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');

    const payload: any = { ...profile };
    delete payload.user_id;
    delete payload.placement_letter_url;
    delete payload.passport_photo_url;
    if (payload.current_semester === '') payload.current_semester = null;
    if (payload.start_date === '') payload.start_date = null;
    if (payload.end_date === '') payload.end_date = null;
    if (payload.establishment_id === '') payload.establishment_id = null;

    try {
      await api.put('/students/profile', payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (fieldName: 'placement_letter' | 'passport_photo', file: File) => {
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    const formData = new FormData();
    formData.append(fieldName, file);
    try {
      await api.post('/students/profile/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess(fieldName === 'placement_letter' ? 'Placement letter uploaded!' : 'Passport photo uploaded!');
      // Refresh to get new URLs
      await fetchProfile();
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (e: any) {
      setUploadError(e.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const inputCls = "block w-full rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white transition";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1";

  const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const handleDownloadPDF = async () => {
    if (!profile.id) return;
    try {
      const response = await api.get(`/reports/pdf/final/${profile.id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SIWES_Final_Report_${profile.matriculation_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF report.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Profile</h1>
          <p className="mt-1 text-gray-500">Manage your SIWES student placement information.</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-secondary-600 text-white rounded-lg shadow-sm hover:bg-secondary-700 transition font-semibold"
        >
          Download Final Report (PDF)
        </button>
      </div>

      {/* Account Info Card */}
      {profile.user_id && (
        <div className="mb-8 bg-primary-50 border border-primary-100 rounded-2xl p-6 flex items-center gap-6">
          <div className="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow overflow-hidden">
            {profile.passport_photo_url ? (
              <img src={`${BACKEND_URL}${profile.passport_photo_url}`} alt="Passport" className="w-full h-full object-cover" />
            ) : (
              <span>{profile.user_id.first_name?.[0]}{profile.user_id.last_name?.[0]}</span>
            )}
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{profile.user_id.first_name} {profile.user_id.last_name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{profile.user_id.email}</p>
            {profile.user_id.phone && <p className="text-sm text-gray-500 mt-0.5">📞 {profile.user_id.phone}</p>}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Feedback banners */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Profile saved successfully!
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        {/* Academic Info */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Academic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Matriculation Number *</label>
              <input type="text" className={inputCls} value={profile.matriculation_number} onChange={e => handleChange('matriculation_number', e.target.value)} placeholder="e.g. 20/ENG/CS/001" required />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <input type="text" className={inputCls} value={profile.department} onChange={e => handleChange('department', e.target.value)} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className={labelCls}>Programme Level</label>
              <select className={inputCls} value={profile.program_level} onChange={e => handleChange('program_level', e.target.value)}>
                <option value="">Select Level</option>
                <option value="ND1">ND 1</option>
                <option value="ND2">ND 2</option>
                <option value="HND1">HND 1</option>
                <option value="HND2">HND 2</option>
                <option value="BSc3">BSc Year 3</option>
                <option value="BSc4">BSc Year 4</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Current Semester</label>
              <input type="number" min={1} max={10} className={inputCls} value={profile.current_semester} onChange={e => handleChange('current_semester', e.target.value ? parseInt(e.target.value) : '')} placeholder="e.g. 5" />
            </div>
          </div>
        </section>

        {/* Placement Establishment */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Placement Establishment</h2>
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className={labelCls}>Company / Organization</label>
              <div className="space-y-2">
                <select className={inputCls} value={profile.establishment_id} onChange={e => handleChange('establishment_id', e.target.value)}>
                  <option value="">— Select an Establishment —</option>
                  {establishments.map(est => (
                    <option key={est._id} value={est._id}>{est.name} ({est.city || 'No Location'})</option>
                  ))}
                </select>
                <div className="text-sm text-gray-500">
                  Can't find your company? 
                  <Link to="/company-request" className="text-primary-600 hover:text-primary-800 font-medium ml-1">
                    Request a new company
                  </Link>
                </div>
              </div>
              {establishments.length === 0 && <p className="text-xs text-amber-600 mt-1">No establishments found. Please contact administration.</p>}
              
              {profile.establishment_id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm flex flex-col gap-2">
                  {establishments.find(e => e._id === profile.establishment_id)?.city && (
                    <p><strong>Location:</strong> {establishments.find(e => e._id === profile.establishment_id)?.city}, {establishments.find(e => e._id === profile.establishment_id)?.state}</p>
                  )}
                  {establishments.find(e => e._id === profile.establishment_id)?.contact_person && (
                    <p><strong>Contact Person:</strong> {establishments.find(e => e._id === profile.establishment_id)?.contact_person}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SIWES Dates */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">SIWES Placement Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" className={inputCls} value={profile.start_date} onChange={e => handleChange('start_date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" className={inputCls} value={profile.end_date} onChange={e => handleChange('end_date', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Bank Info */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Bank Account (for Allowance)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Bank Name</label>
              <input type="text" className={inputCls} value={profile.bank_name} onChange={e => handleChange('bank_name', e.target.value)} placeholder="e.g. First Bank" />
            </div>
            <div>
              <label className={labelCls}>Account Number</label>
              <input type="text" className={inputCls} value={profile.account_number} onChange={e => handleChange('account_number', e.target.value)} placeholder="10-digit account number" maxLength={10} />
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelCls}>Full Name</label>
              <input type="text" className={inputCls} value={profile.emergency_contact.name} onChange={e => handleEmergencyChange('name', e.target.value)} placeholder="Contact person's name" />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input type="tel" className={inputCls} value={profile.emergency_contact.phone} onChange={e => handleEmergencyChange('phone', e.target.value)} placeholder="+234..." />
            </div>
            <div>
              <label className={labelCls}>Relationship</label>
              <input type="text" className={inputCls} value={profile.emergency_contact.relationship} onChange={e => handleEmergencyChange('relationship', e.target.value)} placeholder="e.g. Parent, Guardian" />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl shadow-md hover:bg-primary-700 transition-all disabled:opacity-70 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Documents Upload — separate from the main form */}
      <section className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">SIWES Documents</h2>
        <p className="text-sm text-gray-500">Upload your official documents below. These are required for ITF processing.</p>

        {uploadSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
            ✅ {uploadSuccess}
          </div>
        )}
        {uploadError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            ❌ {uploadError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Placement Letter */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-primary-400 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-50 rounded-lg text-primary-600 text-2xl">📄</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Placement Letter</p>
                <p className="text-xs text-gray-500 mt-0.5">PDF or image issued by your institution</p>
                {profile.placement_letter_url ? (
                  <a href={`${BACKEND_URL}${profile.placement_letter_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary-600 hover:underline">
                    ✓ View uploaded letter
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-amber-600 font-medium">⚠ Not uploaded yet</p>
                )}
                <input
                  ref={placementRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload('placement_letter', e.target.files[0])}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => placementRef.current?.click()}
                  className="mt-3 px-4 py-1.5 border border-primary-600 text-primary-600 text-sm rounded-lg hover:bg-primary-50 transition font-medium disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : profile.placement_letter_url ? 'Replace File' : 'Upload File'}
                </button>
              </div>
            </div>
          </div>

          {/* Passport Photo */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-primary-400 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-50 rounded-lg text-2xl">🖼️</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Passport Photograph</p>
                <p className="text-xs text-gray-500 mt-0.5">Clear passport-sized photo (JPG or PNG)</p>
                {profile.passport_photo_url ? (
                  <div className="mt-2">
                    <img src={`${BACKEND_URL}${profile.passport_photo_url}`} alt="Passport" className="w-16 h-16 rounded-lg object-cover border-2 border-primary-200" />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-600 font-medium">⚠ Not uploaded yet</p>
                )}
                <input
                  ref={photoRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload('passport_photo', e.target.files[0])}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => photoRef.current?.click()}
                  className="mt-3 px-4 py-1.5 border border-primary-600 text-primary-600 text-sm rounded-lg hover:bg-primary-50 transition font-medium disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : profile.passport_photo_url ? 'Replace Photo' : 'Upload Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
