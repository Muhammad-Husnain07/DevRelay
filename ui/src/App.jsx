import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toaster from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { SocketProvider } from './context/SocketContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import WebhookList from './pages/webhooks';
import InboundList from './pages/inbound';
import InboundDetail from './pages/inbound/detail';
import JobList from './pages/jobs';
import JobDetail from './pages/jobs/detail';
import SchedulerList from './pages/scheduler';
import SchedulerDetail from './pages/scheduler/detail';
import Gateway from './pages/gateway';
import Alerts from './pages/alerts';
import SettingsLayout from './pages/settings/Layout';
import GeneralSettings from './pages/settings/General';
import MembersSettings from './pages/settings/Members';
import ApiKeysSettings from './pages/settings/ApiKeys';
import NotificationsSettings from './pages/settings/Notifications';
import DangerZoneSettings from './pages/settings/DangerZone';
import './index.css';
import { useSocketEvent } from './hooks/useSocket';
import toast from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function SocketToasts() {
  useSocketEvent('delivery:failed', (payload) => {
    toast.error(`Delivery failed to ${payload.endpoint}`, { duration: 5000 });
  });
  useSocketEvent('alert:fired', (payload) => {
    toast.error(`Alert: ${payload.ruleName}`, { duration: 8000 });
  });
  useSocketEvent('job:failed', (payload) => {
    toast.error(`Job ${payload.name} failed`, { duration: 5000 });
  });
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <SocketProvider>
              <SocketToasts />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/webhooks" element={<WebhookList />} />
                  <Route path="/inbound" element={<InboundList />} />
                  <Route path="/inbound/:slug" element={<InboundDetail />} />
                  <Route path="/jobs" element={<JobList />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route path="/scheduler" element={<SchedulerList />} />
                  <Route path="/scheduler/:id" element={<SchedulerDetail />} />
                  <Route path="/gateway" element={<Gateway />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<GeneralSettings />} />
                    <Route path="members" element={<MembersSettings />} />
                    <Route path="api-keys" element={<ApiKeysSettings />} />
                    <Route path="notifications" element={<NotificationsSettings />} />
                    <Route path="danger" element={<DangerZoneSettings />} />
                  </Route>
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </SocketProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
      <Toaster 
        position="bottom-right"
        toastClassName="bg-devrelay-surface border text-devrelay-text"
        style={{ background: '#0d1a22', color: '#e2e8f0' }}
      />
    </QueryClientProvider>
  );
}