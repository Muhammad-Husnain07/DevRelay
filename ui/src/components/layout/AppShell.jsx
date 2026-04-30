import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { createWorkspace, listWorkspaces } from '../../api/resources/workspaces';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SlideOver from '../ui/SlideOver';
import Sidebar from './Sidebar';

export default function AppShell() {
const { isAuthenticated, isLoading, setWorkspaces } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '' });

  useEffect(() => {
    const handler = () => setCreateOpen(true);
    window.addEventListener('open-create-workspace', handler);
    return () => window.removeEventListener('open-create-workspace', handler);
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => createWorkspace(data),
    onSuccess: async () => {
      queryClient.invalidateQueries(['workspaces']);
      // Fetch latest workspaces and update auth context
      const { data: wsData } = await listWorkspaces();
      setWorkspaces(wsData.workspaces || wsData);
      setCreateOpen(false);
      setForm({ name: '' });
      alert('Workspace created!');
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to create workspace')
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-devrelay-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-devrelay-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-devrelay-bg flex">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Outlet />
      </main>

      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Create Workspace">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              placeholder="My Workspace"
            />
          </div>
          <button
            onClick={() => createMutation.mutate({ name: form.name })}
            disabled={createMutation.isPending || !form.name}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </SlideOver>
    </div>
  );
}