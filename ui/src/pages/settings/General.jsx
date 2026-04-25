import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { useWorkspace } from '../../context/WorkspaceContext';
import { updateWorkspace } from '../../api/resources/workspaces';
import { useToast } from '../../hooks/useToast';
import { Copy, Check, ChevronDown, Loader } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

export default function GeneralSettings() {
  const { workspace, refreshWorkspaces } = useWorkspace();
  
  if (!workspace) {
    return <div className="text-devrelay-text-dim">Loading...</div>;
  }
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [form, setForm] = useState({
    name: workspace?.name || '',
    webhookTimeout: workspace?.settings?.webhookTimeout || 30000,
    maxRetries: workspace?.settings?.maxRetries || 3,
    rateLimit: workspace?.settings?.rateLimit || 1000
  });
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const debouncedForm = useDebounce(form, 1000);

  useEffect(() => {
    if (debouncedForm && dirty) {
      handleSave();
    }
  }, [debouncedForm]);

  const updateMutation = useMutation({
    mutationFn: (data) => updateWorkspace(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace']);
      refreshWorkspaces();
      setDirty(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  });

  const handleSave = async () => {
    setSaving(true);
    await updateMutation.mutateAsync(form);
    setSaving(false);
  };

  const handleCopySlug = async () => {
    await navigator.clipboard.writeText(workspace.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!workspace) {
    return <Spinner size="lg" />;
  }

  const isFree = workspace.plan === 'free' || !workspace.plan;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm text-devrelay-text-dim mb-2">Workspace Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); setDirty(true); }}
          className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none focus:border-devrelay-green"
        />
      </div>

      <div>
        <label className="block text-sm text-devrelay-text-dim mb-2">Workspace Slug</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-green font-mono">
            {workspace.slug}
          </code>
          <button
            onClick={handleCopySlug}
            className="p-2 hover:bg-devrelay-surface2 rounded text-devrelay-text-dim hover:text-devrelay-text"
          >
            {copied ? <Check className="w-4 h-4 text-devrelay-green" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-devrelay-text-dim">Plan:</span>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isFree 
            ? 'bg-devrelay-border text-devrelay-text-dim' 
            : 'bg-gradient-to-r from-devrelay-green to-emerald-400 text-devrelay-bg'
        }`}>
          {isFree ? 'Free' : workspace.plan}
        </div>
        {isFree && (
          <a href="/upgrade" className="text-sm text-devrelay-green hover:underline">
            Upgrade →
          </a>
        )}
      </div>

      <div className="border-t border-devrelay-border pt-6">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-2 text-devrelay-text-dim hover:text-devrelay-text"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
          Advanced Settings
        </button>

        {advancedOpen && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">
                Webhook Timeout: {form.webhookTimeout}ms
              </label>
              <input
                type="range"
                min="5000"
                max="60000"
                step="1000"
                value={form.webhookTimeout}
                onChange={(e) => { setForm({ ...form, webhookTimeout: parseInt(e.target.value) }); setDirty(true); }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-devrelay-text-dim">
                <span>5s</span>
                <span>60s</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">
                Max Retries: {form.maxRetries}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={form.maxRetries}
                onChange={(e) => { setForm({ ...form, maxRetries: parseInt(e.target.value) }); setDirty(true); }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-devrelay-text-dim">
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">
                Rate Limit: {form.rateLimit}/min
              </label>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={form.rateLimit}
                onChange={(e) => { setForm({ ...form, rateLimit: parseInt(e.target.value) }); setDirty(true); }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-devrelay-text-dim">
                <span>100</span>
                <span>10000</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-devrelay-border">
          {saving && <Loader className="w-4 h-4 animate-spin text-devrelay-text-dim" />}
          <span className="text-sm text-devrelay-text-dim">Saving...</span>
        </div>
      )}
    </div>
  );
}