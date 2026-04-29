import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="inline-block animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to the appropriate dashboard for the user's role
    const roleHome: Record<string, string> = {
      student: '/dashboard',
      industry_supervisor: '/supervisor-dashboard',
      school_supervisor: '/supervisor-dashboard',
      system_admin: '/admin-dashboard',
      itf_admin: '/admin-dashboard',
      coordinator: '/admin-dashboard',
    };
    return <Navigate to={roleHome[user.role] || '/dashboard'} replace />;
  }

  return <Outlet />;
}
