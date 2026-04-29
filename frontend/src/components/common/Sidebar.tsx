
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  handleLogout: () => void;
}

const allNavItems = [
  { name: 'Dashboard', path: '/dashboard', roles: ['student'] },
  { name: 'New Log Entry', path: '/logs/new', roles: ['student'] },
  { name: 'Weekly Summaries', path: '/weekly-summaries', roles: ['student'] },
  { name: 'My Profile', path: '/profile', roles: ['student'] },
  { name: 'Supervisor Dashboard', path: '/supervisor-dashboard', roles: ['industry_supervisor', 'school_supervisor'] },
  { name: 'Admin Console', path: '/admin-dashboard', roles: ['system_admin', 'itf_admin'] },
  { name: 'Analytics', path: '/analytics', roles: ['system_admin', 'itf_admin'] },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen, handleLogout }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = allNavItems.filter(item =>
    !user || item.roles.includes(user.role)
  );

  const content = (
    <div className="flex flex-col h-full bg-primary-900 text-white shadow-xl">
      <div className="flex items-center justify-center h-16 bg-primary-950 px-4 border-b border-primary-800">
        <span className="text-2xl font-bold tracking-wider">SIWES <span className="font-light">Digital</span></span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-2">
        {navItems.map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`block px-4 py-3 rounded-md transition-colors font-medium ${active ? 'bg-primary-700 text-white shadow' : 'text-primary-100 hover:bg-primary-800'}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="p-4 bg-primary-950">
        <button 
          onClick={handleLogout}
          className="w-full text-left px-4 py-3 text-primary-100 hover:bg-primary-800 rounded-md transition-colors font-medium"
        >
           Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-primary-900">
            {content}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-primary-800">
           {content}
        </div>
      </div>
    </>
  );
}
