import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { createInbound } from '../../api/resources/events';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/ui/Spinner';

export default function InboundNew() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    events: ['*'],
    isActive: true
  });
  const [slugError, setSlugError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => createInbound(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inbound']);
      toast.success('Inbound webhook created');
      navigate('/inbound');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.slug) return;
    createMutation.mutate(form);
  };

  const handleSlugChange = (e) => {
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);
    setForm({ ...form, slug });
    setSlugError('');
  };

  if (!workspace) {
    return <div className="p-8"><Spinner /></div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-devrelay-text mb-6">Create Inbound Webhook</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-devrelay-text-dim mb-2">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., GitHub, Stripe, Slack"
            className="w-full bg-devrelay-surface border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-devrelay-text-dim mb-2">Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-devrelay-text-dim">/receive/</span>
            <input
              type="text"
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="github-webhook"
              className="flex-1 bg-devrelay-surface border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              required
            />
          </div>
          <p className="text-xs text-devrelay-text-dim mt-1">URL: /receive/{form.slug || 'your-slug'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-devrelay-text-dim mb-2">Events</label>
          <input
            type="text"
            value={form.events.join(', ')}
            onChange={(e) => setForm({ ...form, events: e.target.value.split(',').map(e => e.trim()) })}
            placeholder="*, push, pull_request"
            className="w-full bg-devrelay-surface border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
          />
          <p className="text-xs text-devrelay-text-dim mt-1">Comma-separated. Use * for all events.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="isActive" className="text-devrelay-text">Active</label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending || !form.name || !form.slug}
            className="bg-devrelay-green text-devrelay-bg font-medium px-6 py-2 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/inbound')}
            className="text-devrelay-text-dim hover:text-devrelay-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}