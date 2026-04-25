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
                  <Route path="/jobs" element={<div className="p-8 text-devrelay-text">Jobs</div>} />
                  <Route path="/scheduler" element={<div className="p-8 text-devrelay-text">Scheduler</div>} />
                  <Route path="/gateway" element={<div className="p-8 text-devrelay-text">Gateway</div>} />
                  <Route path="/alerts" element={<div className="p-8 text-devrelay-text">Alerts</div>} />
                  <Route path="/settings" element={<div className="p-8 text-devrelay-text">Settings</div>} />
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