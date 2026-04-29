import { useEffect, useState } from 'react';
import api from '../services/api';

interface Student {
  _id: string;
  matriculation_number: string;
  user_id: {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  establishment_id: {
    _id: string;
    name: string;
  };
}

interface Supervisor {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Assignment {
  _id: string;
  student_id: {
    _id: string;
    matriculation_number: string;
  };
  industry_supervisor_id?: {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  school_supervisor_id?: {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  assignment_date: string;
  is_active: boolean;
}

export default function SupervisorAssignmentDashboard() {
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [industrySupervisors, setIndustrySupervisors] = useState<Supervisor[]>([]);
  const [schoolSupervisors, setSchoolSupervisors] = useState<Supervisor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    industry_supervisor_id: '',
    school_supervisor_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, industryRes, schoolRes, assignmentsRes] = await Promise.all([
        api.get('/supervisor-assignments/unassigned-students'),
        api.get('/supervisor-assignments/available-supervisors?supervisor_type=industry'),
        api.get('/supervisor-assignments/available-supervisors?supervisor_type=school'),
        api.get('/supervisor-assignments')
      ]);

      setUnassignedStudents(studentsRes.data);
      setIndustrySupervisors(industryRes.data);
      setSchoolSupervisors(schoolRes.data);
      setAssignments(assignmentsRes.data.assignments);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedStudent) return;

    setSubmitting(true);
    try {
      await api.post('/supervisor-assignments', {
        student_id: selectedStudent._id,
        industry_supervisor_id: assignmentForm.industry_supervisor_id || undefined,
        school_supervisor_id: assignmentForm.school_supervisor_id || undefined
      });

      setShowAssignmentModal(false);
      setSelectedStudent(null);
      setAssignmentForm({ industry_supervisor_id: '', school_supervisor_id: '' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignmentModal = (student: Student) => {
    setSelectedStudent(student);
    setShowAssignmentModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading supervisor assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Supervisor Assignments</h1>
          <p className="mt-2 text-gray-600">Manage supervisor assignments for SIWES students</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Unassigned Students */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Unassigned Students</h2>
              <p className="text-sm text-gray-500">Students with approved placements but no supervisors</p>
            </div>
            <div className="overflow-hidden">
              {unassignedStudents.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No unassigned students found
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {unassignedStudents.map((student) => (
                    <div key={student._id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {student.user_id.first_name} {student.user_id.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{student.matriculation_number}</p>
                          <p className="text-sm text-gray-500">{student.establishment_id.name}</p>
                        </div>
                        <button
                          onClick={() => openAssignmentModal(student)}
                          className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-900 bg-primary-50 rounded-md"
                        >
                          Assign Supervisors
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Assignments</h2>
              <p className="text-sm text-gray-500">Latest supervisor assignments</p>
            </div>
            <div className="overflow-hidden">
              {assignments.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No assignments found
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {assignments.slice(0, 5).map((assignment) => (
                    <div key={assignment._id} className="px-6 py-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900">
                          {assignment.student_id.matriculation_number}
                        </p>
                        <div className="text-sm text-gray-500 space-y-1">
                          {assignment.industry_supervisor_id && (
                            <div>
                              <span className="font-medium">Industry:</span> {assignment.industry_supervisor_id.first_name} {assignment.industry_supervisor_id.last_name}
                            </div>
                          )}
                          {assignment.school_supervisor_id && (
                            <div>
                              <span className="font-medium">School:</span> {assignment.school_supervisor_id.first_name} {assignment.school_supervisor_id.last_name}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          Assigned: {new Date(assignment.assignment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Modal */}
        {showAssignmentModal && selectedStudent && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Assign Supervisors</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStudent.user_id.first_name} {selectedStudent.user_id.last_name} ({selectedStudent.matriculation_number})
                </p>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div>
                  <label htmlFor="industry_supervisor" className="block text-sm font-medium text-gray-700 mb-2">
                    Industry Supervisor (Optional)
                  </label>
                  <select
                    id="industry_supervisor"
                    value={assignmentForm.industry_supervisor_id}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, industry_supervisor_id: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Industry Supervisor</option>
                    {industrySupervisors.map((supervisor) => (
                      <option key={supervisor._id} value={supervisor._id}>
                        {supervisor.first_name} {supervisor.last_name} - {supervisor.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="school_supervisor" className="block text-sm font-medium text-gray-700 mb-2">
                    School Supervisor (Optional)
                  </label>
                  <select
                    id="school_supervisor"
                    value={assignmentForm.school_supervisor_id}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, school_supervisor_id: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select School Supervisor</option>
                    {schoolSupervisors.map((supervisor) => (
                      <option key={supervisor._id} value={supervisor._id}>
                        {supervisor.first_name} {supervisor.last_name} - {supervisor.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> At least one supervisor should be assigned. Students can start logging activities once supervisors are assigned.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-4">
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssignment}
                  disabled={!assignmentForm.industry_supervisor_id && !assignmentForm.school_supervisor_id || submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Assigning...' : 'Assign Supervisors'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
