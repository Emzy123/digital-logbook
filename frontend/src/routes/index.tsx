import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Layout from '../components/common/Layout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import StudentDashboard from '../pages/StudentDashboard';
import LogEntryForm from '../pages/LogEntryForm';
import SupervisorDashboard from '../pages/SupervisorDashboard';
import LogReviewDashboard from '../pages/LogReviewDashboard';
import WeeklySummaryView from '../pages/WeeklySummaryView';
import AdminDashboard from '../pages/AdminDashboard';
import AnalyticsDashboard from '../pages/AnalyticsDashboard';
import Profile from '../pages/Profile';
import CompanyRequestForm from '../pages/CompanyRequestForm';
import CompanyRequestsDashboard from '../pages/CompanyRequestsDashboard';
import SupervisorAssignmentDashboard from '../pages/SupervisorAssignmentDashboard';
import IndustrySupervisorAssessment from '../pages/IndustrySupervisorAssessment';
import SchoolSupervisorGrading from '../pages/SchoolSupervisorGrading';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    // All authenticated routes
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          // Student routes
          {
            element: <ProtectedRoute allowedRoles={['student']} />,
            children: [
              { path: '/dashboard', element: <StudentDashboard /> },
              { path: '/logs/new', element: <LogEntryForm /> },
              { path: '/logs/:id/edit', element: <LogEntryForm /> },
              { path: '/weekly-summaries', element: <WeeklySummaryView /> },
              { path: '/profile', element: <Profile /> },
              { path: '/company-request', element: <CompanyRequestForm /> },
            ]
          },
          // Supervisor routes
          {
            element: <ProtectedRoute allowedRoles={['industry_supervisor', 'school_supervisor']} />,
            children: [
              { path: '/supervisor-dashboard', element: <SupervisorDashboard /> },
              { path: '/supervisors/students/:studentId/logs', element: <LogReviewDashboard /> },
              { path: '/supervisors/students/:studentId/assessment', element: <IndustrySupervisorAssessment /> },
              { path: '/supervisors/students/:studentId/grading', element: <SchoolSupervisorGrading /> },
            ]
          },
          // Admin routes
          {
            element: <ProtectedRoute allowedRoles={['system_admin', 'itf_admin', 'coordinator']} />,
            children: [
              { path: '/admin-dashboard', element: <AdminDashboard /> },
              { path: '/analytics', element: <AnalyticsDashboard /> },
              { path: '/company-requests', element: <CompanyRequestsDashboard /> },
              { path: '/supervisor-assignments', element: <SupervisorAssignmentDashboard /> },
            ]
          },
        ]
      }
    ]
  }
]);
