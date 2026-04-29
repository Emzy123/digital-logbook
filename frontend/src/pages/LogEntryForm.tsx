import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

export default function LogEntryForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
  const [files, setFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [tools, setTools] = useState<string>('');
  const [submitStatus, setSubmitStatus] = useState('draft');
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      fetchLog(id);
    }
  }, [id]);

  const fetchLog = async (logId: string) => {
    try {
      const res = await api.get(`/students/logs/${logId}`);
      const log = res.data;
      reset({
        entry_date: log.entry_date ? log.entry_date.split('T')[0] : '',
        start_time: log.start_time || '',
        end_time: log.end_time || '',
        task_title: log.task_title,
        task_description: log.task_description,
        skills_learned: log.skills_learned || '',
        challenges_faced: log.challenges_faced || '',
      });
      if (log.tools_used?.length > 0) {
        setTools(log.tools_used.join(', '));
      }
      setSubmitStatus(log.status || 'draft');
    } catch (e) {
      setErrorMsg('Failed to load log entry for editing.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      formData.append('entry_date', data.entry_date);
      if (data.start_time) formData.append('start_time', data.start_time);
      if (data.end_time) formData.append('end_time', data.end_time);
      formData.append('task_title', data.task_title);
      formData.append('task_description', data.task_description);
      if (data.skills_learned) formData.append('skills_learned', data.skills_learned);
      if (data.challenges_faced) formData.append('challenges_faced', data.challenges_faced);
      
      const toolsArray = tools.split(',').map(t => t.trim()).filter(Boolean);
      if (toolsArray.length > 0) {
        formData.append('tools_used', JSON.stringify(toolsArray));
      }

      formData.append('status', submitStatus);

      files.forEach(file => {
        formData.append('files', file);
      });

      if (isEditMode && id) {
        await api.put(`/students/logs/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/students/logs', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error submitting log entry. Please ensure you have a Student Profile assigned.');
    }
  };


  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
         <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{isEditMode ? 'Edit Log Entry' : 'New Log Entry'}</h1>
         <p className="mt-2 text-gray-500">{isEditMode ? 'Update your log entry details below.' : 'Document your daily activities and tasks sequentially.'}</p>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-200">
        {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-start">
               <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
               <span>{errorMsg}</span>
            </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
              <input 
                type="date" 
                {...register('entry_date', { required: true })} 
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-3 border bg-gray-50 uppercase text-gray-600" 
              />
              {errors.entry_date && <span className="text-red-500 text-xs mt-1 block">Date is required</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                <input type="time" {...register('start_time')} className="block w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:border-primary-500 focus:ring-primary-500 transition-shadow" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                <input type="time" {...register('end_time')} className="block w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:border-primary-500 focus:ring-primary-500 transition-shadow" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Details</h3>
            <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Task Title *</label>
                  <input type="text" {...register('task_title', { required: true })} className="block w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:border-primary-500 focus:ring-primary-500 transition-shadow" placeholder="E.g., Developing Login Interface" />
                  {errors.task_title && <span className="text-red-500 text-xs mt-1 block">Task Title is required</span>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                  <textarea rows={5} {...register('task_description', { required: true })} className="block w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:border-primary-500 focus:ring-primary-500 transition-shadow" placeholder="Detailed description of the daily activities and processes executed..." />
                  {errors.task_description && <span className="text-red-500 text-xs mt-1 block">Description is required</span>}
                </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Skills Acquired</label>
                <input type="text" {...register('skills_learned')} className="block w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:border-primary-500 focus:ring-primary-500" placeholder="E.g., Express JS Routing" />
             </div>
             <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tools / Equipment Used</label>
                <input type="text" value={tools} onChange={(e) => setTools(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:border-primary-500 focus:ring-primary-500" placeholder="Comma separated, e.g. Oscilloscope, Multimeter" />
             </div>
             <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Challenges Faced</label>
                <textarea rows={3} {...register('challenges_faced')} className="block w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 border focus:border-primary-500 focus:ring-primary-500" placeholder="Did you encounter any hurdles? How did you solve them?" />
             </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Evidence Attachments</label>
            <div className="mt-1 flex justify-center px-6 pt-8 pb-10 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors relative cursor-pointer">
              <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="space-y-2 text-center pointer-events-none">
                 <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                 <div className="text-sm text-gray-600">
                    <span className="font-medium text-primary-600">Upload files</span> or drag and drop
                 </div>
                 <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB each (max 5)</p>
              </div>
            </div>
            {files.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">Selected:</span>
                    {files.map((file, i) => (
                        <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                           {file.name}
                        </span>
                    ))}
                </div>
            )}
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200 gap-4">
             <button 
                type="submit" 
                onClick={() => setSubmitStatus('draft')} 
                disabled={isSubmitting} 
                className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg shadow-sm hover:bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-75"
             >
                Save as Draft
             </button>
             <button 
                type="submit" 
                onClick={() => setSubmitStatus('submitted')} 
                disabled={isSubmitting} 
                className="bg-primary-600 text-white px-8 py-3 rounded-lg shadow-md hover:bg-primary-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-75 disabled:cursor-wait"
             >
                {isSubmitting && submitStatus === 'submitted' ? 'Submitting...' : 'Submit to Supervisor'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
