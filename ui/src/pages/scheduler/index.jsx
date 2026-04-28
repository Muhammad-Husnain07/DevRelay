import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { Play, Pause, Trash2, History, Plus, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listScheduledJobs, createScheduledJob, toggleScheduledJob, deleteScheduledJob, runScheduledJobNow } from '../../api/resources/scheduler';
import { formatRelative, formatCountdown, truncate, formatDateTime, validateCron } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

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

function CronPreview({ expression, timezone }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const debounced = useDebounce(expression, 500);

  useEffect(() => {
    if (!debounced || debounced.length < 5) {
      setPreview(null);
      setError(null);
      return;
    }

    validateCron(debounced)
      .then(data => {
        if (!data || typeof data !== 'object') {
          setError('Unexpected response');
          setPreview(null);
          return;
        }
        if (data.valid === true && data.valid !== false) {
          setPreview({
            description: String(data.description || ''),
            nextRuns: Array.isArray(data.nextRuns) ? data.nextRuns : []
          });
          setError(null);
        } else {
          setError(String(data.error || data.message || 'Invalid cron expression'));
          setPreview(null);
        }
      })
      .catch(err => {
        setError(String(err?.message || 'Validation failed'));
        setPreview(null);
      });
  }, [debounced]);

  if (!expression) return null;

  return (
    <div className="mt-2">
      {error && (
        <p className="text-sm text-devrelay-red mb-2">{error}</p>
      )}
      {preview && (
        <div className="bg-devrelay-surface2 rounded p-3 space-y-2">
          <p className="text-devrelay-text text-sm">{preview.description}</p>
          {preview.nextRuns?.length > 0 && (
            <div>
              <p className="text-devrelay-text-dim text-xs mb-1">Next runs:</p>
              <div className="space-y-1">
                {preview.nextRuns.slice(0, 5).map((run, i) => (
                  <p key={i} className="text-devrelay-text-dim text-xs font-mono">
                    {new Date(run).toLocaleString()}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Singapore', 'Australia/Sydney'
];

const cronPresets = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 30 sec', value: '*/30 * * * * *' },
  { label: 'Every 5 min', value: '*/5 * * * *' },
  { label: 'Every 15 min', value: '*/15 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every day midnight', value: '0 0 * * *' },
  { label: 'Every day 2am', value: '0 2 * * *' },
  { label: 'Every Monday', value: '0 0 * * 1' },
  { label: 'Every month 1st', value: '0 0 1 * *' },
];

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

  const jobTemplates = [
    { id: 'log-message', name: 'Log Message', description: 'Log a message to console', handler: 'log-message', config: { message: '' } },
    { id: 'send-email', name: 'Send Email', description: 'Send an email notification', handler: 'send-email', config: { to: '', subject: '', body: '' } },
    { id: 'http-request', name: 'HTTP Request', description: 'Call external API', handler: 'http-request', config: { url: '', method: 'GET', headers: {}, body: '' } },
    { id: 'webhook-call', name: 'Webhook Call', description: 'Call a webhook', handler: 'webhook-call', config: { url: '', payload: {} } },
  ];

  const eventTemplates = [
    { id: 'daily.summary', name: 'Daily Summary', eventType: 'daily.summary', payload: {} },
    { id: 'hourly.health', name: 'Hourly Health Check', eventType: 'hourly.health', payload: {} },
    { id: 'weekly.report', name: 'Weekly Report', eventType: 'weekly.report', payload: {} },
    { id: 'custom', name: 'Custom Event', eventType: '', payload: {} },
  ];

  const [form, setForm] = useState({
    name: '',
    cronExpression: '',
    timezone: 'UTC',
    actionType: 'http',
    httpUrl: '',
    httpMethod: 'GET',
    httpHeaders: [],
    httpBody: '',
    jobHandler: 'log-message',
    jobConfig: { message: '' },
    eventType: 'daily.summary',
    eventPayload: '{}'
  });

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['scheduler', workspace?.slug, debouncedSearch],
    queryFn: () => listScheduledJobs(workspace.slug, { search: debouncedSearch }),
    enabled: !!workspace?.slug,
    staleTime: 0
  });

  const rawData = data?.data || data;
  const jobs = rawData?.scheduledJobs || data?.scheduledJobs || [];

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
      httpUrl: '', httpMethod: 'GET', httpHeaders: [], httpBody: '',
      jobName: '', jobPayload: '{}', eventType: '', eventPayload: '{}'
    });
  };

  const handleCreate = () => {
    if (!form.name || !form.cronExpression) return;
    let action;
    if (form.actionType === 'http') {
      action = { type: 'http-request', url: form.httpUrl, method: form.httpMethod, headers: [], body: form.httpBody };
    } else if (form.actionType === 'job') {
      action = { type: 'enqueue-job', handler: form.jobHandler, config: form.jobConfig };
    } else {
      action = { type: 'webhook-event', eventType: form.eventType, payload: typeof form.eventPayload === 'string' ? JSON.parse(form.eventPayload) : form.eventPayload };
    }
    createMutation.mutate({
      name: form.name,
      cronExpression: form.cronExpression,
      timezone: form.timezone,
      action
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Cron Scheduler</h1>
          <p className="text-devrelay-text-dim mt-1">Scheduled job management</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim"
        >
          <Plus className="w-4 h-4" />
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
            className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none focus:border-devrelay-green"
          />
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No scheduled jobs" description="Create a cron job to run tasks on a schedule" />
      ) : (
        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-devrelay-border">
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Name</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Cron</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Timezone</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Last Run</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Next Run</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Status</th>
                <th className="text-right text-sm text-devrelay-text-dim px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job._id || job.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2">
                  <td className="px-6 py-4">
                    <Link to={`/scheduler/${job._id || job.id}`} className="text-devrelay-text font-medium hover:text-devrelay-green">
                      {job.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-devrelay-green font-mono text-sm">{job.cronExpression}</td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">{job.timezone || 'UTC'}</td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">{job.lastRunAt ? formatRelative(job.lastRunAt) : '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    {job.isActive ? <CountdownTimer date={job.nextRunAt} /> : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={job.isActive ? 'success' : 'inactive'} label={job.isActive ? 'Active' : 'Paused'} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => runNowMutation.mutate(job._id || job.id)} 
                        className="p-2 hover:bg-devrelay-border rounded" 
                        title="Run Now"
                      >
                        <Play className="w-4 h-4 text-devrelay-green" />
                      </button>
                      <button 
                        onClick={() => toggleMutation.mutate(job._id || job.id)} 
                        className="p-2 hover:bg-devrelay-border rounded" 
                        title={job.isActive ? 'Pause' : 'Resume'}
                      >
                        {job.isActive ? <Pause className="w-4 h-4 text-devrelay-amber" /> : <Play className="w-4 h-4 text-devrelay-green" />}
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(job)} 
                        className="p-2 hover:bg-devrelay-border rounded" 
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

      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Create Scheduled Job">
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
              placeholder="Daily Backup"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Cron Expression *</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {cronPresets.slice(0, 4).map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setForm({ ...form, cronExpression: preset.value })}
                  className={`text-xs px-2 py-1 rounded ${
                    form.cronExpression === preset.value
                      ? 'bg-devrelay-green text-devrelay-bg'
                      : 'bg-devrelay-surface2 border border-devrelay-border text-devrelay-text-dim'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.cronExpression}
              onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono focus:outline-none"
              placeholder="0 2 * * *"
            />
            <CronPreview expression={form.cronExpression} timezone={form.timezone} />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
            >
              {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Action Type</label>
            <div className="flex gap-2">
              {['http', 'job', 'event'].map(type => (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, actionType: type })}
                  className={`flex-1 py-2 rounded text-sm ${
                    form.actionType === type 
                      ? 'bg-devrelay-green text-devrelay-bg' 
                      : 'bg-devrelay-surface2 border border-devrelay-border text-devrelay-text-dim'
                  }`}
                >
                  {type === 'http' ? 'HTTP Request' : type === 'job' ? 'Enqueue Job' : 'Webhook Event'}
                </button>
              ))}
            </div>
          </div>

          {form.actionType === 'http' && (
            <>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">URL *</label>
                <input
                  type="url"
                  value={form.httpUrl}
                  onChange={(e) => setForm({ ...form, httpUrl: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
                  placeholder="https://example.com/api"
                />
              </div>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Method</label>
                <select
                  value={form.httpMethod}
                  onChange={(e) => setForm({ ...form, httpMethod: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </>
          )}

          {form.actionType === 'job' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Job Template</label>
                <select
                  value={form.jobHandler}
                  onChange={(e) => {
                    const tpl = jobTemplates.find(t => t.id === e.target.value);
                    setForm({ ...form, jobHandler: e.target.value, jobConfig: { ...tpl.config } });
                  }}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                >
                  {jobTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} - {t.description}</option>
                  ))}
                </select>
              </div>
              {form.jobHandler === 'log-message' && (
                <div>
                  <label className="block text-sm text-devrelay-text-dim mb-2">Log Message</label>
                  <input
                    type="text"
                    value={form.jobConfig.message}
                    onChange={(e) => setForm({ ...form, jobConfig: { ...form.jobConfig, message: e.target.value } })}
                    className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                    placeholder="Task completed successfully"
                  />
                </div>
              )}
              {form.jobHandler === 'send-email' && (
                <>
                  <div>
                    <label className="block text-sm text-devrelay-text-dim mb-2">To Email</label>
                    <input
                      type="email"
                      value={form.jobConfig.to}
                      onChange={(e) => setForm({ ...form, jobConfig: { ...form.jobConfig, to: e.target.value } })}
                      className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-devrelay-text-dim mb-2">Subject</label>
                    <input
                      type="text"
                      value={form.jobConfig.subject}
                      onChange={(e) => setForm({ ...form, jobConfig: { ...form.jobConfig, subject: e.target.value } })}
                      className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                      placeholder="Scheduled Report"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-devrelay-text-dim mb-2">Body</label>
                    <textarea
                      value={form.jobConfig.body}
                      onChange={(e) => setForm({ ...form, jobConfig: { ...form.jobConfig, body: e.target.value } })}
                      className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text h-24"
                      placeholder="Email body..."
                    />
                  </div>
                </>
              )}
              {form.jobHandler === 'http-request' && (
                <>
                  <div>
                    <label className="block text-sm text-devrelay-text-dim mb-2">URL</label>
                    <input
                      type="url"
                      value={form.jobConfig.url}
                      onChange={(e) => setForm({ ...form, jobConfig: { ...form.jobConfig, url: e.target.value } })}
                      className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                      placeholder="https://api.example.com/webhook"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-devrelay-text-dim mb-2">Method</label>
                    <select
                      value={form.jobConfig.method}
                      onChange={(e) => setForm({ ...form, jobConfig: { ...form.jobConfig, method: e.target.value } })}
                      className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>
                </>
              )}
              {form.jobHandler === 'webhook-call' && (
                <>
                  <div>
                    <label className="block text-sm text-devrelay-text-dim mb-2">Webhook URL</label>
                    <input
                      type="url"
                      value={form.jobConfig.url}
                      onChange={(e) => setForm({ ...form, jobConfig: { ...form.jobConfig, url: e.target.value } })}
                      className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                      placeholder="https://hooks.slack.com/..."
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {form.actionType === 'event' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Event Template</label>
                <select
                  value={form.eventType}
                  onChange={(e) => {
                    const tpl = eventTemplates.find(t => t.id === e.target.value) || eventTemplates[3];
                    setForm({ ...form, eventType: tpl.eventType, eventPayload: tpl.payload });
                  }}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                >
                  {eventTemplates.map(t => (
                    <option key={t.id} value={t.id === 'custom' ? 'custom' : t.eventType}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Event Type</label>
                <input
                  type="text"
                  value={form.eventType}
                  onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                  placeholder="daily.summary"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !form.name || !form.cronExpression}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Scheduled Job'}
          </button>
        </div>
      </SlideOver>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm._id || deleteConfirm.id)}
        title="Delete Scheduled Job"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}