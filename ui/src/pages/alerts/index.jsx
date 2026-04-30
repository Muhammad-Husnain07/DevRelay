import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Mail, Webhook, AlertTriangle, Info, AlertCircle, CheckCircle, X, Play, XCircle, Clock, BarChart3, Bell, History, Settings } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSocketEvent } from '../../hooks/useSocket';
import { listAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, testAlertRule, getAlerts, deleteAlert } from '../../api/resources/alerts';
import { formatRelative, formatJson } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

const severityColors = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Critical' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Warning' },
  info: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Info' }
};

const metricOptions = [
  { value: 'webhook_failure_rate', label: 'Webhook Failure Rate', icon: '🌐', suffix: '%' },
  { value: 'job_failure_rate', label: 'Job Failure Rate', icon: '📋', suffix: '%' },
  { value: 'queue_depth', label: 'Queue Depth', icon: '📚', suffix: '' },
  { value: 'endpoint_consecutive_failures', label: 'Consecutive Failures', icon: '❌', suffix: '' },
  { value: 'cron_missed', label: 'Cron Jobs Missed', icon: '⏰', suffix: '' }
];

const operators = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '=', label: '=' }
];

const severityOptions = [
  { value: 'info', label: 'Info', ...severityColors.info },
  { value: 'warning', label: 'Warning', ...severityColors.warning },
  { value: 'critical', label: 'Critical', ...severityColors.critical }
];

function RuleCard({ rule, onEdit, onDelete, onTest }) {
  const condition = rule.condition || {};
  const conditionConfig = rule.conditionConfig || {
    operator: condition.operator ? { gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=' }[condition.operator] || '>' : '>',
    threshold: condition.threshold || 0,
    window: (condition.windowMinutes || 5) * 60
  };
  const metric = metricOptions.find(m => m.value === (rule.conditionType || condition.metric)) || { label: rule.conditionType || condition.metric, suffix: '' };
  const conditionStr = `${conditionConfig.operator} ${conditionConfig.threshold}${metric.suffix}`;
  const windowMinutes = conditionConfig.window / 60;

  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-5 hover:border-devrelay-green/50 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 text-sm font-medium rounded-lg ${severityColors[rule.severity]?.bg} ${severityColors[rule.severity]?.text} border ${severityColors[rule.severity]?.border}`}>
            {severityColors[rule.severity]?.label || 'INFO'}
          </span>
          <h3 className="text-lg font-semibold text-devrelay-text">{rule.name}</h3>
        </div>
        <button
          onClick={() => onTest(rule)}
          className="p-2 hover:bg-devrelay-border rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Test Rule"
        >
          <Play className="w-4 h-4 text-devrelay-amber" />
        </button>
      </div>
      
      <div className="bg-devrelay-surface2 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-devrelay-text mb-1">
          <span className="text-lg">{metric.icon}</span>
          <span className="font-medium">{metric.label}</span>
        </div>
        <p className="text-devrelay-text-dim text-sm pl-7">
          when {conditionStr} over {windowMinutes} minute{windowMinutes !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {rule.actions?.map((a, i) => (
              <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-devrelay-surface2 rounded-lg text-devrelay-text-dim">
                {a.type === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Webhook className="w-3.5 h-3.5" />}
                <span className="text-xs capitalize">{a.type}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-devrelay-text-dim">Last fired:</span>
            <span className="text-devrelay-text">{rule.lastFiredAt ? formatRelative(rule.lastFiredAt) : 'Never'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-devrelay-border">
        <div className="flex items-center gap-2">
          <span className="text-devrelay-text-dim text-sm">Status:</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${(rule.isActive || rule.isEnabled) ? 'bg-devrelay-green' : 'bg-devrelay-border'}`} />
            <span className={`text-sm font-medium ${(rule.isActive || rule.isEnabled) ? 'text-devrelay-green' : 'text-devrelay-text-dim'}`}>
              {(rule.isActive || rule.isEnabled) ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(rule)} className="px-3 py-1.5 text-sm text-devrelay-text-dim hover:text-devrelay-green hover:bg-devrelay-green/10 rounded-lg flex items-center gap-1.5 transition-colors">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => onDelete(rule)} className="px-3 py-1.5 text-sm text-devrelay-text-dim hover:text-devrelay-red hover:bg-devrelay-red/10 rounded-lg flex items-center gap-1.5 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ alert, onDelete }) {
  const severityIcon = alert.severity === 'critical' 
    ? <AlertCircle className="w-5 h-5 text-red-400" />
    : alert.severity === 'warning'
    ? <AlertTriangle className="w-5 h-5 text-amber-400" />
    : <Info className="w-5 h-5 text-blue-400" />;

  return (
    <div className="flex items-center gap-4 p-4 bg-devrelay-surface border border-devrelay-border rounded-xl hover:border-devrelay-border/80 transition-colors">
      <div className={`p-2 rounded-lg ${alert.severity === 'critical' ? 'bg-red-500/20' : alert.severity === 'warning' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
        {severityIcon}
      </div>
      <div className="flex-1">
        <p className="text-devrelay-text font-medium">{alert.ruleName}</p>
        <p className="text-devrelay-text-dim text-sm mt-0.5">
          Fired at {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '-'}
          {alert.value !== undefined && `, value was ${alert.value}`}
          {alert.threshold !== undefined && ` (threshold ${alert.threshold})`}
        </p>
      </div>
      <StatusBadge status={alert.status === 'firing' ? 'error' : 'success'} label={alert.status} />
      <button 
        onClick={() => onDelete(alert)} 
        className="p-2 hover:bg-devrelay-border rounded-lg transition-colors"
        title="Delete"
      >
        <Trash2 className="w-4 h-4 text-devrelay-text-dim hover:text-devrelay-red" />
      </button>
    </div>
  );
}

function CreateRuleForm({ form, setForm, onSubmit, isPending, onClose, isEdit }) {
  const addAction = () => {
    setForm({ ...form, actions: [...form.actions, { type: 'webhook', config: { url: '' } }] });
  };

  const removeAction = (index) => {
    setForm({ ...form, actions: form.actions.filter((_, i) => i !== index) });
  };

  const updateAction = (index, field, value) => {
    const newActions = [...form.actions];
    newActions[index][field] = value;
    if (field === 'type') {
      newActions[index].config = value === 'email' ? { email: '' } : { url: '' };
    }
    setForm({ ...form, actions: newActions });
  };

  const updateActionConfig = (index, value) => {
    const newActions = [...form.actions];
    newActions[index].config = form.actions[index].type === 'email' 
      ? { email: value }
      : { url: value };
    setForm({ ...form, actions: newActions });
  };

  const isValid = form.name && form.conditionConfig.threshold !== undefined;

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-devrelay-green" />
          Rule Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Rule Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="High Failure Rate Alert"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Metric to Monitor</label>
            <div className="grid grid-cols-1 gap-2">
              {metricOptions.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm({ ...form, conditionType: m.value })}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    form.conditionType === m.value
                      ? 'bg-devrelay-green/20 border-devrelay-green text-devrelay-text'
                      : 'bg-devrelay-surface border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span className="font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm text-devrelay-text-dim mb-2">Operator</label>
              <select
                value={form.conditionConfig.operator}
                onChange={(e) => setForm({ ...form, conditionConfig: { ...form.conditionConfig, operator: e.target.value } })}
                className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              >
                {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-devrelay-text-dim mb-2">Threshold</label>
              <input
                type="number"
                value={form.conditionConfig.threshold}
                onChange={(e) => setForm({ ...form, conditionConfig: { ...form.conditionConfig, threshold: parseInt(e.target.value) } })}
                className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Evaluation Window (min)</label>
              <input
                type="number"
                min="1"
                value={(form.conditionConfig.window || 300) / 60}
                onChange={(e) => setForm({ ...form, conditionConfig: { ...form.conditionConfig, window: parseInt(e.target.value) * 60 } })}
                className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              />
              <p className="text-xs text-devrelay-text-dim mt-1">Check over this period</p>
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Cooldown (min)</label>
              <input
                type="number"
                min="1"
                value={form.cooldown / 60}
                onChange={(e) => setForm({ ...form, cooldown: parseInt(e.target.value) * 60 })}
                className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              />
              <p className="text-xs text-devrelay-text-dim mt-1">Wait before re-alerting</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-devrelay-green" />
          Severity & Notification
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Severity Level</label>
            <div className="grid grid-cols-3 gap-2">
              {severityOptions.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm({ ...form, severity: s.value })}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                    form.severity === s.value 
                      ? `${s.bg} ${s.text} border ${s.border}`
                      : 'bg-devrelay-surface border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-3">Notification Channels</label>
            <div className="space-y-2">
              {form.actions.map((action, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(i, 'type', e.target.value)}
                    className="bg-devrelay-surface border border-devrelay-border rounded-lg px-3 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
                  >
                    <option value="webhook">Webhook</option>
                    <option value="email">Email</option>
                  </select>
                  <input
                    type="text"
                    value={action.config?.url || action.config?.email || ''}
                    onChange={(e) => updateActionConfig(i, e.target.value)}
                    className="flex-1 bg-devrelay-surface border border-devrelay-border rounded-lg px-3 py-2.5 text-devrelay-text font-mono text-sm focus:outline-none focus:border-devrelay-green"
                    placeholder={action.type === 'email' ? 'email@example.com' : 'https://...'}
                  />
                  {form.actions.length > 1 && (
                    <button onClick={() => removeAction(i)} className="p-2.5 hover:bg-devrelay-border rounded-lg transition-colors">
                      <X className="w-4 h-4 text-devrelay-text-dim hover:text-devrelay-red" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAction}
              className="mt-3 text-sm text-devrelay-green hover:underline flex items-center gap-1"
            >
              + Add Channel
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-devrelay-surface rounded-lg border border-devrelay-border">
            <input
              type="checkbox"
              id="enabled"
              checked={form.isEnabled}
              onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              className="w-5 h-5 rounded border-devrelay-border text-devrelay-green focus:ring-devrelay-green"
            />
            <label htmlFor="enabled" className="text-devrelay-text">Enable rule immediately</label>
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
          disabled={isPending || !isValid}
          className="flex-1 py-3 px-4 rounded-lg bg-devrelay-green text-devrelay-bg font-medium hover:bg-devrelay-green-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
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
    toast.error(`🚨 Alert: ${payload.ruleName}`, { duration: 8000 });
    queryClient.invalidateQueries(['alerts']);
  });

  useSocketEvent('alert:resolved', () => {
    queryClient.invalidateQueries(['alerts']);
  });

  const operatorMap = { '>': 'gt', '<': 'lt', '>=': 'gte', '<=': 'lte', '=': 'eq' };
  const reverseOperatorMap = { 'gt': '>', 'lt': '<', 'gte': '>=', 'lte': '<=', 'eq': '=' };
  
  const transformToBackend = (form) => ({
    name: form.name,
    description: form.description || '',
    isActive: form.isEnabled !== false,
    condition: {
      metric: form.conditionType,
      operator: operatorMap[form.conditionConfig?.operator] || 'gt',
      threshold: form.conditionConfig?.threshold || 0,
      windowMinutes: Math.floor((form.conditionConfig?.window || 300) / 60)
    },
    severity: form.severity || 'warning',
    cooldownMinutes: form.cooldown || 60,
    channels: form.actions || []
  });

  const transformFromBackend = (rule) => ({
    name: rule.name || '',
    description: rule.description || '',
    isEnabled: rule.isActive !== false,
    conditionType: rule.condition?.metric || rule.conditionType || 'webhook_failure_rate',
    conditionConfig: {
      operator: reverseOperatorMap[rule.condition?.operator] || rule.conditionConfig?.operator || '>',
      threshold: rule.condition?.threshold ?? rule.conditionConfig?.threshold ?? 10,
      window: (rule.condition?.windowMinutes ?? rule.conditionConfig?.window ?? 5) * 60
    },
    severity: rule.severity || 'warning',
    cooldown: rule.cooldownMinutes || 60,
    actions: rule.channels || rule.actions || []
  });

  const createMutation = useMutation({
    mutationFn: (data) => createAlertRule(workspace.slug, transformToBackend(data)),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertRules']);
      setCreateOpen(false);
      resetForm();
      toast.success('Alert rule created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateAlertRule(workspace.slug, editRule._id || editRule.id, transformToBackend(data)),
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
      toast.success('Rule deleted');
    }
  });

  const testMutation = useMutation({
    mutationFn: (id) => testAlertRule(workspace.slug, id),
    onSuccess: (res) => {
      toast.success(`Current value: ${res.data?.currentValue}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id) => deleteAlert(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      setDeleteAlertConfirm(null);
      toast.success('Alert deleted');
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
  };

  const handleSubmit = () => {
    if (editRule) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const rules = rulesData?.data?.rules || [];
  const alerts = alertsData?.data?.alerts || [];

  if (rulesLoading || alertsLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Alerts</h1>
          <p className="text-devrelay-text-dim mt-1">Monitor and get notified about system issues</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-green-dim transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Alert Rule
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'rules' 
              ? 'bg-devrelay-green/20 text-devrelay-green border border-devrelay-green/30' 
              : 'bg-devrelay-surface border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Alert Rules
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'rules' ? 'bg-devrelay-green/30' : 'bg-devrelay-surface2'}`}>
            {rules.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'history' 
              ? 'bg-devrelay-green/20 text-devrelay-green border border-devrelay-green/30' 
              : 'bg-devrelay-surface border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
          }`}
        >
          <History className="w-4 h-4" />
          Alert History
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'history' ? 'bg-devrelay-green/30' : 'bg-devrelay-surface2'}`}>
            {alerts.length}
          </span>
        </button>
      </div>

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.length === 0 ? (
            <div className="col-span-2">
              <EmptyState 
                title="No alert rules" 
                description="Create your first alert rule to get notified about system issues"
                action={<button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 bg-devrelay-green text-devrelay-bg rounded-lg hover:bg-devrelay-green-dim">Create Alert Rule</button>}
              />
            </div>
          ) : rules.map(rule => (
            <RuleCard
              key={rule._id || rule.id}
              rule={rule}
              onEdit={(r) => { setEditRule(r); setForm(transformFromBackend(r)); setCreateOpen(true); }}
              onDelete={(r) => setDeleteRuleConfirm(r)}
              onTest={(r) => testMutation.mutate(r._id || r.id)}
            />
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <EmptyState 
              title="No alerts" 
              description="Alert history will appear here when rules are triggered"
            />
          ) : alerts.map(alert => (
            <AlertItem 
              key={alert._id || alert.id} 
              alert={alert} 
              onDelete={(a) => setDeleteAlertConfirm(a)}
            />
          ))}
        </div>
      )}

      <SlideOver 
        open={createOpen} 
        onClose={() => { setCreateOpen(false); setEditRule(null); resetForm(); }} 
        title={editRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
      >
        <CreateRuleForm 
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={() => { setCreateOpen(false); setEditRule(null); resetForm(); }}
          isEdit={!!editRule}
        />
      </SlideOver>

      <ConfirmModal
        open={!!deleteRuleConfirm}
        onClose={() => setDeleteRuleConfirm(null)}
        onConfirm={() => deleteRuleMutation.mutate(deleteRuleConfirm._id || deleteRuleConfirm.id)}
        title="Delete Alert Rule"
        description={`Are you sure you want to delete "${deleteRuleConfirm?.name}"? This will stop all alerts for this rule.`}
        confirmLabel="Delete"
        danger
      />

      <ConfirmModal
        open={!!deleteAlertConfirm}
        onClose={() => setDeleteAlertConfirm(null)}
        onConfirm={() => deleteAlertMutation.mutate(deleteAlertConfirm._id || deleteAlertConfirm.id)}
        title="Delete Alert"
        description="Are you sure you want to delete this alert from history?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}