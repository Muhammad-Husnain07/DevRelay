import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, ChevronDown, ChevronRight, Play, Trash2, RefreshCw, Edit, Globe, ArrowLeft, Gauge, Bell, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getWebhook, updateWebhook, deleteWebhook, testWebhook, rotateSecret, getWebhookStats, getDeliveries } from '../../api/resources/webhooks';
import { formatRelative, formatDateTime, truncate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import CopyButton from '../../components/ui/CopyButton';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

function DeliveryRow({ delivery }) {
  const [expanded, setExpanded] = useState(false);
  const headers = delivery.requestHeaders || {};
  const body = delivery.requestBody;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-devrelay-green" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-devrelay-red" />;
      default:
        return <Clock className="w-4 h-4 text-devrelay-amber" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <StatusBadge status="success" label="Success" />;
      case 'failed':
        return <StatusBadge status="error" label="Failed" />;
      default:
        return <StatusBadge status="warning" label="Pending" />;
    }
  };

  return (
    <div className="border border-devrelay-border rounded mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-devrelay-surface2 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-devrelay-text-dim" /> : <ChevronRight className="w-4 h-4 text-devrelay-text-dim" />}
          <span className="text-sm text-devrelay-text">{formatDateTime(delivery.createdAt)}</span>
          <span className="px-2 py-0.5 bg-devrelay-blue/20 text-devrelay-blue text-xs rounded">{delivery.method || 'POST'}</span>
          <span className="text-sm text-devrelay-text-dim">{delivery.responseTimeMs ? `${delivery.responseTimeMs}ms` : '-'}</span>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(delivery.status)}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-devrelay-border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-devrelay-text mb-2">Request Headers</h4>
              <div className="bg-devrelay-bg rounded p-3 max-h-48 overflow-y-auto">
                {Object.entries(headers).map(([key, value]) => (
                  <div key={key} className="text-xs font-mono text-devrelay-text-dim py-1">
                    <span className="text-devrelay-green">{key}</span>: {value}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-devrelay-text mb-2">Request Body</h4>
              <div className="bg-devrelay-bg rounded p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs font-mono text-devrelay-text whitespace-pre-wrap">
                  {typeof body === 'object' ? JSON.stringify(body, null, 2) : body || '(empty)'}
                </pre>
              </div>
            </div>
          </div>

          {delivery.responseStatusCode && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-devrelay-text mb-2">Response Status</h4>
                <div className="bg-devrelay-bg rounded p-3">
                  <span className={`font-mono ${delivery.responseStatusCode >= 200 && delivery.responseStatusCode < 300 ? 'text-devrelay-green' : 'text-devrelay-red'}`}>
                    {delivery.responseStatusCode}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-devrelay-text mb-2">Response Body</h4>
                <div className="bg-devrelay-bg rounded p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs font-mono text-devrelay-text whitespace-pre-wrap">
                    {delivery.responseBody || '(no response body)'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {delivery.error && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-devrelay-text mb-2">Error</h4>
              <div className="bg-devrelay-red/10 border border-devrelay-red/30 rounded p-3">
                <pre className="text-xs font-mono text-devrelay-red whitespace-pre-wrap">{delivery.error}</pre>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-devrelay-green/20 text-devrelay-green text-sm rounded hover:bg-devrelay-green/30">
              <Play className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditWebhookForm({ form, setForm, onSubmit, isPending, onClose }) {
  const [eventInput, setEventInput] = useState('');

  const handleAddEvent = () => {
    if (eventInput && !form.events.includes(eventInput)) {
      setForm({ ...form, events: [...form.events, eventInput] });
      setEventInput('');
    }
  };

  const handleRemoveEvent = (evt) => {
    setForm({ ...form, events: form.events.filter(e => e !== evt) });
  };

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
                <button onClick={() => handleRemoveEvent(evt)} className="hover:text-devrelay-red transition-colors">
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
              onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
              className="flex-1 bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="Type event name and press Enter"
            />
            <button
              type="button"
              onClick={handleAddEvent}
              disabled={!eventInput}
              className="px-4 py-2.5 bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text hover:border-devrelay-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
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
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default function WebhookDetail() {
  const { id } = useParams();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: webhook, isLoading: loadingWebhook } = useQuery({
    queryKey: ['webhook-detail', workspace?.slug, id],
    queryFn: () => getWebhook(workspace.slug, id),
    enabled: !!workspace?.slug && !!id
  });

  const { data: stats } = useQuery({
    queryKey: ['webhook-stats', workspace?.slug, id],
    queryFn: () => getWebhookStats(workspace.slug, id),
    enabled: !!workspace?.slug && !!id,
    refetchInterval: 30000
  });

  const { data: deliveries, isLoading: loadingDeliveries, refetch } = useQuery({
    queryKey: ['webhook-deliveries', workspace?.slug, id],
    queryFn: () => getDeliveries(workspace.slug, id, { limit: 20 }),
    enabled: !!workspace?.slug && !!id,
    refetchInterval: 10000
  });

  const [form, setForm] = useState({
    name: '',
    url: '',
    events: ['*'],
    timeoutMs: 30000,
    rateLimitPerMinute: 60,
    isActive: true
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateWebhook(workspace.slug, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      queryClient.invalidateQueries(['webhook-detail']);
      setEditOpen(false);
      toast.success('Webhook endpoint updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update')
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWebhook(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      toast.success('Webhook endpoint deleted');
      navigate('/webhooks');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete')
  });

  const testMutation = useMutation({
    mutationFn: () => testWebhook(workspace.slug, id, { test: true }),
    onSuccess: () => {
      toast.success('Test delivery sent');
      refetch();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Test failed')
  });

  const rotateMutation = useMutation({
    mutationFn: () => rotateSecret(workspace.slug, id),
    onSuccess: (res) => {
      toast.success('Secret rotated successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to rotate secret')
  });

  const handleEdit = () => {
    if (webhook?.data?.endpoint) {
      setForm({
        name: webhook.data.endpoint.name || '',
        url: webhook.data.endpoint.url || '',
        events: webhook.data.endpoint.events || ['*'],
        timeoutMs: webhook.data.endpoint.timeoutMs || 30000,
        rateLimitPerMinute: webhook.data.endpoint.rateLimitPerMinute || 60,
        isActive: webhook.data.endpoint.isActive !== false
      });
      setEditOpen(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  if (loadingWebhook) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/webhooks')}
            className="p-2 hover:bg-devrelay-surface2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-devrelay-text-dim" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-devrelay-text">{webhook?.data?.endpoint?.name || 'Webhook'}</h1>
            <p className="text-devrelay-text-dim mt-1">Endpoint configuration and delivery logs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text hover:border-devrelay-green transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${testMutation.isPending ? 'animate-spin' : ''}`} />
            Test
          </button>
          <button
            onClick={() => rotateMutation.mutate()}
            disabled={rotateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text hover:border-devrelay-amber transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${rotateMutation.isPending ? 'animate-spin' : ''}`} />
            Rotate Secret
          </button>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2.5 bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text hover:border-devrelay-green transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(webhook?.data?.endpoint)}
            className="flex items-center gap-2 px-4 py-2.5 bg-devrelay-red/10 border border-devrelay-red/30 rounded-lg text-devrelay-red hover:bg-devrelay-red/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-devrelay-text-dim">Webhook URL</h2>
          <StatusBadge status={webhook?.data?.endpoint?.isActive ? 'success' : 'inactive'} label={webhook?.data?.endpoint?.isActive ? 'Active' : 'Inactive'} />
        </div>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-devrelay-bg px-4 py-3 rounded text-devrelay-green font-mono">{webhook?.data?.endpoint?.url}</code>
          <CopyButton text={webhook?.data?.endpoint?.url} />
        </div>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 mb-6">
        <h3 className="text-sm font-medium text-devrelay-text-dim mb-4">Statistics</h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-devrelay-text-dim mb-1">Total Deliveries</p>
            <p className="text-2xl font-bold text-devrelay-text">{stats?.data?.stats?.totalDeliveries || 0}</p>
          </div>
          <div>
            <p className="text-xs text-devrelay-text-dim mb-1">Successful</p>
            <p className="text-2xl font-bold text-devrelay-green">{stats?.data?.stats?.successfulDeliveries || 0}</p>
          </div>
          <div>
            <p className="text-xs text-devrelay-text-dim mb-1">Failed</p>
            <p className="text-2xl font-bold text-devrelay-red">{stats?.data?.stats?.failedDeliveries || 0}</p>
          </div>
          <div>
            <p className="text-xs text-devrelay-text-dim mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-devrelay-text">{stats?.data?.stats?.successRate || 0}%</p>
          </div>
        </div>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-devrelay-text-dim mb-2">Event Subscriptions</h3>
            <div className="flex flex-wrap gap-2">
              {webhook?.data?.endpoint?.events?.map(evt => (
                <span key={evt} className="px-3 py-1.5 bg-devrelay-green/20 text-devrelay-green text-sm rounded-lg">
                  {evt}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-devrelay-text-dim mb-2">Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-devrelay-text-dim">Timeout</span>
                <span className="text-devrelay-text">{webhook?.data?.endpoint?.timeoutMs || 30000}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-devrelay-text-dim">Rate Limit</span>
                <span className="text-devrelay-text">{webhook?.data?.endpoint?.rateLimitPerMinute || 60}/min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-devrelay-text">Last 20 Deliveries</h2>
          <button onClick={() => refetch()} className="text-sm text-devrelay-green hover:underline">Refresh</button>
        </div>

        {loadingDeliveries ? (
          <Spinner />
        ) : (
          <div>
            {deliveries?.data?.deliveries?.length === 0 ? (
              <p className="text-devrelay-text-dim text-center py-8">No deliveries yet</p>
            ) : (
              deliveries?.data?.deliveries?.map((delivery) => (
                <DeliveryRow key={delivery._id || delivery.id} delivery={delivery} />
              ))
            )}
          </div>
        )}
      </div>

      <SlideOver open={editOpen} onClose={() => setEditOpen(false)} title="Edit Webhook Endpoint">
        <EditWebhookForm
          form={form}
          setForm={setForm}
          onSubmit={handleSave}
          isPending={updateMutation.isPending}
          onClose={() => setEditOpen(false)}
        />
      </SlideOver>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Webhook Endpoint"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This will stop all event deliveries to this endpoint.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
