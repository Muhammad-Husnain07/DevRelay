import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { Play, Pause, RotateCcw, Trash2, Clock, Search, Calendar, X, Zap, FileJson, AlertCircle, CheckCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listJobs, createJob, retryJob, cancelJob, retryAllFailedJobs } from '../../api/resources/jobs';
import { formatRelative, formatDuration, truncateJson } from '../../utils/formatters';
import { usePagination } from '../../hooks/usePagination';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';
import toast from 'react-hot-toast';

const statusTabs = [
  { key: 'all', label: 'All', color: 'text-devrelay-text' },
  { key: 'waiting', label: 'Waiting', color: 'text-devrelay-blue' },
  { key: 'active', label: 'Active', color: 'text-devrelay-green' },
  { key: 'completed', label: 'Completed', color: 'text-devrelay-green' },
  { key: 'failed', label: 'Failed', color: 'text-devrelay-red' },
  { key: 'delayed', label: 'Delayed', color: 'text-devrelay-amber' },
  { key: 'cancelled', label: 'Cancelled', color: 'text-devrelay-text-dim' }
];

const priorityColors = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', 
  normal: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  low: 'bg-devrelay-border text-devrelay-text-dim border border-devrelay-border'
};

const priorityLabels = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low'
};

const JOB_HANDLERS = [
  { value: 'log-message', label: 'Log Message', icon: '📝' },
  { value: 'send-email', label: 'Send Email', icon: '📧' },
  { value: 'http-request', label: 'HTTP Request', icon: '🌐' },
  { value: 'webhook-call', label: 'Webhook Call', icon: '🔗' },
];

function StatusTab({ tab, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
        active 
          ? 'bg-devrelay-green/20 text-devrelay-green border border-devrelay-green/30 shadow-sm' 
          : 'bg-devrelay-surface border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50 hover:text-devrelay-text'
      }`}
    >
      <span className={tab.color}>{tab.label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-devrelay-green/30' : 'bg-devrelay-surface2'}`}>
        {count}
      </span>
    </button>
  );
}

function JsonEditor({ value, onChange, label, placeholder }) {
  const [error, setError] = useState(null);

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

  return (
    <div>
      <label className="block text-sm text-devrelay-text-dim mb-2">{label}</label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-full bg-devrelay-surface border rounded-lg px-4 py-3 text-devrelay-text font-mono text-sm focus:outline-none min-h-[140px] ${
            error ? 'border-devrelay-red focus:border-devrelay-red' : 'border-devrelay-border focus:border-devrelay-green'
          }`}
          placeholder={placeholder}
        />
        <div className="absolute bottom-3 right-3">
          <FileJson className={`w-4 h-4 ${error ? 'text-devrelay-red' : 'text-devrelay-text-dim'}`} />
        </div>
      </div>
      {error && <p className="text-xs text-devrelay-red mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

function CreateJobForm({ form, setForm, onSubmit, isPending, onClose }) {
  const [payloadError, setPayloadError] = useState(null);

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
    if (!validateJson(form.payload)) {
      setPayloadError('Invalid JSON payload');
      return;
    }
    setPayloadError(null);
    onSubmit();
  };

  const isValid = form.name && validateJson(form.payload);

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-devrelay-green" />
          Job Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Job Handler *</label>
            <select
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
            >
              <option value="">Select a handler...</option>
              {JOB_HANDLERS.map(h => (
                <option key={h.value} value={h.value}>{h.icon} {h.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: -1, label: 'Low', color: 'low' },
                { value: 0, label: 'Normal', color: 'normal' }, 
                { value: 1, label: 'High', color: 'high' },
                { value: 2, label: 'Critical', color: 'critical' }
              ].map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p.value })}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                    form.priority === p.value 
                      ? priorityColors[p.color]
                      : 'bg-devrelay-surface border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Delay (minutes)</label>
            <input
              type="number"
              min="0"
              value={form.delay}
              onChange={(e) => setForm({ ...form, delay: parseInt(e.target.value) || 0 })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="0"
            />
            <p className="text-xs text-devrelay-text-dim mt-1">Job will be delayed by this many minutes</p>
          </div>
        </div>
      </div>

      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <FileJson className="w-4 h-4 text-devrelay-green" />
          Payload
        </h3>
        
        <JsonEditor
          value={form.payload}
          onChange={(val) => setForm({ ...form, payload: val })}
          label="JSON Payload"
          placeholder='{"to": "user@example.com", "subject": "Hello"}'
        />
      </div>

      {payloadError && (
        <div className="flex items-center gap-2 bg-devrelay-red/10 border border-devrelay-red/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-devrelay-red" />
          <span className="text-devrelay-red">{payloadError}</span>
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
          {isPending ? 'Enqueuing...' : 'Enqueue Job'}
        </button>
      </div>
    </div>
  );
}

export default function JobList() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmJob, setDeleteConfirmJob] = useState(null);
  const [retryConfirmJob, setRetryConfirmJob] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { page, limit, setPage } = usePagination({ initialLimit: 20 });

  const [form, setForm] = useState({
    name: '',
    payload: '{}',
    priority: 0,
    delay: 0
  });

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', workspace?.slug, status, debouncedSearch, page, limit, dateFrom, dateTo],
    queryFn: () => listJobs(workspace.slug, { 
      status: status === 'all' ? undefined : status, 
      search: debouncedSearch, 
      page, 
      limit,
      from: dateFrom || undefined,
      to: dateTo || undefined
    }),
    enabled: !!workspace?.slug
  });

  const createMutation = useMutation({
    mutationFn: (data) => createJob(workspace.slug, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['jobs']);
      setCreateOpen(false);
      setForm({ name: '', payload: '{}', priority: 0, delay: 0 });
      toast.success(`Job enqueued: ${res.data?.job?.id || 'success'}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create')
  });

  const retryMutation = useMutation({
    mutationFn: (id) => retryJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      setRetryConfirmJob(null);
      toast.success('Job queued for retry');
    }
  });

  const retryAllMutation = useMutation({
    mutationFn: () => retryAllFailedJobs(workspace.slug),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      toast.success('All failed jobs queued for retry');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => cancelJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      setDeleteConfirmJob(null);
      toast.success('Job cancelled');
    }
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: form.name,
      payload: JSON.parse(form.payload),
      priority: form.priority,
      delay: form.delay * 60000
    });
  };

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatus('all');
  };

  const jobs = data?.data?.jobs || [];
  const stats = data?.data?.stats || {};

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Job Queue</h1>
          <p className="text-devrelay-text-dim mt-1">Manage and monitor background jobs</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-green-dim transition-colors"
        >
          <Zap className="w-5 h-5" />
          Enqueue Job
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusTabs.map(tab => (
          <StatusTab 
            key={tab.key} 
            tab={tab}
            active={status === tab.key}
            count={tab.key === 'all' ? stats.total : tab.key === 'waiting' ? stats.waiting : tab.key === 'active' ? stats.active : tab.key === 'completed' ? stats.completed : tab.key === 'failed' ? stats.failed : tab.key === 'delayed' ? stats.delayed : 0}
            onClick={() => { setStatus(tab.key); setPage(1); }}
          />
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-devrelay-text-dim" />
          <input
            type="text"
            placeholder="Search by job name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg pl-10 pr-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-green"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
            showFilters ? 'border-devrelay-green text-devrelay-green bg-devrelay-green/10' : 'border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Filters
          {(dateFrom || dateTo) && (
            <span className="w-2 h-2 bg-devrelay-green rounded-full" />
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-4 mb-6 p-4 bg-devrelay-surface2 rounded-xl border border-devrelay-border">
          <div className="flex-1">
            <label className="block text-xs text-devrelay-text-dim mb-2">From Date</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-3 py-2 text-sm text-devrelay-text focus:outline-none focus:border-devrelay-green"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-devrelay-text-dim mb-2">To Date</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-3 py-2 text-sm text-devrelay-text focus:outline-none focus:border-devrelay-green"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-devrelay-text-dim hover:text-devrelay-red transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      )}

      {status === 'failed' && stats.failed > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => retryAllMutation.mutate()}
            disabled={retryAllMutation.isPending}
            className="flex items-center gap-2 bg-devrelay-amber text-devrelay-bg font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-amber-dim disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${retryAllMutation.isPending ? 'animate-spin' : ''}`} />
            Retry All Failed ({stats.failed})
          </button>
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState 
          title="No jobs found" 
          description={status === 'all' ? "Enqueue your first job to process background tasks" : `No ${status} jobs found`}
          action={status === 'all' ? <button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 bg-devrelay-green text-devrelay-bg rounded-lg hover:bg-devrelay-green-dim">Enqueue Job</button> : undefined}
        />
      ) : (
        <div className="bg-devrelay-surface border border-devrelay-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-devrelay-border bg-devrelay-surface2">
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Job</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Payload</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Priority</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Status</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Created</th>
                <th className="text-left text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Duration</th>
                <th className="text-right text-xs font-semibold text-devrelay-text-dim uppercase tracking-wide px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job._id || job.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/jobs/${job._id || job.id}`} className="text-devrelay-text font-medium hover:text-devrelay-green transition-colors">
                      {job.name}
                    </Link>
                    <p className="text-xs text-devrelay-text-dim font-mono mt-0.5">{job.id || job._id}</p>
                  </td>
                  <td className="px-6 py-4 text-devrelay-text-dim font-mono text-sm max-w-xs">
                    <span className="block truncate">{truncateJson(job.payload, 50)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${priorityColors[job.priority < 0 ? 'low' : job.priority === 2 ? 'critical' : job.priority === 1 ? 'high' : 'normal']}`}>
                      {priorityLabels[job.priority < 0 ? 'low' : job.priority === 2 ? 'critical' : job.priority === 1 ? 'high' : 'normal']}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={job.status} label={job.status} />
                  </td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">{formatRelative(job.createdAt)}</td>
                  <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                    {job.completedAt ? formatDuration(job.duration) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {job.status === 'failed' && (
                        <button 
                          onClick={() => setRetryConfirmJob(job)}
                          className="p-2 hover:bg-devrelay-border rounded-lg transition-colors" 
                          title="Retry"
                        >
                          <RotateCcw className="w-4 h-4 text-devrelay-amber" />
                        </button>
                      )}
                      {job.status !== 'completed' && job.status !== 'cancelled' && (
                        <button 
                          onClick={() => setDeleteConfirmJob(job)} 
                          className="p-2 hover:bg-devrelay-border rounded-lg transition-colors" 
                          title="Cancel"
                        >
                          <Trash2 className="w-4 h-4 text-devrelay-red" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <Pagination
          page={page}
          totalPages={Math.ceil((stats.total || 0) / limit)}
          onChange={setPage}
        />
      </div>

      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Enqueue New Job">
        <CreateJobForm 
          form={form} 
          setForm={setForm} 
          onSubmit={handleCreate}
          isPending={createMutation.isPending}
          onClose={() => setCreateOpen(false)}
        />
      </SlideOver>

      <ConfirmModal
        open={!!deleteConfirmJob}
        onClose={() => setDeleteConfirmJob(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirmJob._id || deleteConfirmJob.id)}
        title="Cancel Job"
        description={`Are you sure you want to cancel "${deleteConfirmJob?.name}"? This action cannot be undone.`}
        confirmLabel="Cancel Job"
        danger
      />

      <ConfirmModal
        open={!!retryConfirmJob}
        onClose={() => setRetryConfirmJob(null)}
        onConfirm={() => retryMutation.mutate(retryConfirmJob._id || retryConfirmJob.id)}
        title="Retry Job"
        description={`Retry "${retryConfirmJob?.name}"? This will add it back to the queue.`}
        confirmLabel="Retry Job"
      />
    </div>
  );
}