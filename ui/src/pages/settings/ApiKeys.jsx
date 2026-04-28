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

const scopeOptions = [
  { value: 'webhook:read', label: 'Read Webhooks' },
  { value: 'webhook:write', label: 'Write Webhooks' },
  { value: 'job:read', label: 'Read Jobs' },
  { value: 'job:write', label: 'Write Jobs' },
  { value: 'scheduler:read', label: 'Read Scheduled Jobs' },
  { value: 'scheduler:write', label: 'Write Scheduled Jobs' }
];

export default function ApiKeysSettings() {
  const { workspace } = useWorkspace();
  
  if (!workspace) {
    return <div className="text-devrelay-text-dim">Loading...</div>;
  }

  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  
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
      setGeneratedKey(res.key);
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

  const keys = data?.keys || [];

  if (isLoading) {
    return <SkeletonTable rows={3} columns={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-devrelay-border">
              <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Name</th>
              <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Prefix</th>
              <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Scopes</th>
              <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Last Used</th>
              <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Expires</th>
              <th className="text-right text-sm text-devrelay-text-dim px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-devrelay-text-dim">
                  No API keys yet
                </td>
              </tr>
            ) : keys.map(key => (
              <tr key={key._id || key.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2">
                <td className="px-6 py-4 text-devrelay-text font-medium">{key.name}</td>
                <td className="px-6 py-4 text-devrelay-green font-mono text-sm">
                  dr_{key.prefix}...
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {key.scopes?.map(s => (
                      <span key={s} className="px-2 py-0.5 text-xs bg-devrelay-surface2 rounded text-devrelay-text-dim">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                  {key.lastUsedAt ? formatRelative(key.lastUsedAt) : 'Never'}
                </td>
                <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                  {key.expiresAt ? formatRelative(key.expiresAt) : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  {key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                    <span className="text-sm text-devrelay-text-dim">Expired</span>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirm(key)}
                      className="text-sm text-devrelay-red hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => { setGeneratedKey(null); setCreateOpen(true); }}
        className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim"
      >
        Generate New API Key
      </button>

      <SlideOver
        open={createOpen}
        onClose={() => { setCreateOpen(false); setGeneratedKey(null); setForm({ name: '', scopes: [], expiresAt: '' }); }}
        title={generatedKey ? 'Your API Key' : 'Generate API Key'}
        size="md"
      >
        {generatedKey ? (
          <div className="space-y-4">
            <div className="bg-devrelay-amber/10 border border-devrelay-amber/30 rounded-lg p-4">
              <p className="text-devrelay-amber text-sm font-medium">
                ⚠️ This key will NEVER be shown again. Copy it now.
              </p>
            </div>
            <div className="bg-devrelay-surface2 border border-devrelay-border rounded p-4">
              <code className="text-devrelay-green font-mono text-lg break-all">
                {generatedKey}
              </code>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(generatedKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={() => { setCreateOpen(false); setGeneratedKey(null); }}
              className="w-full bg-devrelay-surface border border-devrelay-border text-devrelay-text font-medium py-3 rounded hover:bg-devrelay-surface2"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                placeholder="My API Key"
              />
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Scopes</label>
              <div className="space-y-2">
                {scopeOptions.map(scope => (
                  <label key={scope.value} className="flex items-center gap-2 text-sm text-devrelay-text">
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(scope.value)}
                      onChange={(e) => {
                        const scopes = e.target.checked
                          ? [...form.scopes, scope.value]
                          : form.scopes.filter(s => s !== scope.value);
                        setForm({ ...form, scopes });
                      }}
                      className="w-4 h-4 rounded"
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Expires (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              />
            </div>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name}
              className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
            >
              {createMutation.isPending ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        )}
      </SlideOver>

      <ConfirmModal
        open={!!revokeConfirm}
        onClose={() => setRevokeConfirm(null)}
        onConfirm={() => revokeMutation.mutate(revokeConfirm._id || revokeConfirm.id)}
        title="Revoke API Key"
        description={`Are you sure you want to revoke "${revokeConfirm?.name}"? This cannot be undone.`}
        confirmLabel="Revoke"
        danger
      />
    </div>
  );
}