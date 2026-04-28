import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Copy, RefreshCw, Globe, Clock, Gauge, Bell, AlertCircle, CheckCircle, X, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listWebhooks, createWebhook, deleteWebhook, testWebhook, rotateSecret } from '../../api/resources/webhooks';
import { formatRelative, truncate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import CopyButton from '../../components/ui/CopyButton';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

const EVENT_PRESETS = [
  { label: 'All Events', value: '*' },
  { label: 'Job Events', value: 'job.*' },
  { label: 'Scheduler Events', value: 'scheduler.*' },
  { label: 'Custom Events', value: '' },
];

function CreateWebhookForm({ form, setForm, eventInput, setEventInput, onSubmit, isPending, onClose, onAddEvent, onRemoveEvent }) {
  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-devrelay-green" />
          Endpoint Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="My Webhook"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Webhook URL *</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="https://example.com/webhook"
            />
            <p className="text-xs text-devrelay-text-dim mt-1">The URL where events will be sent</p>
          </div>
        </div>
      </div>

      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-devrelay-green" />
          Event Subscriptions
        </h3>
        
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {form.events.map(evt => (
              <span key={evt} className="flex items-center gap-1.5 px-3 py-1.5 bg-devrelay-green/20 text-devrelay-green text-sm rounded-lg">
                <span className="font-mono">{evt}</span>
                <button onClick={() => onRemoveEvent(evt)} className="hover:text-devrelay-red transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddEvent()}
              className="flex-1 bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="Type event name and press Enter"
            />
            <button
              type="button"
              onClick={onAddEvent}
              disabled={!eventInput}
              className="px-4 py-2.5 bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text hover:border-devrelay-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-devrelay-text-dim mt-2">Use * to receive all events, or specific event patterns like job.completed</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {EVENT_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => preset.value && !form.events.includes(preset.value) && setForm({ ...form, events: [...form.events, preset.value] })}
              disabled={!preset.value || form.events.includes(preset.value)}
              className="px-3 py-1.5 text-xs bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text-dim hover:border-devrelay-green/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-devrelay-green" />
          Advanced Settings
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Timeout (ms)</label>
            <input
              type="number"
              min="1000"
              max="60000"
              value={form.timeoutMs}
              onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
            />
            <p className="text-xs text-devrelay-text-dim mt-1">Max wait for response</p>
          </div>
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Rate Limit/min</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={form.rateLimitPerMinute}
              onChange={(e) => setForm({ ...form, rateLimitPerMinute: parseInt(e.target.value) })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
            />
            <p className="text-xs text-devrelay-text-dim mt-1">Max deliveries per minute</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 px-4 rounded-lg border border-devrelay-border text-devrelay-text hover:bg-devrelay-surface2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending || !form.name || !form.url}
          className="flex-1 py-3 px-4 rounded-lg bg-devrelay-green text-devrelay-bg font-medium hover:bg-devrelay-green-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Creating...' : 'Create Endpoint'}
        </button>
      </div>
    </div>
  );
}

export default function WebhookList() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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
    onSuccess: (res) => {
      queryClient.invalidateQueries(['webhooks']);
      setNewSecret(res.data.rawSecret);
      setForm({ name: '', url: '', events: ['*'], timeoutMs: 30000, rateLimitPerMinute: 60, headers: [] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteWebhook(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      setDeleteConfirm(null);
      toast.success('Endpoint deleted');
    }
  });

  const testMutation = useMutation({
    mutationFn: (id) => testWebhook(workspace.slug, id, { test: true }),
    onSuccess: (res) => {
      toast.success('Test request sent successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Test failed')
  });

  const rotateMutation = useMutation({
    mutationFn: (id) => rotateSecret(workspace.slug, id),
    onSuccess: (res) => {
      toast.success('Secret rotated successfully');
    }
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
    createMutation.mutate(form);
  };

  const handleTest = (id) => {
    testMutation.mutate(id);
  };

  const handleRotate = (id) => {
    rotateMutation.mutate(id);
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 90) return 'text-devrelay-green';
    if (rate >= 70) return 'text-devrelay-amber';
    return 'text-devrelay-red';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Webhooks</h1>
          <p className="text-devrelay-text-dim mt-1">Manage outbound webhook endpoints</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-green-dim transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Endpoint
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-devrelay-text-dim" />
          <input
            type="text"
            placeholder="Search webhooks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg pl-10 pr-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          title="No webhooks found" 
          description="Create your first webhook endpoint to start receiving events"
          action={<button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 bg-devrelay-green text-devrelay-bg rounded-lg hover:bg-devrelay-green-dim">Create Endpoint</button>}
        />
      ) : (
        <div className="bg-devrelay-surface border border-devrelay-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-devrelay-border bg-devrelay-surface2">
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Endpoint</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">URL</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Events</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Status</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Success Rate</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Last Delivery</th>
                <th className="text-right text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((endpoint) => (
                <tr 
                  key={endpoint._id || endpoint.id} 
                  className="border-b border-devrelay-border hover:bg-devrelay-surface2 transition-colors cursor-pointer"
                  onClick={() => navigate(`/webhooks/${endpoint._id || endpoint.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="text-devrelay-text font-medium">{endpoint.name}</div>
                    <div className="text-xs text-devrelay-text-dim font-mono mt-0.5">{endpoint._id || endpoint.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-devrelay-text-dim font-mono text-sm">{truncate(endpoint.url, 35)}</span>
                  </td>
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
                    <span className={`font-medium ${getSuccessRateColor(endpoint.successRate || 0)}`}>
                      {endpoint.successRate || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                    {endpoint.lastDeliveryAt ? formatRelative(endpoint.lastDeliveryAt) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleTest(endpoint._id || endpoint.id)} 
                        className="p-2 hover:bg-devrelay-border rounded-lg transition-colors" 
                        title="Test"
                      >
                        <RefreshCw className={`w-4 h-4 text-devrelay-text-dim ${testMutation.isPending ? 'animate-spin' : ''}`} />
                      </button>
                      <button 
                        onClick={() => handleRotate(endpoint._id || endpoint.id)} 
                        className="p-2 hover:bg-devrelay-border rounded-lg transition-colors" 
                        title="Rotate Secret"
                      >
                        <RefreshCw className="w-4 h-4 text-devrelay-amber" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(endpoint)} 
                        className="p-2 hover:bg-devrelay-border rounded-lg transition-colors" 
                        title="Delete"
                      >
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

      <SlideOver open={createOpen} onClose={() => { setCreateOpen(false); setNewSecret(null); }} title="Create New Endpoint">
        {newSecret ? (
          <div className="space-y-6">
            <div className="bg-devrelay-green/10 border border-devrelay-green/30 rounded-lg p-4">
              <p className="text-sm text-devrelay-text-dim mb-2">Your webhook secret has been generated. Save it securely - it will not be shown again:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-devrelay-bg px-4 py-3 rounded text-devrelay-green font-mono">{newSecret}</code>
                <CopyButton text={newSecret} />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setCreateOpen(false); setNewSecret(null); }}
                className="flex-1 py-3 px-4 rounded-lg bg-devrelay-green text-devrelay-bg font-medium hover:bg-devrelay-green-dim transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <CreateWebhookForm 
            form={form}
            setForm={setForm}
            eventInput={eventInput}
            setEventInput={setEventInput}
            onSubmit={handleCreate}
            isPending={createMutation.isPending}
            onClose={() => setCreateOpen(false)}
            onAddEvent={handleAddEvent}
            onRemoveEvent={handleRemoveEvent}
          />
        )}
      </SlideOver>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm._id || deleteConfirm.id)}
        title="Delete Endpoint"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This will stop all event deliveries to this endpoint.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}