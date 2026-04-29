import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../../services/api';
import { Menu } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchNotifications();
    // Setup basic polling for notifications every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
    } catch (error) {}
  };

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };



  const markAsRead = async (id: string) => {
    try {
        await api.put(`/notifications/${id}/read`);
        fetchNotifications();
    } catch(e) {}
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          {/* Mobile sidebar toggle button */}
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-bold text-gray-900 hidden md:block tracking-tight text-primary-900">SIWES Digital Logbook</h1>
            </div>
            <div className="ml-4 flex items-center gap-3 md:ml-6">
              {user && (
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {user.role.replace(/_/g, ' ')}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 uppercase tracking-wider">
                    {user.role.includes('admin') || user.role === 'coordinator' ? '🛡️ Admin' : user.role.includes('supervisor') ? '👤 Supervisor' : '🎓 Student'}
                  </span>
                </div>
              )}

              
              {/* Notifications dropdown */}
              <Menu as="div" className="ml-3 relative">
                <div>
                  <Menu.Button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 relative transition-colors">
                    <span className="sr-only">View notifications</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-white">
                            {unreadCount}
                        </span>
                    )}
                  </Menu.Button>
                </div>
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-80 rounded-xl shadow-2xl py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden z-50">
                   <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                       <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Notifications</h3>
                       {unreadCount > 0 && (
                           <button onClick={() => api.put('/notifications/mark-all-read').then(fetchNotifications)} className="text-xs font-medium text-primary-600 hover:text-primary-800 transition">Mark all read</button>
                       )}
                   </div>
                   <div className="max-h-96 overflow-y-auto">
                     {notifications.length === 0 ? (
                         <div className="px-4 py-8 text-center text-sm text-gray-500">You have no notifications.</div>
                     ) : (
                         notifications.map((n: any) => (
                             <Menu.Item key={n._id}>
                                 {({ active }: { active: boolean }) => (
                                     <div onClick={() => markAsRead(n._id)} className={`px-4 py-4 border-b border-gray-50 cursor-pointer transition ${active ? 'bg-gray-50' : ''} ${!n.is_read ? 'bg-primary-50/30 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'}`}>
                                         <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                                         <p className={`text-sm mt-1 ${!n.is_read ? 'text-gray-600' : 'text-gray-500'}`}>{n.message}</p>
                                         <p className="text-xs text-gray-400 mt-2 font-medium">{new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                                     </div>
                                 )}
                             </Menu.Item>
                         ))
                     )}
                   </div>
                </Menu.Items>
              </Menu>

            </div>
          </div>
        </div>
        
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
