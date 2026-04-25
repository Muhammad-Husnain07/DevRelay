import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Edit, Copy, RefreshCw } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listWebhooks, createWebhook, deleteWebhook, testWebhook, rotateSecret } from '../../api/resources/webhooks';
import { formatRelative, truncate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import CopyButton from '../../components/ui/CopyButton';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function WebhookList() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [newSecret, setNewSecret] = useState(null);

  const [form, setForm] = useState({
    name: '',
    url: '',
    events: ['*'],
    timeoutMs: 30000,
    rateLimitPerMinute: 60,
    headers: []
  });
  const [eventInput, setEventInput] = useState('');

  const { data: endpoints, isLoading } = useQuery({
    queryKey: ['webhooks', workspace?.slug],
    queryFn: () => workspace?.slug ? listWebhooks(workspace.slug) : Promise.resolve({ data: [] }),
    enabled: !!workspace?.slug
  });

  const createMutation = useMutation({
    mutationFn: (data) => createWebhook(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      setCreateOpen(false);
      setForm({ name: '', url: '', events: ['*'], timeoutMs: 30000, rateLimitPerMinute: 60, headers: [] });
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to create')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteWebhook(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      setDeleteConfirm(null);
    }
  });

  const testMutation = useMutation({
    mutationFn: (id) => testWebhook(workspace.slug, id, { test: true }),
    onSuccess: (res) => setTestResult(res.data),
    onError: (err) => setTestResult({ error: err.response?.data?.error || 'Test failed' })
  });

  const rotateMutation = useMutation({
    mutationFn: (id) => rotateSecret(workspace.slug, id),
    onSuccess: (res) => setNewSecret(res.data.secret)
  });

  const filtered = endpoints?.data?.endpoints?.filter(e => {
    const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && e.isActive) ||
      (statusFilter === 'inactive' && !e.isActive);
    return matchesSearch && matchesStatus;
  }) || [];

  const handleAddEvent = () => {
    if (eventInput && !form.events.includes(eventInput)) {
      setForm({ ...form, events: [...form.events, eventInput] });
      setEventInput('');
    }
  };

  const handleRemoveEvent = (evt) => {
    setForm({ ...form, events: form.events.filter(e => e !== evt) });
  };

  const handleCreate = () => {
    if (!form.name || !form.url) return alert('Name and URL are required');
    createMutation.mutate(form);
  };

  const handleTest = (id) => {
    testMutation.mutate(id);
  };

  const handleRotate = (id) => {
    rotateMutation.mutate(id);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Webhooks</h1>
          <p className="text-devrelay-text-dim mt-1">Manage outbound webhook endpoints</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Endpoint
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-devrelay-text-dim" />
          <input
            type="text"
            placeholder="Search webhooks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-devrelay-surface2 border border-devrelay-border rounded pl-10 pr-4 py-2 text-devrelay-text focus:outline-none focus:border-devrelay-green"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No webhooks"
          description="Create your first webhook endpoint to start receiving events"
          action={<button onClick={() => setCreateOpen(true)} className="text-devrelay-green hover:underline">Create Endpoint</button>}
        />
      ) : (
        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-devrelay-border">
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Name</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">URL</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Events</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Status</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Success Rate</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Last Delivery</th>
                <th className="text-right text-sm text-devrelay-text-dim px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((endpoint) => (
                <tr key={endpoint._id || endpoint.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2">
                  <td className="px-6 py-4 text-devrelay-text font-medium">{endpoint.name}</td>
                  <td className="px-6 py-4 text-devrelay-text-dim font-mono text-sm">{truncate(endpoint.url, 40)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {endpoint.events?.slice(0, 3).map(evt => (
                        <span key={evt} className="px-2 py-0.5 bg-devrelay-green/20 text-devrelay-green text-xs rounded">
                          {evt}
                        </span>
                      ))}
                      {endpoint.events?.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-devrelay-text-dim">+{endpoint.events.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={endpoint.isActive ? 'success' : 'inactive'} label={endpoint.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={
                      (endpoint.successRate || 0) > 90 ? 'text-devrelay-green' :
                      (endpoint.successRate || 0) > 70 ? 'text-devrelay-amber' : 'text-devrelay-red'
                    }>
                      {endpoint.successRate || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                    {endpoint.lastDeliveryAt ? formatRelative(endpoint.lastDeliveryAt) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleTest(endpoint._id || endpoint.id)} className="p-2 hover:bg-devrelay-border rounded" title="Test">
                        <RefreshCw className="w-4 h-4 text-devrelay-text-dim" />
                      </button>
                      <button onClick={() => setDeleteConfirm(endpoint)} className="p-2 hover:bg-devrelay-border rounded" title="Delete">
                        <Trash2 className="w-4 h-4 text-devrelay-red" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Create Endpoint">
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="My Webhook"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">URL *</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="https://example.com/webhook"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Events</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.events.map(evt => (
                <span key={evt} className="flex items-center gap-1 px-2 py-1 bg-devrelay-green/20 text-devrelay-green text-sm rounded">
                  {evt}
                  <button onClick={() => handleRemoveEvent(evt)} className="hover:text-devrelay-red">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={eventInput}
                onChange={(e) => setEventInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                className="flex-1 bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
                placeholder="Type event and press Enter"
              />
              <button
                type="button"
                onClick={handleAddEvent}
                className="px-3 py-2 bg-devrelay-surface2 border border-devrelay-border rounded text-devrelay-text hover:border-devrelay-green"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-devrelay-text-dim mt-1">Use * to receive all events</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Timeout (ms)</label>
              <input
                type="number"
                value={form.timeoutMs}
                onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Rate Limit/min</label>
              <input
                type="number"
                value={form.rateLimitPerMinute}
                onChange={(e) => setForm({ ...form, rateLimitPerMinute: parseInt(e.target.value) })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
              />
            </div>
          </div>

          {newSecret && (
            <div className="bg-devrelay-amber/20 border border-devrelay-amber/30 rounded p-4">
              <p className="text-sm text-devrelay-amber font-medium mb-2">Secret Generated</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-devrelay-bg px-3 py-2 rounded text-devrelay-text text-sm">{newSecret}</code>
                <CopyButton text={newSecret} />
              </div>
              <p className="text-xs text-devrelay-amber mt-2">This is the only time the secret will be shown!</p>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !form.name || !form.url}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Endpoint'}
          </button>
        </div>
      </SlideOver>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm._id || deleteConfirm.id)}
        title="Delete Endpoint"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}