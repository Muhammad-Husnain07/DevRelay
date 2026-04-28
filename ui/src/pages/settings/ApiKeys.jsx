import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listApiKeys, createApiKey, revokeApiKey } from '../../api/resources/workspaces';
import { useToast } from '../../hooks/useToast';
import { formatRelative } from '../../utils/formatters';
import CopyButton from '../../components/ui/CopyButton';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Key, Shield, Calendar, Clock, AlertTriangle, Copy, Plus, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const scopeOptions = [
  { value: 'webhook:read', label: 'Read Webhooks', icon: '🌐' },
  { value: 'webhook:write', label: 'Write Webhooks', icon: '🌐' },
  { value: 'job:read', label: 'Read Jobs', icon: '📋' },
  { value: 'job:write', label: 'Write Jobs', icon: '📋' },
  { value: 'scheduler:read', label: 'Read Scheduled Jobs', icon: '⏰' },
  { value: 'scheduler:write', label: 'Write Scheduled Jobs', icon: '⏰' }
];

function CreateKeyForm({ form, setForm, onSubmit, isPending, onClose }) {
  const toggleScope = (scope) => {
    const scopes = form.scopes.includes(scope)
      ? form.scopes.filter(s => s !== scope)
      : [...form.scopes, scope];
    setForm({ ...form, scopes });
  };

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-devrelay-green" />
          Key Details
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Key Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="My API Key"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Expiration (optional)</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
            />
            <p className="text-xs text-devrelay-text-dim mt-1">Leave empty for no expiration</p>
          </div>
        </div>
      </div>

      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-devrelay-green" />
          Permissions
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          {scopeOptions.map(scope => (
            <button
              key={scope.value}
              type="button"
              onClick={() => toggleScope(scope.value)}
              className={`flex items-center gap-2 p-3 rounded-lg text-sm text-left transition-all ${
                form.scopes.includes(scope.value)
                  ? 'bg-devrelay-green/20 border border-devrelay-green text-devrelay-text'
                  : 'bg-devrelay-surface border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
              }`}
            >
              <span>{scope.icon}</span>
              <span>{scope.label}</span>
              {form.scopes.includes(scope.value) && <Check className="w-4 h-4 text-devrelay-green ml-auto" />}
            </button>
          ))}
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
          {isPending ? 'Generating...' : 'Generate Key'}
        </button>
      </div>
    </div>
  );
}

function GeneratedKeyView({ key, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-amber/10 border border-devrelay-amber/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-devrelay-amber flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-devrelay-amber font-medium">Save this key now</p>
          <p className="text-devrelay-text-dim text-sm mt-1">This key will NEVER be shown again. Copy and store it securely.</p>
        </div>
      </div>

      <div className="bg-devrelay-surface2 border border-devrelay-border rounded-xl p-4">
        <code className="text-devrelay-green font-mono text-sm break-all block">{key}</code>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-devrelay-green text-devrelay-bg font-medium hover:bg-devrelay-green-dim transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 rounded-lg bg-devrelay-surface border border-devrelay-border text-devrelay-text font-medium hover:bg-devrelay-surface2 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysSettings() {
  const { workspace } = useWorkspace();
  
  if (!workspace) {
    return <div className="text-devrelay-text-dim">Loading...</div>;
  }

  const queryClient = useQueryClient();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    scopes: [],
    expiresAt: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['apiKeys', workspace?.slug],
    queryFn: () => listApiKeys(workspace.slug),
    enabled: !!workspace?.slug
  });

  const createMutation = useMutation({
    mutationFn: (data) => createApiKey(workspace.slug, data),
    onSuccess: (res) => {
      setGeneratedKey(res.data?.key);
      queryClient.invalidateQueries(['apiKeys']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create key')
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => revokeApiKey(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['apiKeys']);
      setRevokeConfirm(null);
      toast.success('API key revoked');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to revoke key')
  });

  const keys = data?.data?.keys || [];

  const handleSubmit = () => {
    createMutation.mutate(form);
  };

  const handleClose = () => {
    setCreateOpen(false);
    setGeneratedKey(null);
    setForm({ name: '', scopes: [], expiresAt: '' });
  };

  if (isLoading) {
    return <SkeletonTable rows={3} columns={5} />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">API Keys</h1>
          <p className="text-devrelay-text-dim mt-1">Manage API keys for programmatic access</p>
        </div>
        <button
          onClick={() => { setGeneratedKey(null); setCreateOpen(true); }}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-green-dim transition-colors"
        >
          <Plus className="w-5 h-5" />
          Generate New Key
        </button>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-devrelay-border bg-devrelay-surface2">
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Name</th>
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Prefix</th>
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Scopes</th>
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Last Used</th>
              <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Expires</th>
              <th className="text-right text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-devrelay-text-dim">
                  <div className="flex flex-col items-center gap-2">
                    <Key className="w-8 h-8 text-devrelay-text-dim opacity-50" />
                    <p>No API keys yet</p>
                    <p className="text-sm">Generate your first API key to get started</p>
                  </div>
                </td>
              </tr>
            ) : keys.map(key => {
              const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
              return (
                <tr key={key._id || key.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-devrelay-green" />
                      <span className="text-devrelay-text font-medium">{key.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-devrelay-green font-mono text-sm bg-devrelay-green/10 px-2 py-1 rounded">dr_{key.prefix}...</code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes?.slice(0, 3).map(s => (
                        <span key={s} className="px-2 py-0.5 text-xs bg-devrelay-surface2 rounded text-devrelay-text-dim">
                          {s}
                        </span>
                      ))}
                      {key.scopes?.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-devrelay-text-dim">+{key.scopes.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {key.lastUsedAt ? formatRelative(key.lastUsedAt) : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {key.expiresAt ? (
                      <span className={isExpired ? 'text-devrelay-red' : 'text-devrelay-text-dim'}>
                        {isExpired ? 'Expired ' : ''}{formatRelative(key.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-devrelay-text-dim">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isExpired ? (
                      <span className="text-sm text-devrelay-text-dim">Expired</span>
                    ) : (
                      <button
                        onClick={() => setRevokeConfirm(key)}
                        className="text-sm text-devrelay-red hover:text-devrelay-red/80 flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SlideOver
        open={createOpen}
        onClose={handleClose}
        title={generatedKey ? 'Your API Key' : 'Generate API Key'}
        size="md"
      >
        {generatedKey ? (
          <GeneratedKeyView key={generatedKey} onClose={handleClose} />
        ) : (
          <CreateKeyForm 
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            isPending={createMutation.isPending}
            onClose={handleClose}
          />
        )}
      </SlideOver>

      <ConfirmModal
        open={!!revokeConfirm}
        onClose={() => setRevokeConfirm(null)}
        onConfirm={() => revokeMutation.mutate(revokeConfirm._id || revokeConfirm.id)}
        title="Revoke API Key"
        description={`Are you sure you want to revoke "${revokeConfirm?.name}"? Applications using this key will stop working.`}
        confirmLabel="Revoke"
        danger
      />
    </div>
  );
}