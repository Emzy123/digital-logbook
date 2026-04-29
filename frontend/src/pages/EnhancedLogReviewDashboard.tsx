import { useEffect, useState } from 'react';
import api from '../services/api';

interface LogEntry {
  _id: string;
  student_id: {
    _id: string;
    matriculation_number: string;
    user_id: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  entry_date: string;
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  task_title: string;
  task_description: string;
  skills_learned: string;
  tools_used: string[];
  challenges_faced?: string;
  attachments: Array<{
    url: string;
    filename: string;
    mime_type: string;
    size: number;
    geotag?: {
      latitude: number;
      longitude: number;
      timestamp: string;
    };
  }>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'needs_revision';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: {
    first_name: string;
    last_name: string;
  };
  rejection_reason?: string;
  revision_request?: {
    requested_at: string;
    requested_by: {
      first_name: string;
      last_name: string;
    };
    instructions: string;
  };
  fraud_flags: {
    rapid_submission: boolean;
    identical_description: boolean;
    unusual_hours: boolean;
    missing_evidence: boolean;
    suspicious_pattern: boolean;
    risk_score: number;
  };
  audit_trail: {
    created_at: string;
    created_ip: string;
    created_device?: string;
    submitted_at?: string;
    submitted_ip?: string;
  };
  blockchain_hash?: string;
  is_immutable: boolean;
}

interface FraudAlert {
  _id: string;
  student_id: string;
  log_entry_id: string;
  fraud_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
  resolved: boolean;
}

export default function EnhancedLogReviewDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('submitted');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFraudDetails, setShowFraudDetails] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchFraudAlerts();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/supervisors/logs?status=${filter}`);
      setLogs(response.data.logs || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchFraudAlerts = async () => {
    try {
      const response = await api.get('/supervisors/fraud-alerts');
      setFraudAlerts(response.data.alerts || []);
    } catch (err: any) {
      console.error('Failed to fetch fraud alerts:', err);
    }
  };

  const handleReviewAction = async () => {
    if (!selectedLog || !reviewAction) return;

    setSubmitting(true);
    try {
      if (reviewAction === 'approve') {
        await api.post(`/supervisors/logs/${selectedLog._id}/approve`);
      } else if (reviewAction === 'reject') {
        await api.post(`/supervisors/logs/${selectedLog._id}/reject`, {
          rejection_reason: rejectionReason
        });
      } else if (reviewAction === 'revision') {
        await api.post(`/supervisors/logs/${selectedLog._id}/request-revision`, {
          instructions: revisionInstructions
        });
      }

      setShowReviewModal(false);
      setSelectedLog(null);
      setReviewAction(null);
      setRejectionReason('');
      setRevisionInstructions('');
      fetchLogs();
      fetchFraudAlerts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process review action');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (log: LogEntry, action: 'approve' | 'reject' | 'revision') => {
    setSelectedLog(log);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'needs_revision': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600 font-bold';
    if (score >= 40) return 'text-orange-600 font-semibold';
    if (score >= 20) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start || !end) return 'N/A';
    const startDate = new Date(`1970-01-01T${start}:00`);
    const endDate = new Date(`1970-01-01T${end}:00`);
    let hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (hours < 0) hours += 24;
    return `${hours.toFixed(1)} hours`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading log entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Log Entry Review</h1>
          <p className="mt-2 text-gray-600">Review and manage student log entries with fraud detection insights</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {/* Fraud Alerts Summary */}
        {fraudAlerts.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-red-800">Fraud Detection Alerts</h3>
                <p className="text-sm text-red-600 mt-1">
                  {fraudAlerts.filter(a => !a.resolved).length} unresolved alerts require attention
                </p>
              </div>
              <button
                onClick={() => setShowFraudDetails(!showFraudDetails)}
                className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
              >
                {showFraudDetails ? 'Hide' : 'Show'} Details
              </button>
            </div>
            
            {showFraudDetails && (
              <div className="mt-4 space-y-2">
                {fraudAlerts.filter(a => !a.resolved).slice(0, 5).map(alert => (
                  <div key={alert._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-red-800">{alert.description}</span>
                    </div>
                    <span className="text-red-600">
                      {new Date(alert.detected_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Filter Entries</h3>
              <div className="flex space-x-2">
                {['submitted', 'approved', 'rejected', 'needs_revision'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      filter === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)} ({logs.filter(l => l.status === status).length})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No log entries found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className={`hover:bg-gray-50 ${log.fraud_flags.risk_score >= 40 ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.student_id.user_id.first_name} {log.student_id.user_id.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.student_id.matriculation_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {new Date(log.entry_date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDuration(log.start_time, log.end_time)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate max-w-xs">
                          {log.task_title}
                        </div>
                        {log.attachments.length > 0 && (
                          <div className="text-xs text-gray-500">
                            📎 {log.attachments.length} file(s)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${getRiskScoreColor(log.fraud_flags.risk_score)}`}>
                          {log.fraud_flags.risk_score}/100
                        </div>
                        {log.fraud_flags.risk_score > 30 && (
                          <div className="text-xs text-red-600">
                            ⚠️ High Risk
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View
                          </button>
                          {log.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => openReviewModal(log, 'approve')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openReviewModal(log, 'reject')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => openReviewModal(log, 'revision')}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                Revision
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Log Entry Details</h2>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="px-6 py-6">
                {/* Student Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Student Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Name:</strong> {selectedLog.student_id.user_id.first_name} {selectedLog.student_id.user_id.last_name}</p>
                    <p><strong>Matric Number:</strong> {selectedLog.student_id.matriculation_number}</p>
                    <p><strong>Email:</strong> {selectedLog.student_id.user_id.email}</p>
                  </div>
                </div>

                {/* Fraud Detection Summary */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Fraud Detection Analysis</h3>
                  <div className={`p-4 rounded-lg ${selectedLog.fraud_flags.risk_score >= 40 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Risk Score:</span>
                      <span className={`text-2xl font-bold ${getRiskScoreColor(selectedLog.fraud_flags.risk_score)}`}>
                        {selectedLog.fraud_flags.risk_score}/100
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {selectedLog.fraud_flags.rapid_submission && (
                        <div className="text-red-600">⚠️ Rapid submission pattern detected</div>
                      )}
                      {selectedLog.fraud_flags.identical_description && (
                        <div className="text-orange-600">⚠️ Identical descriptions found</div>
                      )}
                      {selectedLog.fraud_flags.unusual_hours && (
                        <div className="text-orange-600">⚠️ Unusual work hours</div>
                      )}
                      {selectedLog.fraud_flags.missing_evidence && (
                        <div className="text-yellow-600">⚠️ Missing evidence for technical tasks</div>
                      )}
                      {selectedLog.fraud_flags.suspicious_pattern && (
                        <div className="text-yellow-600">⚠️ Suspicious submission pattern</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Log Content */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Date & Time</h4>
                    <p className="text-gray-600">
                      {new Date(selectedLog.entry_date).toLocaleDateString()} | 
                      {formatDuration(selectedLog.start_time, selectedLog.end_time)}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Task Title</h4>
                    <p className="text-gray-600">{selectedLog.task_title}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Task Description</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedLog.task_description}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Skills Learned</h4>
                    <p className="text-gray-600">{selectedLog.skills_learned}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Tools Used</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedLog.tools_used.map((tool, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedLog.challenges_faced && (
                    <div>
                      <h4 className="font-medium text-gray-900">Challenges Faced</h4>
                      <p className="text-gray-600">{selectedLog.challenges_faced}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedLog.attachments.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900">Evidence Files</h4>
                      <div className="space-y-2 mt-2">
                        {selectedLog.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <span>📎</span>
                              <span className="text-sm">{attachment.filename}</span>
                              {attachment.geotag && (
                                <span className="text-xs text-green-600">📍 Location tagged</span>
                              )}
                            </div>
                            <a
                              href={`http://localhost:5000${attachment.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-800 text-sm"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audit Trail */}
                  <div>
                    <h4 className="font-medium text-gray-900">Audit Trail</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                      <p><strong>Created:</strong> {new Date(selectedLog.audit_trail.created_at).toLocaleString()}</p>
                      <p><strong>IP:</strong> {selectedLog.audit_trail.created_ip}</p>
                      {selectedLog.audit_trail.submitted_at && (
                        <p><strong>Submitted:</strong> {new Date(selectedLog.audit_trail.submitted_at).toLocaleString()}</p>
                      )}
                      {selectedLog.blockchain_hash && (
                        <p><strong>Blockchain Hash:</strong> {selectedLog.blockchain_hash.substring(0, 16)}...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedLog.status === 'submitted' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openReviewModal(selectedLog, 'approve')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openReviewModal(selectedLog, 'reject')}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => openReviewModal(selectedLog, 'revision')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                    >
                      Request Revision
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Review Action Modal */}
        {showReviewModal && selectedLog && reviewAction && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {reviewAction === 'approve' ? 'Approve Entry' : 
                   reviewAction === 'reject' ? 'Reject Entry' : 
                   'Request Revision'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  "{selectedLog.task_title}" - {selectedLog.student_id.matriculation_number}
                </p>
              </div>

              <div className="px-6 py-6">
                {reviewAction === 'reject' && (
                  <div>
                    <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason *
                    </label>
                    <textarea
                      id="rejection_reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Explain why this entry is being rejected..."
                    />
                  </div>
                )}

                {reviewAction === 'revision' && (
                  <div>
                    <label htmlFor="revision_instructions" className="block text-sm font-medium text-gray-700 mb-2">
                      Revision Instructions *
                    </label>
                    <textarea
                      id="revision_instructions"
                      value={revisionInstructions}
                      onChange={(e) => setRevisionInstructions(e.target.value)}
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Specify what needs to be revised..."
                    />
                  </div>
                )}

                {reviewAction === 'approve' && selectedLog.fraud_flags.risk_score >= 40 && (
                  <div className="bg-red-50 p-3 rounded-md">
                    <p className="text-sm text-red-800">
                      <strong>Warning:</strong> This entry has a high fraud risk score ({selectedLog.fraud_flags.risk_score}/100). 
                      Are you sure you want to approve it?
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewAction(null);
                    setRejectionReason('');
                    setRevisionInstructions('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewAction}
                  disabled={submitting || (reviewAction === 'reject' && !rejectionReason.trim()) || (reviewAction === 'revision' && !revisionInstructions.trim())}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 
                   reviewAction === 'approve' ? 'Approve' : 
                   reviewAction === 'reject' ? 'Reject' : 
                   'Request Revision'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
