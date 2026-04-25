import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Mail, Webhook, AlertTriangle, Info, AlertCircle, CheckCircle, X, Play, XCircle, Clock } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { listAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, testAlertRule, getAlerts, deleteAlert } from '../../api/resources/alerts';
import { formatRelative, formatJson } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

const severityColors = {
  critical: 'bg-devrelay-red/20 text-devrelay-red border border-devrelay-red/30',
  warning: 'bg-devrelay-amber/20 text-devrelay-amber border border-devrelay-amber/30',
  info: 'bg-devrelay-blue/20 text-devrelay-blue border border-devrelay-blue/30'
};

const metricOptions = [
  { value: 'webhook_failure_rate', label: 'Webhook Failure Rate' },
  { value: 'job_failure_rate', label: 'Job Failure Rate' },
  { value: 'queue_depth', label: 'Queue Depth' },
  { value: 'endpoint_consecutive_failures', label: 'Consecutive failures' },
  { value: 'cron_missed', label: 'Cron Jobs Missed' }
];

const operators = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '=', label: '=' }
];

function RuleCard({ rule, onEdit, onDelete, onTest }) {
  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-4 hover:border-devrelay-green/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-sm font-medium rounded ${severityColors[rule.severity]}`}>
            {rule.severity?.toUpperCase() || 'INFO'}
          </span>
          <h3 className="text-lg font-semibold text-devrelay-text">{rule.name}</h3>
        </div>
        <button
          onClick={() => onTest(rule)}
          className="p-2 hover:bg-devrelay-border rounded"
          title="Test"
        >
          <Play className="w-4 h-4 text-devrelay-amber" />
        </button>
      </div>
      
      <p className="text-devrelay-text-dim text-sm mb-3">
        {metricOptions.find(m => m.value === rule.conditionType)?.label || rule.conditionType}{' '}
        {rule.conditionConfig?.operator || '>'} {rule.conditionConfig?.threshold || 0}
        {' over '}{(rule.conditionConfig?.window || 300) / 60} minutes
      </p>
      
      <div className="flex items-center gap-4 mb-3 text-sm">
        <div className="flex items-center gap-2">
          {rule.actions?.map((a, i) => (
            <span key={i} className="flex items-center gap-1 text-devrelay-text-dim">
              {a.type === 'email' ? <Mail className="w-3 h-3" /> : <Webhook className="w-3 h-3" />}
              {a.type}
            </span>
          ))}
        </div>
        <span className="text-devrelay-text-dim">
          Last fired: {rule.lastFiredAt ? formatRelative(rule.lastFiredAt) : 'Never'}
        </span>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-devrelay-border">
        <div className="flex items-center gap-2">
          <span className="text-devrelay-text-dim text-sm">Active</span>
          <span className={`w-3 h-3 rounded-full ${rule.isEnabled ? 'bg-devrelay-green' : 'bg-devrelay-border'}`} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(rule)} className="text-sm text-devrelay-text-dim hover:text-devrelay-green flex items-center gap-1">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => onDelete(rule)} className="text-sm text-devrelay-text-dim hover:text-devrelay-red flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ alert }) {
  const severityIcon = alert.severity === 'critical' 
    ? <AlertCircle className="w-5 h-5 text-devrelay-red" />
    : alert.severity === 'warning'
    ? <AlertTriangle className="w-5 h-5 text-devrelay-amber" />
    : <Info className="w-5 h-5 text-devrelay-blue" />;

  return (
    <div className="flex items-center gap-4 p-4 bg-devrelay-surface border border-devrelay-border rounded-lg">
      {severityIcon}
      <div className="flex-1">
        <p className="text-devrelay-text font-medium">{alert.ruleName}</p>
        <p className="text-devrelay-text-dim text-sm">
          Fired at {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '-'}
          {alert.value !== undefined && `, value was ${alert.value}`}
          {alert.threshold !== undefined && ` (threshold ${alert.threshold})`}
        </p>
      </div>
      <StatusBadge status={alert.status === 'firing' ? 'error' : 'success'} label={alert.status} />
    </div>
  );
}

export default function Alerts() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('rules');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [deleteRuleConfirm, setDeleteRuleConfirm] = useState(null);
  const [deleteAlertConfirm, setDeleteAlertConfirm] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const [form, setForm] = useState({
    name: '', description: '', isEnabled: true,
    conditionType: 'webhook_failure_rate',
    conditionConfig: { operator: '>', threshold: 10, window: 300 },
    severity: 'warning',
    cooldown: 60,
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

  useSocketEvent('alert:fired', (payload) => {
    toast.error(`Alert: ${payload.ruleName}`, { duration: 8000 });
    queryClient.invalidateQueries(['alerts']);
  });

  useSocketEvent('alert:resolved', (payload) => {
    queryClient.invalidateQueries(['alerts']);
  });

  const createMutation = useMutation({
    mutationFn: (data) => createAlertRule(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertRules']);
      setCreateOpen(false);
      resetForm();
      toast.success('Alert rule created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateAlertRule(workspace.slug, editRule._id || editRule.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertRules']);
      setEditRule(null);
      setCreateOpen(false);
      resetForm();
      toast.success('Alert rule updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => deleteAlertRule(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertRules']);
      setDeleteRuleConfirm(null);
    }
  });

  const testMutation = useMutation({
    mutationFn: (id) => testAlertRule(workspace.slug, id),
    onSuccess: (res) => {
      setTestResult(res.data);
      toast.success(`Current value: ${res.data?.currentValue}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id) => deleteAlert(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      setDeleteAlertConfirm(null);
    }
  });

  const resetForm = () => {
    setForm({
      name: '', description: '', isEnabled: true,
      conditionType: 'webhook_failure_rate',
      conditionConfig: { operator: '>', threshold: 10, window: 300 },
      severity: 'warning',
      cooldown: 60,
      actions: [{ type: 'webhook', config: { url: '' } }]
    });
    setTestResult(null);
  };

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
          { key: 'rules', label: 'Alert Rules', count: rules.length },
          { key: 'history', label: 'Alert History', count: alerts.length }
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
            {tab.label}
            <span className="text-xs px-1.5 py-0.5 bg-devrelay-bg rounded">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.length === 0 ? (
            <div className="col-span-2">
              <EmptyState title="No alert rules" description="Create your first alert rule to get notified" />
            </div>
          ) : rules.map(rule => (
            <RuleCard
              key={rule._id || rule.id}
              rule={rule}
              onEdit={(r) => { setEditRule(r); setForm(r); setCreateOpen(true); }}
              onDelete={(r) => setDeleteRuleConfirm(r)}
              onTest={(r) => testMutation.mutate(r._id || r.id)}
            />
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <EmptyState title="No alerts" description="Alert history will appear here" />
          ) : alerts.map(alert => (
            <AlertItem key={alert._id || alert.id} alert={alert} />
          ))}
        </div>
      )}

      <SlideOver 
        open={createOpen} 
        onClose={() => { setCreateOpen(false); setEditRule(null); resetForm(); }} 
        title={editRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              placeholder="High Failure Rate"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Metric</label>
              <select
                value={form.conditionType}
                onChange={(e) => setForm({ ...form, conditionType: e.target.value })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text text-sm"
              >
                {metricOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Operator</label>
              <select
                value={form.conditionConfig.operator}
                onChange={(e) => setForm({ ...form, conditionConfig: { ...form.conditionConfig, operator: e.target.value } })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text text-sm"
              >
                {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Threshold</label>
              <input
                type="number"
                value={form.conditionConfig.threshold}
                onChange={(e) => setForm({ ...form, conditionConfig: { ...form.conditionConfig, threshold: parseInt(e.target.value) } })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Window (minutes)</label>
              <p className="text-xs text-devrelay-text-dim mb-1">Evaluate over last N minutes</p>
              <input
                type="number"
                value={(form.conditionConfig.window || 300) / 60}
                onChange={(e) => setForm({ ...form, conditionConfig: { ...form.conditionConfig, window: parseInt(e.target.value) * 60 } })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text"
              />
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Cooldown (minutes)</label>
              <input
                type="number"
                value={form.cooldown / 60}
                onChange={(e) => setForm({ ...form, cooldown: parseInt(e.target.value) * 60 })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Severity</label>
            <div className="flex gap-2">
              {[{ value: 'info', label: 'Info', color: severityColors.info }, { value: 'warning', label: 'Warning', color: severityColors.warning }, { value: 'critical', label: 'Critical', color: severityColors.critical }].map(s => (
                <button
                  key={s.value}
                  onClick={() => setForm({ ...form, severity: s.value })}
                  className={`flex-1 py-2 rounded text-sm ${form.severity === s.value ? s.color : 'bg-devrelay-surface2 border border-devrelay-border text-devrelay-text-dim'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Channels</label>
            {form.actions.map((action, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select
                  value={action.type}
                  onChange={(e) => {
                    const newActions = [...form.actions];
                    newActions[i].type = e.target.value;
                    setForm({ ...form, actions: newActions });
                  }}
                  className="bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text"
                >
                  <option value="webhook">Webhook</option>
                  <option value="email">Email</option>
                </select>
                <input
                  type="url"
                  value={action.config?.url || action.config?.email || ''}
                  onChange={(e) => {
                    const newActions = [...form.actions];
                    newActions[i].config = action.type === 'email' 
                      ? { email: e.target.value }
                      : { url: e.target.value };
                    setForm({ ...form, actions: newActions });
                  }}
                  className="flex-1 bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text font-mono text-sm"
                  placeholder={action.type === 'email' ? 'email@example.com' : 'https://...'}
                />
                {form.actions.length > 1 && (
                  <button onClick={() => {
                    const newActions = form.actions.filter((_, x) => x !== i);
                    setForm({ ...form, actions: newActions });
                  }} className="p-2 hover:bg-devrelay-border rounded">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setForm({ ...form, actions: [...form.actions, { type: 'webhook', config: { url: '' } }] })}
              className="text-sm text-devrelay-text-dim hover:text-devrelay-green"
            >
              + Add Channel
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={form.isEnabled}
              onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="enabled" className="text-sm text-devrelay-text">Enable immediately</label>
          </div>

          <button
            onClick={() => editRule ? updateMutation.mutate(form) : createMutation.mutate(form)}
            disabled={createMutation.isPending || !form.name}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving...' : editRule ? 'Update Alert Rule' : 'Create Alert Rule'}
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