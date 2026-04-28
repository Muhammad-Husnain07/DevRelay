import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Search, Zap, Globe, ArrowRight, Clock, Activity } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listInbound, createInbound } from '../../api/resources/events';
import { formatRelative, truncate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import CopyButton from '../../components/ui/CopyButton';
import SlideOver from '../../components/ui/SlideOver';
import toast from 'react-hot-toast';

function InboundCard({ inbound, onClick }) {
  const receiveUrl = `${window.location.origin}/receive/${inbound.slug}`;
  
  return (
    <div 
      onClick={onClick}
      className="bg-devrelay-surface border border-devrelay-border rounded-xl p-5 cursor-pointer hover:border-devrelay-green/50 hover:shadow-lg hover:shadow-devrelay-green/5 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-devrelay-green/10 rounded-lg">
            <Globe className="w-5 h-5 text-devrelay-green" />
          </div>
          <div>
            <h3 className="font-semibold text-devrelay-text">{inbound.name}</h3>
            <p className="text-xs text-devrelay-text-dim font-mono">{inbound.slug}</p>
          </div>
        </div>
        <StatusBadge status={inbound.isActive ? 'success' : 'inactive'} label={inbound.isActive ? 'Active' : 'Inactive'} />
      </div>

      <div className="bg-devrelay-bg rounded-lg px-4 py-3 mb-4">
        <div className="flex items-center justify-between">
          <code className="text-sm text-devrelay-green font-mono truncate">{truncate(receiveUrl, 40)}</code>
          <CopyButton 
            text={receiveUrl} 
            icon={<Copy className="w-4 h-4" />}
            className="ml-2"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm pt-4 border-t border-devrelay-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-devrelay-text-dim">
            <Activity className="w-4 h-4" />
            <span>{inbound.requestCount || 0} requests</span>
          </div>
          <div className="flex items-center gap-1.5 text-devrelay-text-dim">
            <Clock className="w-4 h-4" />
            <span>{inbound.lastRequestAt ? formatRelative(inbound.lastRequestAt) : 'never'}</span>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-devrelay-text-dim group-hover:text-devrelay-green group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

function CreateInboundForm({ form, setForm, onSubmit, isPending, onClose }) {
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
            <label className="block text-sm text-devrelay-text-dim mb-2">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-') })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="github-webhooks"
            />
            <p className="text-xs text-devrelay-text-dim mt-1">Unique URL identifier</p>
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
            <p className="text-xs text-devrelay-text-dim mt-1">JSON path to extract event type (e.g., action, type)</p>
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
            <p className="text-xs text-devrelay-text-dim mt-1">Optional transform function (payload {'=>'} transformed)</p>
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
          disabled={isPending || !form.name || !form.slug}
          className="flex-1 py-3 px-4 rounded-lg bg-devrelay-green text-devrelay-bg font-medium hover:bg-devrelay-green-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Creating...' : 'Create Inbound'}
        </button>
      </div>
    </div>
  );
}

export default function InboundList() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newSecret, setNewSecret] = useState(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    method: 'POST',
    signatureHeader: 'X-Hub-Signature-256',
    signatureAlgorithm: 'sha256',
    eventTypeField: 'action',
    defaultEventType: 'webhook.received',
    transformScript: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inbound', workspace?.slug],
    queryFn: () => workspace?.slug ? listInbound(workspace.slug) : Promise.resolve({ data: [] }),
    enabled: !!workspace?.slug
  });

  const createMutation = useMutation({
    mutationFn: (data) => createInbound(workspace.slug, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['inbound']);
      setCreateOpen(false);
      setNewSecret(res.data.rawSecret);
      setForm({
        name: '',
        slug: '',
        method: 'POST',
        signatureHeader: 'X-Hub-Signature-256',
        signatureAlgorithm: 'sha256',
        eventTypeField: 'action',
        defaultEventType: 'webhook.received',
        transformScript: ''
      });
      toast.success('Inbound webhook created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create')
  });

  const filtered = data?.data?.inboundWebhooks?.filter(e => 
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.slug.includes(search)
  ) || [];

  const handleCreate = () => {
    createMutation.mutate(form);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Inbound Webhooks</h1>
          <p className="text-devrelay-text-dim mt-1">Receive webhooks from external services</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-green-dim transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Inbound
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-devrelay-text-dim" />
          <input
            type="text"
            placeholder="Search inbound webhooks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg pl-10 pr-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          title="No inbound webhooks" 
          description="Create an inbound webhook to receive events from external services like GitHub, Stripe, Slack, etc."
          action={<button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 bg-devrelay-green text-devrelay-bg rounded-lg hover:bg-devrelay-green-dim">Create Inbound</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inbound) => (
            <InboundCard
              key={inbound._id || inbound.id}
              inbound={inbound}
              onClick={() => navigate(`/inbound/${inbound.slug}`)}
            />
          ))}
        </div>
      )}

      <SlideOver open={createOpen} onClose={() => { setCreateOpen(false); setNewSecret(null); }} title="Create Inbound Webhook">
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
          <CreateInboundForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            isPending={createMutation.isPending}
            onClose={() => setCreateOpen(false)}
          />
        )}
      </SlideOver>
    </div>
  );
}