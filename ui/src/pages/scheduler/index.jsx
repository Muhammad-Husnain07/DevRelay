import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { Play, Pause, Trash2, History, Plus, AlertCircle, Clock, CheckCircle, XCircle, Globe, Zap, Bell, Calendar, HelpCircle, Code, FileJson } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listScheduledJobs, createScheduledJob, toggleScheduledJob, deleteScheduledJob, runScheduledJobNow } from '../../api/resources/scheduler';
import { formatRelative, formatCountdown, truncate, formatDateTime, validateCron } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'Runs once daily at midnight' },
  { label: 'Every day at 6 AM', value: '0 6 * * *', description: 'Runs once daily at 6:00 AM' },
  { label: 'Every day at noon', value: '0 12 * * *', description: 'Runs once daily at 12:00 PM' },
  { label: 'Every Monday', value: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM' },
  { label: 'Every month', value: '0 0 1 * *', description: 'Runs on the 1st of every month' },
];

const ACTION_TYPES = [
  { 
    id: 'http', 
    label: 'HTTP Request', 
    icon: Globe, 
    description: 'Make an HTTP call to a URL',
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'job', 
    label: 'Enqueue Job', 
    icon: Zap, 
    description: 'Add a job to the queue',
    color: 'from-purple-500 to-pink-500'
  },
  { 
    id: 'event', 
    label: 'Webhook Event', 
    icon: Bell, 
    description: 'Trigger a webhook event',
    color: 'from-amber-500 to-orange-500'
  },
];

const JOB_HANDLERS = [
  { value: 'log-message', label: 'Log Message', description: 'Simply logs a message' },
  { value: 'send-email', label: 'Send Email', description: 'Send an email via SMTP' },
  { value: 'http-request', label: 'HTTP Request', description: 'Make an HTTP call' },
  { value: 'webhook-call', label: 'Webhook Call', description: 'Trigger another webhook' },
];

const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Singapore', 'Australia/Sydney'
];

function CountdownTimer({ date }) {
  const [countdown, setCountdown] = useState(formatCountdown(date));

  useEffect(() => {
    if (!date) return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(date));
    }, 1000);
    return () => clearInterval(interval);
  }, [date]);

  return <span className="text-devrelay-text font-mono">{countdown}</span>;
}

function CronPreview({ expression, timezone, workspaceSlug }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const debounced = useDebounce(expression, 500);

  useEffect(() => {
    if (!debounced || debounced.length < 5 || !workspaceSlug) {
      setPreview(null);
      setError(null);
      return;
    }

    validateCron(debounced, workspaceSlug)
      .then(data => {
        if (data.valid) {
          setPreview(data);
          setError(null);
        } else {
          const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || 'Invalid cron expression');
          setError(errorMsg);
          setPreview(null);
        }
      })
      .catch(() => {
        setError('Failed to validate');
        setPreview(null);
      });
  }, [debounced, workspaceSlug]);

  if (!expression) return null;

  return (
    <div className="mt-3">
      {error ? (
        <div className="flex items-center gap-2 bg-devrelay-red/10 border border-devrelay-red/30 rounded-lg p-3">
          <XCircle className="w-4 h-4 text-devrelay-red flex-shrink-0" />
          <p className="text-sm text-devrelay-red">{error}</p>
        </div>
      ) : preview ? (
        <div className="bg-devrelay-green/10 border border-devrelay-green/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-devrelay-green" />
            <span className="text-devrelay-text font-medium">{preview.description}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {preview.nextRuns?.slice(0, 4).map((run, i) => (
              <div key={i} className="bg-devrelay-surface2 rounded px-3 py-2">
                <p className="text-xs text-devrelay-text-dim">Run #{i + 1}</p>
                <p className="text-xs text-devrelay-text font-mono">{new Date(run).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const PAYLOAD_TEMPLATES = {
  'send-email': [
    { label: 'Basic Email', payload: { to: 'user@example.com', subject: 'Hello', body: 'Your message here' } },
    { label: 'HTML Email', payload: { to: 'user@example.com', subject: 'Report', body: '<h1>Report</h1><p>Details...</p>', html: true } },
    { label: 'With Attachment', payload: { to: 'user@example.com', subject: 'Invoice', body: 'Please find invoice attached', attachments: ['invoice.pdf'] } }
  ],
  'http-request': [
    { label: 'GET Request', payload: { url: 'https://api.example.com/data', method: 'GET' } },
    { label: 'POST JSON', payload: { url: 'https://api.example.com/users', method: 'POST', body: { name: 'John', email: 'john@example.com' } } },
    { label: 'PUT Update', payload: { url: 'https://api.example.com/users/123', method: 'PUT', body: { name: 'Jane' } } }
  ],
  'webhook-call': [
    { label: 'GitHub Push', payload: { event: 'push', data: { repository: 'my-app', branch: 'main', commits: [] } } },
    { label: 'Slack Notification', payload: { event: 'slack.notify', data: { channel: '#alerts', message: 'Deployment complete' } } },
    { label: 'Custom Event', payload: { event: 'custom.event', data: { key: 'value' } } }
  ]
};

const HTTP_BODY_TEMPLATES = [
  { label: 'Empty', payload: '' },
  { label: 'JSON Data', payload: '{"name": "value"}' },
  { label: 'Form Data', payload: 'key1=value1&key2=value2' }
];

const EVENT_PAYLOAD_TEMPLATES = [
  { label: 'Empty Object', payload: {} },
  { label: 'With Data', payload: { data: { userId: 123, action: 'signup' } } },
  { label: 'With Metadata', payload: { data: {}, metadata: { source: 'scheduler', timestamp: '2024-01-01' } } }
];

function JsonEditor({ value, onChange, label, placeholder, templates }) {
  const [error, setError] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleChange = (val) => {
    onChange(val);
    if (!val.trim()) {
      setError(null);
      return;
    }
    try {
      JSON.parse(val);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const applyTemplate = (payload) => {
    onChange(JSON.stringify(payload, null, 2));
    setShowTemplates(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-devrelay-text-dim">{label}</label>
        {templates && templates.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs text-devrelay-green hover:underline flex items-center gap-1"
          >
            <FileJson className="w-3 h-3" />
            {showTemplates ? 'Hide' : 'Templates'}
          </button>
        )}
      </div>
      
      {showTemplates && templates && (
        <div className="mb-3 p-3 bg-devrelay-surface rounded-lg border border-devrelay-border">
          <div className="flex flex-wrap gap-2">
            {templates.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(t.payload)}
                className="px-3 py-1.5 text-xs bg-devrelay-surface2 rounded-lg text-devrelay-text hover:bg-devrelay-green/20 hover:text-devrelay-green transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-full bg-devrelay-surface2 border rounded-lg px-4 py-3 text-devrelay-text font-mono text-sm focus:outline-none min-h-[120px] ${
            error ? 'border-devrelay-red' : 'border-devrelay-border focus:border-devrelay-green'
          }`}
          placeholder={placeholder}
        />
        <div className="absolute bottom-3 right-3">
          <FileJson className={`w-4 h-4 ${error ? 'text-devrelay-red' : 'text-devrelay-text-dim'}`} />
        </div>
      </div>
      {error && <p className="text-xs text-devrelay-red mt-1">{error}</p>}
    </div>
  );
}

function CreateJobForm({ form, setForm, onSubmit, isPending, onClose, workspaceSlug }) {
  const [showPresets, setShowPresets] = useState(false);
  const [jsonError, setJsonError] = useState(null);

  const validateJson = (str) => {
    if (!str.trim()) return true;
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = () => {
    const payloadJson = form.actionType === 'job' ? form.jobPayload : form.eventPayload;
    if (!validateJson(payloadJson)) {
      setJsonError('Invalid JSON payload');
      return;
    }
    setJsonError(null);
    onSubmit();
  };

  const isValid = form.name && form.cronExpression && (
    form.actionType !== 'http' || form.httpUrl
  ) && (
    form.actionType !== 'job' ? true : form.jobName
  ) && (
    form.actionType !== 'event' ? true : form.eventType
  );

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-devrelay-green" />
          Schedule Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Job Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="e.g., Daily Backup, Weekly Report"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-devrelay-text-dim">Cron Expression *</label>
              <button 
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs text-devrelay-green hover:underline flex items-center gap-1"
              >
                {showPresets ? 'Hide' : 'Show'} Presets
              </button>
            </div>
            
            {showPresets && (
              <div className="mb-3 p-3 bg-devrelay-surface rounded-lg border border-devrelay-border">
                <div className="grid grid-cols-2 gap-2">
                  {CRON_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setForm({ ...form, cronExpression: preset.value })}
                      className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                        form.cronExpression === preset.value
                          ? 'bg-devrelay-green text-devrelay-bg'
                          : 'bg-devrelay-surface2 text-devrelay-text hover:bg-devrelay-border'
                      }`}
                    >
                      <div className="font-medium">{preset.label}</div>
                      <div className="text-xs opacity-70">{preset.value}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <input
              type="text"
              value={form.cronExpression}
              onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text font-mono focus:outline-none focus:border-devrelay-green"
              placeholder="* * * * *"
            />
            <CronPreview expression={form.cronExpression} timezone={form.timezone} workspaceSlug={workspaceSlug} />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
            >
              {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-devrelay-green" />
          Action Configuration
        </h3>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {ACTION_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setForm({ ...form, actionType: type.id })}
                className={`p-4 rounded-xl text-left transition-all ${
                  form.actionType === type.id
                    ? 'bg-devrelay-green/20 border-2 border-devrelay-green'
                    : 'bg-devrelay-surface border-2 border-devrelay-border hover:border-devrelay-green/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="font-medium text-devrelay-text">{type.label}</div>
                <div className="text-xs text-devrelay-text-dim mt-1">{type.description}</div>
              </button>
            );
          })}
        </div>

        {form.actionType === 'http' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">URL *</label>
              <input
                type="url"
                value={form.httpUrl}
                onChange={(e) => setForm({ ...form, httpUrl: e.target.value })}
                className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
                placeholder="https://api.example.com/webhook"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Method</label>
                <select
                  value={form.httpMethod}
                  onChange={(e) => setForm({ ...form, httpMethod: e.target.value })}
                  className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Timeout (seconds)</label>
                <input
                  type="number"
                  value={form.httpTimeout || 30}
                  onChange={(e) => setForm({ ...form, httpTimeout: parseInt(e.target.value) })}
                  className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
                  placeholder="30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Request Body (optional)</label>
              <textarea
                value={form.httpBody}
                onChange={(e) => setForm({ ...form, httpBody: e.target.value })}
                className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text font-mono text-sm focus:outline-none focus:border-devrelay-green min-h-[100px]"
                placeholder='{"key": "value"}'
              />
            </div>
          </div>
        )}

        {form.actionType === 'job' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Job Handler *</label>
              <select
                value={form.jobName}
                onChange={(e) => setForm({ ...form, jobName: e.target.value })}
                className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              >
                <option value="">Select a handler...</option>
                {JOB_HANDLERS.map(h => (
                  <option key={h.value} value={h.value}>{h.label} - {h.description}</option>
                ))}
              </select>
            </div>

            <JsonEditor
              value={form.jobPayload}
              onChange={(val) => setForm({ ...form, jobPayload: val })}
              label="Payload (JSON)"
              placeholder='{"to": "user@example.com", "subject": "Hello"}'
              templates={form.jobName ? PAYLOAD_TEMPLATES[form.jobName] : null}
            />
          </div>
        )}

        {form.actionType === 'event' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Event Type *</label>
              <input
                type="text"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
                placeholder="e.g., daily.summary, payment.completed"
              />
              <p className="text-xs text-devrelay-text-dim mt-1">A dot-separated event name</p>
            </div>

            <JsonEditor
              value={form.eventPayload}
              onChange={(val) => setForm({ ...form, eventPayload: val })}
              label="Event Payload (JSON)"
              placeholder='{"data": {"key": "value"}}'
              templates={EVENT_PAYLOAD_TEMPLATES}
            />
          </div>
        )}
      </div>

      {jsonError && (
        <div className="flex items-center gap-2 bg-devrelay-red/10 border border-devrelay-red/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-devrelay-red" />
          <span className="text-devrelay-red">{jsonError}</span>
        </div>
      )}

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
          onClick={handleSubmit}
          disabled={isPending || !isValid}
          className="flex-1 py-3 px-4 rounded-lg bg-devrelay-green text-devrelay-bg font-medium hover:bg-devrelay-green-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Creating...' : 'Create Scheduled Job'}
        </button>
      </div>
    </div>
  );
}

const methodColors = {
  GET: 'bg-devrelay-green/20 text-devrelay-green',
  POST: 'bg-devrelay-blue/20 text-devrelay-blue',
  PUT: 'bg-devrelay-amber/20 text-devrelay-amber',
  DELETE: 'bg-devrelay-red/20 text-devrelay-red'
};

export default function SchedulerList() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [form, setForm] = useState({
    name: '',
    cronExpression: '',
    timezone: 'UTC',
    actionType: 'http',
    httpUrl: '',
    httpMethod: 'GET',
    httpHeaders: [],
    httpBody: '',
    httpTimeout: 30,
    jobName: '',
    jobPayload: '{}',
    eventType: '',
    eventPayload: '{}'
  });

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['scheduler', workspace?.slug, debouncedSearch],
    queryFn: () => listScheduledJobs(workspace.slug, { search: debouncedSearch }),
    enabled: !!workspace?.slug
  });

  const createMutation = useMutation({
    mutationFn: (data) => createScheduledJob(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduler']);
      setCreateOpen(false);
      resetForm();
      toast.success('Scheduled job created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create')
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => toggleScheduledJob(workspace.slug, id),
    onSuccess: () => queryClient.invalidateQueries(['scheduler'])
  });

  const runNowMutation = useMutation({
    mutationFn: (id) => runScheduledJobNow(workspace.slug, id),
    onSuccess: () => toast.success('Job triggered'),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to trigger')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteScheduledJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduler']);
      setDeleteConfirm(null);
    }
  });

  const resetForm = () => {
    setForm({
      name: '', cronExpression: '', timezone: 'UTC', actionType: 'http',
      httpUrl: '', httpMethod: 'GET', httpHeaders: [], httpBody: '', httpTimeout: 30,
      jobName: '', jobPayload: '{}', eventType: '', eventPayload: '{}'
    });
  };

  const handleCreate = () => {
    if (!form.name || !form.cronExpression) return;
    const action = form.actionType === 'http' 
      ? { 
          type: 'http-request', 
          config: {
            url: form.httpUrl, 
            method: form.httpMethod || 'GET', 
            headers: form.httpHeaders, 
            body: form.httpBody,
            timeout: (form.httpTimeout || 30) * 1000
          }
        }
      : form.actionType === 'job'
      ? { type: 'enqueue-job', config: { name: form.jobName, handler: 'log-message', payload: JSON.parse(form.jobPayload || '{}') } }
      : { type: 'webhook-event', config: { eventType: form.eventType, payload: JSON.parse(form.eventPayload || '{}') } };
    
    const data = {
      name: form.name,
      cronExpression: form.cronExpression,
      timezone: form.timezone,
      action
    };
    createMutation.mutate(data);
  };

  const jobs = data?.data?.scheduledJobs || [];

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Cron Scheduler</h1>
          <p className="text-devrelay-text-dim mt-1">Schedule and manage recurring tasks</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-green-dim transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Scheduled Job
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search scheduled jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-devrelay-surface2 border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
          />
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState 
          title="No scheduled jobs" 
          description="Create your first scheduled job to automate recurring tasks"
          action={<button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 bg-devrelay-green text-devrelay-bg rounded-lg hover:bg-devrelay-green-dim">Create Scheduled Job</button>}
        />
      ) : (
        <div className="bg-devrelay-surface border border-devrelay-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-devrelay-border bg-devrelay-surface2">
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Name</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Schedule</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Action</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Last Run</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Next Run</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Status</th>
                <th className="text-right text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job._id || job.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/scheduler/${job._id || job.id}`} className="text-devrelay-text font-medium hover:text-devrelay-green transition-colors">
                      {job.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-devrelay-green text-sm bg-devrelay-green/10 px-2 py-1 rounded">{job.cronExpression}</code>
                      <span className="text-devrelay-text-dim text-xs">{job.timezone || 'UTC'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-devrelay-text-dim text-sm capitalize">
                      {job.action?.type === 'http-request' ? 'HTTP' : job.action?.type === 'enqueue-job' ? 'Job' : 'Event'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                    {job.lastRunAt ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelative(job.lastRunAt)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {job.isActive ? <CountdownTimer date={job.nextRunAt} /> : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={job.isActive ? 'success' : 'inactive'} label={job.isActive ? 'Active' : 'Paused'} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => runNowMutation.mutate(job._id || job.id)} 
                        className="p-2 hover:bg-devrelay-border rounded-lg transition-colors" 
                        title="Run Now"
                      >
                        <Play className="w-4 h-4 text-devrelay-green" />
                      </button>
                      <button 
                        onClick={() => toggleMutation.mutate(job._id || job.id)} 
                        className="p-2 hover:bg-devrelay-border rounded-lg transition-colors" 
                        title={job.isActive ? 'Pause' : 'Resume'}
                      >
                        {job.isActive ? <Pause className="w-4 h-4 text-devrelay-amber" /> : <Play className="w-4 h-4 text-devrelay-green" />}
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(job)} 
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

      <SlideOver 
        open={createOpen} 
        onClose={() => { setCreateOpen(false); resetForm(); }} 
        title="Create Scheduled Job"
      >
        <CreateJobForm 
          form={form} 
          setForm={setForm} 
          onSubmit={handleCreate}
          isPending={createMutation.isPending}
          onClose={() => { setCreateOpen(false); resetForm(); }}
          workspaceSlug={workspace?.slug}
        />
      </SlideOver>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm?._id || deleteConfirm?.id)}
        title="Delete Scheduled Job"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}