import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Settings as SettingsIcon, 
  Users, 
  Key, 
  Bell, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

const tabs = [
  { key: 'general', label: 'General', icon: SettingsIcon, path: '/settings' },
  { key: 'members', label: 'Members', icon: Users, path: '/settings/members' },
  { key: 'api-keys', label: 'API Keys', icon: Key, path: '/settings/api-keys' },
  { key: 'notifications', label: 'Notifications', icon: Bell, path: '/settings/notifications' },
  { key: 'danger', label: 'Danger Zone', icon: AlertTriangle, path: '/settings/danger' }
];

function NavItem({ tab, isActive }) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-devrelay-green/10 text-devrelay-green border border-devrelay-green/20' 
          : 'text-devrelay-text-dim hover:bg-devrelay-surface2 hover:text-devrelay-text'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{tab.label}</span>
      <ChevronRight className="w-4 h-4 ml-auto" />
    </Link>
  );
}

export default function SettingsLayout() {
  const location = useLocation();
  const isRoot = location.pathname === '/settings';
  
  const currentTab = tabs.find(t => t.path === location.pathname) || tabs[0];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-devrelay-text mb-2">Settings</h1>
      <p className="text-devrelay-text-dim mb-6">Manage your workspace and preferences</p>
      
      {isRoot && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className="flex items-center gap-4 p-6 bg-devrelay-surface border border-devrelay-border rounded-lg hover:border-devrelay-green/50 transition-colors"
              >
                <div className="p-3 bg-devrelay-surface2 rounded-lg">
                  <Icon className="w-6 h-6 text-devrelay-green" />
                </div>
                <div>
                  <h3 className="font-medium text-devrelay-text">{tab.label}</h3>
                  <p className="text-sm text-devrelay-text-dim">
                    {tab.key === 'general' && 'Workspace name, slug, plan'}
                    {tab.key === 'members' && 'Manage team members'}
                    {tab.key === 'api-keys' && 'Generate and manage API keys'}
                    {tab.key === 'notifications' && 'Alert preferences'}
                    {tab.key === 'danger' && 'Delete workspace'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      
      {isRoot && (
        <div className="mt-8">
          <Outlet />
        </div>
      )}
      
      {!isRoot && (
        <div className="flex gap-8">
          <nav className="w-64 shrink-0 space-y-1">
            {tabs.slice(1).map(tab => (
              <NavItem 
                key={tab.key} 
                tab={tab} 
                isActive={location.pathname === tab.path} 
              />
            ))}
          </nav>
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      )}
    </div>
  );
}