import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, ChevronDown, ChevronRight, Play, Trash2, RefreshCw, Edit, Zap, Globe, ArrowLeft } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getInbound, getInboundRequests, updateInbound, deleteInbound } from '../../api/resources/events';
import { formatDateTime, truncate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import CopyButton from '../../components/ui/CopyButton';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

function RequestRow({ request, workspaceSlug }) {
  const [expanded, setExpanded] = useState(false);
  const headers = request.headers || {};
  const body = request.body;

  return (
    <div className="border border-devrelay-border rounded mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-devrelay-surface2 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-devrelay-text-dim" /> : <ChevronRight className="w-4 h-4 text-devrelay-text-dim" />}
          <span className="text-sm text-devrelay-text">{formatDateTime(request.createdAt)}</span>
          <span className="px-2 py-0.5 bg-devrelay-blue/20 text-devrelay-blue text-xs rounded">{request.method || 'POST'}</span>
          <span className="text-sm text-devrelay-text-dim">{request.size ? `${(request.size / 1024).toFixed(1)} KB` : '-'}</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status="success" label="Received" />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-devrelay-border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-devrelay-text mb-2">Headers</h4>
              <div className="bg-devrelay-bg rounded p-3 max-h-48 overflow-y-auto">
                {Object.entries(headers).map(([key, value]) => (
                  <div key={key} className="text-xs font-mono text-devrelay-text-dim py-1">
                    <span className="text-devrelay-green">{key}</span>: {value}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-devrelay-text mb-2">Body</h4>
              <div className="bg-devrelay-bg rounded p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs font-mono text-devrelay-text whitespace-pre-wrap">
                  {typeof body === 'object' ? JSON.stringify(body, null, 2) : body || '(empty)'}
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-devrelay-green/20 text-devrelay-green text-sm rounded hover:bg-devrelay-green/30">
              <Play className="w-3 h-3" />
              Replay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditInboundForm({ form, setForm, onSubmit, isPending, onClose }) {
  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-devrelay-green" />
          Inbound Webhook Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="GitHub Webhooks"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">HTTP Method</label>
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-devrelay-green" />
          Signature & Transform
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Signature Header</label>
            <input
              type="text"
              value={form.signatureHeader}
              onChange={(e) => setForm({ ...form, signatureHeader: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="X-Hub-Signature-256"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Signature Algorithm</label>
            <select
              value={form.signatureAlgorithm}
              onChange={(e) => setForm({ ...form, signatureAlgorithm: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
            >
              <option value="sha256">HMAC-SHA256</option>
              <option value="sha1">HMAC-SHA1</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Event Type Field</label>
            <input
              type="text"
              value={form.eventTypeField}
              onChange={(e) => setForm({ ...form, eventTypeField: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="type"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Default Event Type</label>
            <input
              type="text"
              value={form.defaultEventType}
              onChange={(e) => setForm({ ...form, defaultEventType: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="webhook.received"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Transform Script (JavaScript)</label>
            <textarea
              value={form.transformScript}
              onChange={(e) => setForm({ ...form, transformScript: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green font-mono text-sm h-24"
              placeholder="return payload;"
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
          disabled={isPending || !form.name}
          className="flex-1 py-3 px-4 rounded-lg bg-devrelay-green text-devrelay-bg font-medium hover:bg-devrelay-green-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default function InboundDetail() {
  const { slug } = useParams();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: inboundData, isLoading: loadingInbound } = useQuery({
    queryKey: ['inbound-detail', workspace?.slug, slug],
    queryFn: () => getInbound(workspace.slug, slug),
    enabled: !!workspace?.slug && !!slug
  });

  const inbound = inboundData?.data?.inboundWebhook;

  const { data: requests, isLoading: loadingRequests, refetch } = useQuery({
    queryKey: ['inbound-requests', workspace?.slug, slug],
    queryFn: () => getInboundRequests(workspace.slug, slug, { limit: 20 }),
    enabled: !!workspace?.slug && !!slug,
    refetchInterval: 10000
  });

  const [form, setForm] = useState({
    name: '',
    method: 'POST',
    signatureHeader: 'X-Hub-Signature-256',
    signatureAlgorithm: 'sha256',
    eventTypeField: 'action',
    defaultEventType: 'webhook.received',
    transformScript: '',
    isActive: true
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateInbound(workspace.slug, inbound.data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inbound']);
      queryClient.invalidateQueries(['inbound-detail']);
      setEditOpen(false);
      toast.success('Inbound webhook updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteInbound(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['inbound']);
      window.location.href = '/inbound';
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete')
  });

  const handleEdit = () => {
    if (inbound) {
      setForm({
        name: inbound.data.name || '',
        method: inbound.data.method || 'POST',
        signatureHeader: inbound.data.signatureHeader || 'X-Hub-Signature-256',
        signatureAlgorithm: inbound.data.signatureAlgorithm || 'sha256',
        eventTypeField: inbound.data.eventTypeField || 'action',
        defaultEventType: inbound.data.defaultEventType || 'webhook.received',
        transformScript: inbound.data.transformScript || '',
        isActive: inbound.data.isActive !== false
      });
      setEditOpen(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  if (loadingInbound) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  const receiveUrl = `${window.location.origin}/receive/${slug}`;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inbound')}
            className="p-2 hover:bg-devrelay-surface2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-devrelay-text-dim" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-devrelay-text">{inbound?.name || 'Inbound'}</h1>
            <p className="text-devrelay-text-dim mt-1">Inspector and request history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2.5 bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text hover:border-devrelay-green transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(inbound)}
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
          <StatusBadge status={inbound?.isActive ? 'success' : 'inactive'} label={inbound?.isActive ? 'Active' : 'Inactive'} />
        </div>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-devrelay-bg px-4 py-3 rounded text-devrelay-green font-mono">{receiveUrl}</code>
          <CopyButton text={receiveUrl} />
        </div>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-devrelay-text-dim mb-2">Signature Header</h3>
            <p className="text-devrelay-text font-mono">{inbound?.signatureHeader || 'X-DevRelay-Signature'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-devrelay-text-dim mb-2">Signature Algorithm</h3>
            <p className="text-devrelay-text">{inbound?.signatureAlgorithm || 'HMAC-SHA256'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-devrelay-text-dim mb-2">Event Type Field</h3>
            <p className="text-devrelay-text font-mono">{inbound?.eventTypeField || 'type'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-devrelay-text-dim mb-2">Default Event Type</h3>
            <p className="text-devrelay-text font-mono">{inbound?.defaultEventType || 'webhook.received'}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-devrelay-text">Last 20 Requests</h2>
          <button onClick={() => refetch()} className="text-sm text-devrelay-green hover:underline">Refresh</button>
        </div>

        {loadingRequests ? (
          <Spinner />
        ) : (
          <div>
            {requests?.data?.requests?.length === 0 ? (
              <p className="text-devrelay-text-dim text-center py-8">No requests yet</p>
            ) : (
              requests?.data?.requests?.map((req) => (
                <RequestRow key={req._id || req.id} request={req} workspaceSlug={workspace?.slug} />
              ))
            )}
          </div>
        )}
      </div>

      <SlideOver open={editOpen} onClose={() => setEditOpen(false)} title="Edit Inbound Webhook">
        <EditInboundForm
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
        onConfirm={() => {
          const itemId = deleteConfirm?.id || inbound?.id;
          if (itemId) deleteMutation.mutate(itemId);
        }}
        title="Delete Inbound Webhook"
        description={`Are you sure you want to delete "${deleteConfirm?.name || inbound?.name}"? This will stop receiving webhooks at this endpoint.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}