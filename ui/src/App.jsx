import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-hot-toast';
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
import Settings from './pages/settings';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <SocketProvider>
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
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </SocketProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
      <ToastContainer
        position="bottom-right"
        toastClassName="bg-devrelay-surface border border-devrelay-border text-devrelay-text"
      />
    </QueryClientProvider>
  );
}