import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

interface LogEntryData {
  entry_date: string;
  start_time: string;
  end_time: string;
  task_title: string;
  task_description: string;
  skills_learned: string;
  tools_used: string[];
  challenges_faced: string;
}

interface FraudAlert {
  type: string;
  severity: string;
  message: string;
}

interface DateValidationResult {
  isValid: boolean;
  requiresBackdatingApproval: boolean;
  reason?: string;
  daysPast?: number;
}

const emptyLogEntry: LogEntryData = {
  entry_date: new Date().toISOString().split('T')[0],
  start_time: '',
  end_time: '',
  task_title: '',
  task_description: '',
  skills_learned: '',
  tools_used: [],
  challenges_faced: ''
};

const commonTools = [
  'Computer', 'Laptop', 'Internet', 'Microsoft Office', 'VS Code',
  'GitHub', 'Docker', 'AWS', 'Google Cloud', 'Database',
  'Network Tools', 'Testing Tools', 'Documentation Tools', 'Communication Tools'
];

export default function EnhancedLogEntryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LogEntryData>(emptyLogEntry);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [dateValidation, setDateValidation] = useState<DateValidationResult | null>(null);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [geotagEnabled, setGeotagEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [validDateRange, setValidDateRange] = useState<{minDate: string, maxDate: string}>({
    minDate: '',
    maxDate: ''
  });

  useEffect(() => {
    fetchValidDateRange();
    if (id) {
      fetchLogEntry();
    }
  }, [id]);

  useEffect(() => {
    if (formData.entry_date) {
      validateEntryDate();
      checkExistingEntry();
    }
  }, [formData.entry_date]);

  const fetchValidDateRange = async () => {
    try {
      const response = await api.get('/students/date-range');
      setValidDateRange({
        minDate: response.data.minDate.split('T')[0],
        maxDate: response.data.maxDate.split('T')[0]
      });
    } catch (error) {
      console.error('Error fetching date range:', error);
    }
  };

  const fetchLogEntry = async () => {
    try {
      const response = await api.get(`/students/logs/${id}`);
      const entry = response.data;
      setFormData({
        entry_date: new Date(entry.entry_date).toISOString().split('T')[0],
        start_time: entry.start_time || '',
        end_time: entry.end_time || '',
        task_title: entry.task_title,
        task_description: entry.task_description,
        skills_learned: entry.skills_learned || '',
        tools_used: entry.tools_used || [],
        challenges_faced: entry.challenges_faced || ''
      });
      setExistingEntry(entry);
    } catch (error) {
      setError('Failed to load log entry');
    }
  };

  const validateEntryDate = async () => {
    try {
      const response = await api.post('/students/validate-date', {
        entry_date: formData.entry_date
      });
      setDateValidation(response.data);
      
      if (!response.data.isValid) {
        setError(response.data.reason || 'Invalid date selected');
      }
    } catch (error) {
      console.error('Error validating date:', error);
    }
  };

  const checkExistingEntry = async () => {
    try {
      const response = await api.post('/students/check-existing-entry', {
        entry_date: formData.entry_date
      });
      
      if (response.data.exists && !response.data.canEdit) {
        setExistingEntry(response.data.entry);
        setError('An entry already exists for this date and cannot be edited');
      }
    } catch (error) {
      console.error('Error checking existing entry:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToolToggle = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      tools_used: prev.tools_used.includes(tool)
        ? prev.tools_used.filter(t => t !== tool)
        : [...prev.tools_used, tool]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const calculateHours = () => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`1970-01-01T${formData.start_time}:00`);
      const end = new Date(`1970-01-01T${formData.end_time}:00`);
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (hours < 0) hours += 24;
      return Math.round(hours * 100) / 100;
    }
    return 0;
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.task_title.trim()) errors.push('Task title is required');
    if (!formData.task_description.trim()) errors.push('Task description is required');
    if (!formData.skills_learned.trim()) errors.push('Skills learned is required');
    if (formData.tools_used.length === 0) errors.push('At least one tool must be selected');
    
    if (formData.start_time && formData.end_time) {
      const hours = calculateHours();
      if (hours < 0.5) errors.push('Work hours must be at least 30 minutes');
      if (hours > 16) errors.push('Work hours cannot exceed 16 hours');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key as keyof LogEntryData])) {
          formDataToSend.append(key, JSON.stringify(formData[key as keyof LogEntryData]));
        } else {
          formDataToSend.append(key, formData[key as keyof LogEntryData] as string);
        }
      });

      // Add files
      attachments.forEach(file => {
        formDataToSend.append('files', file);
      });

      // Add geotag if enabled
      if (geotagEnabled && currentLocation) {
        formDataToSend.append('geotag', JSON.stringify({
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          timestamp: new Date().toISOString()
        }));
      }

      // Create or update entry
      if (id) {
        await api.put(`/students/logs/${id}`, formDataToSend);
      } else {
        const response = await api.post('/students/logs', formDataToSend);
        
        // Check for fraud alerts
        if (response.data.fraudAnalysis && response.data.fraudAnalysis.riskScore > 30) {
          setFraudAlerts(response.data.fraudAnalysis.detectedFrauds || []);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save log entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key as keyof LogEntryData])) {
          formDataToSend.append(key, JSON.stringify(formData[key as keyof LogEntryData]));
        } else {
          formDataToSend.append(key, formData[key as keyof LogEntryData] as string);
        }
      });

      attachments.forEach(file => {
        formDataToSend.append('files', file);
      });

      formDataToSend.append('status', 'draft');

      if (id) {
        await api.put(`/students/logs/${id}`, formDataToSend);
      } else {
        await api.post('/students/logs', formDataToSend);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Entry Saved!</h2>
          <p className="text-gray-600 mb-4">Your log entry has been saved successfully.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {id ? 'Edit Log Entry' : 'Create Daily Log Entry'}
            </h2>
            <p className="text-gray-600 mt-1">
              Record your daily activities and learning experiences
            </p>
          </div>

          {/* Fraud Alerts */}
          {fraudAlerts.length > 0 && (
            <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Fraud Detection Alerts</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {fraudAlerts.map((alert, index) => (
                      <div key={index} className="mb-1">
                        <strong>{alert.severity.toUpperCase()}:</strong> {alert.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date Validation Alert */}
          {dateValidation && !dateValidation.isValid && (
            <div className="px-6 py-4 bg-yellow-50 border-l-4 border-yellow-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Date Validation Warning</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    {dateValidation.reason}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Entry Alert */}
          {existingEntry && (
            <div className="px-6 py-4 bg-blue-50 border-l-4 border-blue-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Existing Entry Found</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    An entry already exists for {formData.entry_date}. 
                    {existingEntry.status === 'draft' ? ' You can edit the draft.' : ' This entry cannot be modified.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {error && (
              <div className="p-4 rounded-md bg-red-50 border border-red-200">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}

            {/* Date and Time Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="entry_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Date *
                </label>
                <input
                  type="date"
                  id="entry_date"
                  name="entry_date"
                  required
                  min={validDateRange.minDate}
                  max={validDateRange.maxDate}
                  value={formData.entry_date}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Date must be within SIWES period
                </p>
              </div>

              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {formData.start_time && formData.end_time && (
                  <p className="text-xs text-gray-500 mt-1">
                    Total hours: {calculateHours()}
                  </p>
                )}
              </div>
            </div>

            {/* Task Information */}
            <div className="space-y-4">
              <div>
                <label htmlFor="task_title" className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  id="task_title"
                  name="task_title"
                  required
                  value={formData.task_title}
                  onChange={handleChange}
                  placeholder="Brief title of your main task"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="task_description" className="block text-sm font-medium text-gray-700 mb-2">
                  Task Description *
                </label>
                <textarea
                  id="task_description"
                  name="task_description"
                  required
                  rows={4}
                  value={formData.task_description}
                  onChange={handleChange}
                  placeholder="Describe what you did in detail. Be specific about your activities and accomplishments."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 50 characters recommended for detailed description
                </p>
              </div>
            </div>

            {/* Skills and Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="skills_learned" className="block text-sm font-medium text-gray-700 mb-2">
                  Skills Learned *
                </label>
                <textarea
                  id="skills_learned"
                  name="skills_learned"
                  required
                  rows={3}
                  value={formData.skills_learned}
                  onChange={handleChange}
                  placeholder="What new skills or knowledge did you gain?"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tools Used * (Select at least one)
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {commonTools.map(tool => (
                    <label key={tool} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.tools_used.includes(tool)}
                        onChange={() => handleToolToggle(tool)}
                        className="mr-2 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">{tool}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tools_used.length} tool(s) selected
                </p>
              </div>
            </div>

            {/* Challenges */}
            <div>
              <label htmlFor="challenges_faced" className="block text-sm font-medium text-gray-700 mb-2">
                Challenges Faced
              </label>
              <textarea
                id="challenges_faced"
                name="challenges_faced"
                rows={3}
                value={formData.challenges_faced}
                onChange={handleChange}
                placeholder="Any difficulties or obstacles you encountered and how you overcame them"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Evidence Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence (Photos, Documents)
              </label>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Click to upload or drag and drop
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          PNG, JPG, PDF up to 10MB each
                        </span>
                      </label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </div>
                  </div>
                </div>

                {/* Geotag Option */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="geotag"
                    checked={geotagEnabled}
                    onChange={(e) => {
                      setGeotagEnabled(e.target.checked);
                      if (e.target.checked) {
                        getCurrentLocation();
                      }
                    }}
                    className="mr-2 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="geotag" className="text-sm text-gray-700">
                    Include location data with evidence (optional)
                  </label>
                </div>

                {geotagEnabled && currentLocation && (
                  <div className="text-xs text-gray-500">
                    Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-700">Selected files:</p>
                  <ul className="text-xs text-gray-500 mt-1">
                    {attachments.map((file, index) => (
                      <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="submit"
                disabled={submitting || !dateValidation?.isValid}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
