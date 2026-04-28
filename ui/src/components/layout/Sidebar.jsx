import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Webhook, 
  ArrowDownCircle, 
  Briefcase, 
  Clock, 
  Network, 
  Bell, 
  Settings,
  LogOut,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/events', icon: Zap, label: 'Events' },
  { to: '/inbound', icon: ArrowDownCircle, label: 'Inbound' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/scheduler', icon: Clock, label: 'Scheduler' },
  { to: '/gateway', icon: Network, label: 'Gateway' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-devrelay-surface border-r border-devrelay-border flex flex-col">
      <div className="p-4 border-b border-devrelay-border">
        <h1 className="text-xl font-bold text-devrelay-green">DevRelay</h1>
      </div>

      <div className="p-4 border-b border-devrelay-border">
        <WorkspaceSwitcher />
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-devrelay-text-dim hover:text-devrelay-text hover:bg-devrelay-surface2 transition-colors ${
                isActive ? 'text-devrelay-green bg-devrelay-surface2 border-r-2 border-devrelay-green' : ''
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-devrelay-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-devrelay-green/20 flex items-center justify-center text-devrelay-green font-medium">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-devrelay-text truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-devrelay-text-dim truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-devrelay-text-dim hover:text-devrelay-red transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}