import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../useDebounce';
import { Play, Pause, Trash2, History, Plus, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listScheduledJobs, createScheduledJob, toggleScheduledJob, deleteScheduledJob, runScheduledJobNow } from '../../api/resources/scheduler';
import { formatRelative, formatCountdown, truncate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';

function Countdown({ date }) {
  const [countdown, setCountdown] = useState(formatCountdown(date));

  useEffect(() => {
    if (!date) return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(date));
    }, 1000);
    return () => clearInterval(interval);
  }, [date]);

  return <span className="text-devrelay-text">{countdown}</span>;
}

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
    jobName: '',
    jobPayload: '{}',
    eventType: '',
    eventPayload: '{}'
  });
  const [cronError, setCronError] = useState(null);
  const [cronPreview, setCronPreview] = useState(null);

  const debouncedCron = useDebounce(form.cronExpression, 500);

  const { data, isLoading } = useQuery({
    queryKey: ['scheduler', workspace?.slug, search],
    queryFn: () => listScheduledJobs(workspace.slug, { search }),
    enabled: !!workspace?.slug
  });

  const createMutation = useMutation({
    mutationFn: (data) => createScheduledJob(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduler']);
      setCreateOpen(false);
      resetForm();
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to create')
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => toggleScheduledJob(workspace.slug, id),
    onSuccess: () => queryClient.invalidateQueries(['scheduler'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteScheduledJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduler']);
      setDeleteConfirm(null);
    }
  });

  const runNowMutation = useMutation({
    mutationFn: (id) => runScheduledJobNow(workspace.slug, id),
    onSuccess: () => alert('Job triggered successfully'),
    onError: (err) => alert(err.response?.data?.error || 'Failed to trigger')
  });

  useEffect(() => {
    if (debouncedCron && debouncedCron.length >= 5) {
      fetch('/api/scheduler/validate-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: debouncedCron })
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setCronError(null);
            setCronPreview(data);
          } else {
            setCronError(data.error || 'Invalid cron expression');
            setCronPreview(null);
          }
        })
        .catch(() => {
          setCronError('Failed to validate');
          setCronPreview(null);
        });
    }
  }, [debouncedCron]);

  const resetForm = () => {
    setForm({
      name: '', cronExpression: '', timezone: 'UTC', actionType: 'http',
      httpUrl: '', httpMethod: 'GET', httpHeaders: [], httpBody: '',
      jobName: '', jobPayload: '{}', eventType: '', eventPayload: '{}'
    });
    setCronError(null);
    setCronPreview(null);
  };

  const handleCreate = () => {
    if (!form.name || !form.cronExpression || cronError) return;
    const data = {
      name: form.name,
      cronExpression: form.cronExpression,
      timezone: form.timezone,
      action: form.actionType === 'http' 
        ? { type: 'http-request', url: form.httpUrl, method: form.httpMethod, headers: form.httpHeaders, body: form.httpBody }
        : form.actionType === 'job'
        ? { type: 'enqueue-job', name: form.jobName, payload: JSON.parse(form.jobPayload) }
        : { type: 'webhook-event', eventType: form.eventType, payload: JSON.parse(form.eventPayload) }
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
          <h1 className="text-2xl font-bold text-devrelay-text">Scheduler</h1>
          <p className="text-devrelay-text-dim mt-1">Cron job scheduling and management</p>
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
                  <td className="px-6 py-4 text-devrelay-text font-medium">{job.name}</td>
                  <td className="px-6 py-4 text-devrelay-green font-mono text-sm">{job.cronExpression}</td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">{job.timezone || 'UTC'}</td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">{job.lastRunAt ? formatRelative(job.lastRunAt) : '-'}</td>
                  <td className="px-6 py-4 text-devrelay-text text-sm">
                    {job.isActive ? <Countdown date={job.nextRunAt} /> : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={job.isActive ? 'success' : 'inactive'} label={job.isActive ? 'Active' : 'Paused'} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => runNowMutation.mutate(job._id || job.id)} className="p-2 hover:bg-devrelay-border rounded" title="Run Now">
                        <Play className="w-4 h-4 text-devrelay-green" />
                      </button>
                      <button onClick={() => toggleMutation.mutate(job._id || job.id)} className="p-2 hover:bg-devrelay-border rounded" title={job.isActive ? 'Pause' : 'Resume'}>
                        {job.isActive ? <Pause className="w-4 h-4 text-devrelay-amber" /> : <Play className="w-4 h-4 text-devrelay-green" />}
                      </button>
                      <button onClick={() => setDeleteConfirm(job)} className="p-2 hover:bg-devrelay-border rounded" title="Delete">
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
            <input
              type="text"
              value={form.cronExpression}
              onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
              className={`w-full bg-devrelay-surface2 border rounded px-4 py-2 text-devrelay-text font-mono focus:outline-none ${
                cronError ? 'border-devrelay-red' : 'border-devrelay-border focus:border-devrelay-green'
              }`}
              placeholder="0 2 * * *"
            />
            {cronError && <p className="text-sm text-devrelay-red mt-1">{cronError}</p>}
            {cronPreview && (
              <div className="mt-2 p-3 bg-devrelay-surface2 rounded text-sm">
                <p className="text-devrelay-text">{cronPreview.description}</p>
                <p className="text-devrelay-text-dim mt-2">Next runs:</p>
                <ul className="text-devrelay-text-dim text-xs mt-1 space-y-1">
                  {cronPreview.nextRuns?.slice(0, 5).map((run, i) => (
                    <li key={i}>{new Date(run).toLocaleString()}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
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
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Job Name *</label>
              <input
                type="text"
                value={form.jobName}
                onChange={(e) => setForm({ ...form, jobName: e.target.value })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
                placeholder="send-email"
              />
            </div>
          )}

          {form.actionType === 'event' && (
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Event Type *</label>
              <input
                type="text"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
                placeholder="daily.summary"
              />
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !form.name || !form.cronExpression || cronError}
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