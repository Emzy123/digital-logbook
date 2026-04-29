import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface AssessmentCriterion {
  _id: string;
  code: string;
  title: string;
  description: string;
  max_score: number;
  weight: number;
  category: string;
  scoring_guide: {
    excellent: string;
    good: string;
    satisfactory: string;
    needs_improvement: string;
    poor: string;
  };
}

interface AssessmentScore {
  criterion_id: string;
  score: number;
  max_score: number;
  weight: number;
  comments: string;
  evidence_references: string[];
}

interface StudentProfile {
  _id: string;
  matriculation_number: string;
  user_id: {
    first_name: string;
    last_name: string;
    email: string;
  };
  establishment_id: {
    name: string;
    city: string;
    state: string;
  };
}

interface LogEntry {
  _id: string;
  entry_date: string;
  task_title: string;
  task_description: string;
  total_hours: number;
  skills_learned: string;
  tools_used: string[];
}

export default function IndustrySupervisorAssessment() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const [criteria, setCriteria] = useState<AssessmentCriterion[]>([]);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [overallComments, setOverallComments] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [areasForImprovement, setAreasForImprovement] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<{[key: string]: string[]}>({});
  const [totalScore, setTotalScore] = useState(0);
  const [weightedTotal, setWeightedTotal] = useState(0);
  const [maxPossibleScore, setMaxPossibleScore] = useState(0);

  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [semester, setSemester] = useState(new Date().getMonth() >= 7 ? 'Second' : 'First');

  useEffect(() => {
    if (studentId) {
      fetchAssessmentData();
    }
  }, [studentId]);

  useEffect(() => {
    calculateTotals();
  }, [scores]);

  const fetchAssessmentData = async () => {
    try {
      setLoading(true);
      
      // Fetch assessment rubric
      const rubricResponse = await api.get('/assessments/rubric?assessment_type=industry_supervisor');
      setCriteria(rubricResponse.data);

      // Fetch student profile
      const studentResponse = await api.get(`/supervisor-assignments/students/${studentId}`);
      setStudent(studentResponse.data.studentProfile);

      // Fetch student's log entries
      const logsResponse = await api.get(`/supervisor-assignments/students/${studentId}/logs`);
      setLogEntries(logsResponse.data.logs || []);

      // Initialize scores
      const initialScores = rubricResponse.data.map((criterion: AssessmentCriterion) => ({
        criterion_id: criterion._id,
        score: 0,
        max_score: criterion.max_score,
        weight: criterion.weight,
        comments: '',
        evidence_references: []
      }));
      setScores(initialScores);

    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let total = 0;
    let weighted = 0;
    let maxScore = 0;

    scores.forEach(score => {
      total += score.score;
      weighted += (score.score / score.max_score) * score.weight;
      maxScore += score.max_score;
    });

    setTotalScore(total);
    setWeightedTotal(weighted);
    setMaxPossibleScore(maxScore);
  };

  const handleScoreChange = (criterionId: string, score: number) => {
    setScores(prev => prev.map(s => 
      s.criterion_id === criterionId ? { ...s, score } : s
    ));
  };

  const handleCommentChange = (criterionId: string, comments: string) => {
    setScores(prev => prev.map(s => 
      s.criterion_id === criterionId ? { ...s, comments } : s
    ));
  };

  const handleEvidenceToggle = (criterionId: string, logId: string) => {
    setSelectedEvidence(prev => {
      const current = prev[criterionId] || [];
      const updated = current.includes(logId)
        ? current.filter(id => id !== logId)
        : [...current, logId];
      
      return { ...prev, [criterionId]: updated };
    });

    // Update scores with evidence references
    setScores(prev => prev.map(s => {
      if (s.criterion_id === criterionId) {
        const current = selectedEvidence[criterionId] || [];
        const updated = current.includes(logId)
          ? current.filter(id => id !== logId)
          : [...current, logId];
        
        return { ...s, evidence_references: updated };
      }
      return s;
    }));
  };

  const addStrength = () => {
    if (strengths.length < 5) {
      setStrengths([...strengths, '']);
    }
  };

  const updateStrength = (index: number, value: string) => {
    setStrengths(prev => prev.map((s, i) => i === index ? value : s));
  };

  const removeStrength = (index: number) => {
    setStrengths(prev => prev.filter((_, i) => i !== index));
  };

  const addAreaForImprovement = () => {
    if (areasForImprovement.length < 5) {
      setAreasForImprovement([...areasForImprovement, '']);
    }
  };

  const updateAreaForImprovement = (index: number, value: string) => {
    setAreasForImprovement(prev => prev.map((a, i) => i === index ? value : a));
  };

  const removeAreaForImprovement = (index: number) => {
    setAreasForImprovement(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    // Check if all criteria are scored
    const unscoredCriteria = criteria.filter(criterion => {
      const score = scores.find(s => s.criterion_id === criterion._id);
      return !score || score.score === 0;
    });

    if (unscoredCriteria.length > 0) {
      errors.push('All criteria must be scored');
    }

    // Check for comments on low scores
    const lowScores = scores.filter(s => s.score < (s.max_score * 0.5) && !s.comments.trim());
    if (lowScores.length > 0) {
      errors.push('Comments required for scores below 50%');
    }

    // Check overall comments
    if (!overallComments.trim()) {
      errors.push('Overall comments are required');
    }

    return errors;
  };

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      setError('');

      const assessmentData = {
        student_id: studentId,
        assessment_type: 'industry_supervisor',
        academic_year: academicYear,
        semester: semester,
        scores: scores.map(s => ({
          ...s,
          evidence_references: selectedEvidence[s.criterion_id] || []
        })),
        overallComments,
        strengths: strengths.filter(s => s.trim()),
        areas_for_improvement: areasForImprovement.filter(a => a.trim()),
        recommendations
      };

      await api.post('/assessments', assessmentData);
      setSuccess(true);
      setTimeout(() => navigate('/industry-supervisor/dashboard'), 2000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const assessmentData = {
        student_id: studentId,
        assessment_type: 'industry_supervisor',
        academic_year: academicYear,
        semester: semester,
        scores: scores.map(s => ({
          ...s,
          evidence_references: selectedEvidence[s.criterion_id] || []
        })),
        overallComments,
        strengths: strengths.filter(s => s.trim()),
        areas_for_improvement: areasForImprovement.filter(a => a.trim()),
        recommendations
      };

      const response = await api.post('/assessments', assessmentData);
      
      // Submit the assessment
      await api.post(`/assessments/${response.data._id}/submit`);
      
      setSuccess(true);
      setTimeout(() => navigate('/industry-supervisor/dashboard'), 2000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Satisfactory';
    if (percentage >= 20) return 'Needs Improvement';
    return 'Poor';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Saved!</h2>
          <p className="text-gray-600 mb-4">Assessment has been saved successfully.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Industry Supervisor Assessment</h1>
                <p className="text-gray-600 mt-1">
                  {student ? `${student.user_id.first_name} ${student.user_id.last_name} - ${student.matriculation_number}` : ''}
                </p>
                {student?.establishment_id && (
                  <p className="text-sm text-gray-500">
                    {student.establishment_id.name}, {student.establishment_id.city}, {student.establishment_id.state}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="mt-1 block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                  >
                    <option value="First">First</option>
                    <option value="Second">Second</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Score Summary */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-2xl font-bold text-gray-900">{totalScore}/{maxPossibleScore}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weighted Score</p>
                <p className="text-2xl font-bold text-primary-600">{weightedTotal.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Performance Level</p>
                <p className={`text-2xl font-bold ${getScoreColor(weightedTotal, 100)}`}>
                  {getScoreLabel(weightedTotal, 100)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {/* Assessment Criteria */}
        <div className="bg-white shadow-lg rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Assessment Criteria</h2>
          </div>
          <div className="px-6 py-6 space-y-8">
            {criteria.map((criterion) => {
              const score = scores.find(s => s.criterion_id === criterion._id);
              const selectedLogs = selectedEvidence[criterion._id] || [];
              
              return (
                <div key={criterion._id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {criterion.code}: {criterion.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <span className="mr-4">Max Score: {criterion.max_score}</span>
                        <span className="mr-4">Weight: {criterion.weight}%</span>
                        <span className={`font-medium ${getScoreColor(score?.score || 0, criterion.max_score)}`}>
                          Current: {score?.score || 0}/{criterion.max_score}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scoring Guide */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Scoring Guide:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div><span className="font-medium text-green-600">Excellent:</span> {criterion.scoring_guide.excellent}</div>
                      <div><span className="font-medium text-blue-600">Good:</span> {criterion.scoring_guide.good}</div>
                      <div><span className="font-medium text-yellow-600">Satisfactory:</span> {criterion.scoring_guide.satisfactory}</div>
                      <div><span className="font-medium text-orange-600">Needs Improvement:</span> {criterion.scoring_guide.needs_improvement}</div>
                      <div className="md:col-span-2"><span className="font-medium text-red-600">Poor:</span> {criterion.scoring_guide.poor}</div>
                    </div>
                  </div>

                  {/* Score Input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Score (0-{criterion.max_score})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={criterion.max_score}
                        value={score?.score || 0}
                        onChange={(e) => handleScoreChange(criterion._id, parseInt(e.target.value) || 0)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comments
                      </label>
                      <textarea
                        rows={3}
                        value={score?.comments || ''}
                        onChange={(e) => handleCommentChange(criterion._id, e.target.value)}
                        placeholder="Provide specific feedback..."
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Evidence References */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supporting Evidence (Log Entries)
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {logEntries.map((log) => (
                        <div key={log._id} className="flex items-start mb-2 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            id={`evidence-${criterion._id}-${log._id}`}
                            checked={selectedLogs.includes(log._id)}
                            onChange={() => handleEvidenceToggle(criterion._id, log._id)}
                            className="mt-1 mr-2 text-primary-600 focus:ring-primary-500"
                          />
                          <label htmlFor={`evidence-${criterion._id}-${log._id}`} className="flex-1 cursor-pointer">
                            <div className="text-sm">
                              <span className="font-medium">{log.task_title}</span>
                              <span className="text-gray-500 ml-2">
                                {new Date(log.entry_date).toLocaleDateString()} - {log.total_hours}h
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {log.task_description}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall Assessment */}
        <div className="bg-white shadow-lg rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Overall Assessment</h2>
          </div>
          <div className="px-6 py-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Comments *
              </label>
              <textarea
                rows={4}
                value={overallComments}
                onChange={(e) => setOverallComments(e.target.value)}
                placeholder="Provide comprehensive feedback on the student's overall performance..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strengths
              </label>
              {strengths.map((strength, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={strength}
                    onChange={(e) => updateStrength(index, e.target.value)}
                    placeholder="Enter a strength..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeStrength(index)}
                    className="ml-2 px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {strengths.length < 5 && (
                <button
                  type="button"
                  onClick={addStrength}
                  className="mt-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Add Strength
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Areas for Improvement
              </label>
              {areasForImprovement.map((area, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => updateAreaForImprovement(index, e.target.value)}
                    placeholder="Enter an area for improvement..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeAreaForImprovement(index)}
                    className="ml-2 px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {areasForImprovement.length < 5 && (
                <button
                  type="button"
                  onClick={addAreaForImprovement}
                  className="mt-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Add Area for Improvement
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommendations
              </label>
              <textarea
                rows={3}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Provide recommendations for future development..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={submitting}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}
