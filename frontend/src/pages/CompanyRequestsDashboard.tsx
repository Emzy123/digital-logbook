import { useEffect, useState } from 'react';
import api from '../services/api';

interface CompanyRequest {
  _id: string;
  company_name: string;
  address: string;
  city: string;
  state: string;
  nature_of_business: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  company_website?: string;
  company_size?: string;
  reasoning?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  student_id?: {
    _id: string;
    matriculation_number: string;
  };
  reviewed_by?: {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CompanyRequestsDashboard() {
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CompanyRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    rejection_reason: '',
    admin_notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/company-requests', { params });
      setRequests(response.data.requests);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch company requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      await api.patch(`/company-requests/${selectedRequest._id}/review`, reviewData);
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewData({ status: '', rejection_reason: '', admin_notes: '' });
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to review request');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (request: CompanyRequest) => {
    setSelectedRequest(request);
    setReviewData({
      status: request.status,
      rejection_reason: request.rejection_reason || '',
      admin_notes: request.admin_notes || ''
    });
    setShowReviewModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'needs_info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Company Requests</h1>
          <p className="mt-2 text-gray-600">Review and manage new company requests from students</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Filter Requests</h3>
              <div className="flex space-x-2">
                {['all', 'pending', 'approved', 'rejected', 'needs_info'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      filter === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No company requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.company_name}</div>
                          <div className="text-sm text-gray-500">{request.nature_of_business}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {request.student_id?.matriculation_number || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {request.city}, {request.state}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openReviewModal(request)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Modal */}
        {showReviewModal && selectedRequest && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Review Company Request</h2>
              </div>

              <div className="px-6 py-6">
                {/* Company Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Company Name:</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.company_name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Address:</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.address}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Location:</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.city}, {selectedRequest.state}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Business Type:</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.nature_of_business}</dd>
                      </div>
                      {selectedRequest.company_website && (
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Website:</dt>
                          <dd className="text-sm text-gray-900">{selectedRequest.company_website}</dd>
                        </div>
                      )}
                      {selectedRequest.company_size && (
                        <div className="flex justify-between">
                          <dt className="text-sm font-medium text-gray-500">Size:</dt>
                          <dd className="text-sm text-gray-900">{selectedRequest.company_size}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Contact Person:</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.contact_person}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Phone:</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.contact_phone}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Email:</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.contact_email}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Student:</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.student_id?.matriculation_number}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Submitted:</dt>
                        <dd className="text-sm text-gray-900">{new Date(selectedRequest.createdAt).toLocaleDateString()}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {selectedRequest.reasoning && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Student's Reasoning</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-md">{selectedRequest.reasoning}</p>
                  </div>
                )}

                {/* Review Form */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Decision *
                    </label>
                    <select
                      id="status"
                      value={reviewData.status}
                      onChange={(e) => setReviewData({ ...reviewData, status: e.target.value, rejection_reason: '' })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Decision</option>
                      <option value="approved">Approve</option>
                      <option value="rejected">Reject</option>
                      <option value="needs_info">Request More Information</option>
                    </select>
                  </div>

                  {reviewData.status === 'rejected' && (
                    <div>
                      <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason *
                      </label>
                      <textarea
                        id="rejection_reason"
                        value={reviewData.rejection_reason}
                        onChange={(e) => setReviewData({ ...reviewData, rejection_reason: e.target.value })}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Explain why this request is being rejected..."
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="admin_notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes
                    </label>
                    <textarea
                      id="admin_notes"
                      value={reviewData.admin_notes}
                      onChange={(e) => setReviewData({ ...reviewData, admin_notes: e.target.value })}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Add any internal notes..."
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-4">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={!reviewData.status || submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
