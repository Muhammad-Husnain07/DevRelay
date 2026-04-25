import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Play, AlertTriangle, Bell, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listAlertRules, createAlertRule, deleteAlertRule, getAlerts, deleteAlert } from '../../api/resources/alerts';
import { formatRelative, formatJson } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';

const conditionTypes = [
  { value: 'webhook_delivery_failed', label: 'Webhook Delivery Failed' },
  { value: 'job_failed', label: 'Job Failed' },
  { value: 'queue_length', label: 'Queue Length Exceeded' },
  { value: 'delivery_latency', label: 'Delivery Latency Exceeded' },
  { value: 'error_rate', label: 'Error Rate Exceeded' }
];

const actionTypes = [
  { value: 'webhook', label: 'HTTP Webhook' },
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'pagerduty', label: 'PagerDuty' }
];

export default function Alerts() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('rules');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteRuleConfirm, setDeleteRuleConfirm] = useState(null);
  const [deleteAlertConfirm, setDeleteAlertConfirm] = useState(null);

  const [form, setForm] = useState({
    name: '',
    enabled: true,
    conditionType: 'webhook_delivery_failed',
    conditionConfig: { threshold: 5, window: 300 },
    actions: [{ type: 'webhook', config: { url: '' } }]
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['alertRules', workspace?.slug],
    queryFn: () => listAlertRules(workspace.slug),
    enabled: !!workspace?.slug
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', workspace?.slug],
    queryFn: () => getAlerts(workspace.slug, { limit: 50 }),
    enabled: !!workspace?.slug
  });

  const createMutation = useMutation({
    mutationFn: (data) => createAlertRule(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertRules']);
      setCreateOpen(false);
      setForm({
        name: '',
        enabled: true,
        conditionType: 'webhook_delivery_failed',
        conditionConfig: { threshold: 5, window: 300 },
        actions: [{ type: 'webhook', config: { url: '' } }]
      });
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to create')
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => deleteAlertRule(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertRules']);
      setDeleteRuleConfirm(null);
    }
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id) => deleteAlert(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      setDeleteAlertConfirm(null);
    }
  });

  const rules = rulesData?.data?.rules || [];
  const alerts = alertsData?.data?.alerts || [];

  if (rulesLoading || alertsLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Alerts</h1>
          <p className="text-devrelay-text-dim mt-1">Monitor and get notified about issues</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim"
        >
          <Plus className="w-4 h-4" />
          Create Alert Rule
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'rules', label: 'Rules', icon: AlertTriangle, count: rules.length },
          { key: 'alerts', label: 'History', icon: Bell, count: alerts.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              activeTab === tab.key 
                ? 'bg-devrelay-green/20 text-devrelay-green border border-devrelay-green/30' 
                : 'bg-devrelay-surface2 border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="text-xs px-1.5 py-0.5 bg-devrelay-bg rounded">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        rules.length === 0 ? (
          <EmptyState title="No alert rules" description="Create your first alert rule to get notified" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map(rule => (
              <div key={rule._id || rule.id} className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={rule.isEnabled ? 'success' : 'inactive'} label={rule.isEnabled ? 'Enabled' : 'Disabled'} />
                    <h3 className="text-lg font-semibold text-devrelay-text">{rule.name}</h3>
                  </div>
                  <button 
                    onClick={() => setDeleteRuleConfirm(rule)}
                    className="p-2 hover:bg-devrelay-border rounded"
                  >
                    <Trash2 className="w-4 h-4 text-devrelay-red" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-devrelay-text-dim">Condition</span>
                    <span className="text-devrelay-text">
                      {conditionTypes.find(c => c.value === rule.conditionType)?.label || rule.conditionType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-devrelay-text-dim">Threshold</span>
                    <span className="text-devrelay-text">{rule.conditionConfig?.threshold || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-devrelay-text-dim">Actions</span>
                    <span className="text-devrelay-text">{rule.actions?.length || 0} configured</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'alerts' && (
        alerts.length === 0 ? (
          <EmptyState title="No alerts" description="Alert history will appear here" />
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert._id || alert.id} className="flex items-center gap-4 p-4 bg-devrelay-surface border border-devrelay-border rounded-lg">
                <StatusBadge status={alert.status === 'firing' ? 'error' : 'success'} label={alert.status} />
                <div className="flex-1">
                  <p className="text-devrelay-text">{alert.ruleName || alert.name}</p>
                  <p className="text-devrelay-text-dim text-sm">{formatJson(alert.data)}</p>
                </div>
                <span className="text-devrelay-text-dim text-sm">{formatRelative(alert.createdAt)}</span>
                <button 
                  onClick={() => setDeleteAlertConfirm(alert)}
                  className="p-2 hover:bg-devrelay-border rounded"
                >
                  <Trash2 className="w-4 h-4 text-devrelay-red" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Create Alert Rule">
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
              placeholder="High Failure Rate"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Condition Type</label>
            <select
              value={form.conditionType}
              onChange={(e) => setForm({ ...form, conditionType: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
            >
              {conditionTypes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Threshold</label>
              <input
                type="number"
                value={form.conditionConfig.threshold}
                onChange={(e) => setForm({ ...form, conditionConfig: { ...form.conditionConfig, threshold: parseInt(e.target.value) } })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              />
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Window (seconds)</label>
              <input
                type="number"
                value={form.conditionConfig.window}
                onChange={(e) => setForm({ ...form, conditionConfig: { ...form.conditionConfig, window: parseInt(e.target.value) } })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Actions</label>
            {form.actions.map((action, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select
                  value={action.type}
                  onChange={(e) => {
                    const newActions = [...form.actions];
                    newActions[i].type = e.target.value;
                    setForm({ ...form, actions: newActions });
                  }}
                  className="flex-1 bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                >
                  {actionTypes.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                {action.type === 'webhook' && (
                  <input
                    type="url"
                    value={action.config?.url || ''}
                    onChange={(e) => {
                      const newActions = [...form.actions];
                      newActions[i].config = { url: e.target.value };
                      setForm({ ...form, actions: newActions });
                    }}
                    className="flex-1 bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
                    placeholder="https://..."
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-devrelay-border"
            />
            <label htmlFor="enabled" className="text-sm text-devrelay-text">Enable immediately</label>
          </div>

          <button
            onClick={() => createMutation.mutate(form)}
            disabled={createMutation.isPending || !form.name}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Alert Rule'}
          </button>
        </div>
      </SlideOver>

      <ConfirmModal
        open={!!deleteRuleConfirm}
        onClose={() => setDeleteRuleConfirm(null)}
        onConfirm={() => deleteRuleMutation.mutate(deleteRuleConfirm._id || deleteRuleConfirm.id)}
        title="Delete Alert Rule"
        description={`Are you sure you want to delete "${deleteRuleConfirm?.name}"?`}
        confirmLabel="Delete"
        danger
      />

      <ConfirmModal
        open={!!deleteAlertConfirm}
        onClose={() => setDeleteAlertConfirm(null)}
        onConfirm={() => deleteAlertMutation.mutate(deleteAlertConfirm._id || deleteAlertConfirm.id)}
        title="Delete Alert"
        description="Are you sure you want to delete this alert?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}