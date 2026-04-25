import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { Play, Pause, RotateCcw, Trash2, Clock, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listJobs, createJob, retryJob, cancelJob, getJob } from '../../api/resources/jobs';
import { formatRelative, formatDuration, truncateJson } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
  { key: 'delayed', label: 'Delayed' }
];

const priorityColors = {
  critical: 'bg-devrelay-red/20 text-devrelay-red',
  high: 'bg-devrelay-amber/20 text-devrelay-amber', 
  normal: 'bg-devrelay-blue/20 text-devrelay-blue',
  low: 'bg-devrelay-border text-devrelay-text-dim'
};

export default function JobList() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [retryConfirm, setRetryConfirm] = useState(null);

  const [form, setForm] = useState({
    name: '',
    payload: '{}',
    priority: 0,
    delay: 0
  });
  const [payloadError, setPayloadError] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', workspace?.slug, status, debouncedSearch, page],
    queryFn: () => listJobs(workspace.slug, { status: status === 'all' ? undefined : status, search: debouncedSearch, page, limit: 20 }),
    enabled: !!workspace?.slug
  });

  const createMutation = useMutation({
    mutationFn: (data) => createJob(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      setCreateOpen(false);
      setForm({ name: '', payload: '{}', priority: 0, delay: 0 });
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to create')
  });

  const retryMutation = useMutation({
    mutationFn: (id) => retryJob(workspace.slug, id),
    onSuccess: () => queryClient.invalidateQueries(['jobs'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => cancelJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      setDeleteConfirm(null);
    }
  });

  const handlePayloadChange = (value) => {
    setForm({ ...form, payload: value });
    try {
      JSON.parse(value);
      setPayloadError(null);
    } catch (e) {
      setPayloadError('Invalid JSON');
    }
  };

  const handleCreate = () => {
    if (!form.name || payloadError) return;
    createMutation.mutate({
      name: form.name,
      payload: JSON.parse(form.payload),
      priority: form.priority,
      delay: form.delay * 60000
    });
  };

  const jobs = data?.data?.jobs || [];
  const stats = data?.data?.stats || {};

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Jobs</h1>
          <p className="text-devrelay-text-dim mt-1">Background job queue management</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim transition-colors"
        >
          <Play className="w-4 h-4" />
          Enqueue Job
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStatus(tab.key); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap transition-colors ${
              status === tab.key 
                ? 'bg-devrelay-green/20 text-devrelay-green border border-devrelay-green/30' 
                : 'bg-devrelay-surface2 border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
            }`}
          >
            {tab.label}
            <span className="text-xs px-1.5 py-0.5 bg-devrelay-bg rounded">
              {tab.key === 'all' ? stats.total : tab.key === 'waiting' ? stats.waiting : tab.key === 'active' ? stats.active : tab.key === 'completed' ? stats.completed : tab.key === 'failed' ? stats.failed : stats.delayed}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none focus:border-devrelay-green"
          />
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No jobs" description="Enqueue your first job to process background tasks" />
      ) : (
        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-devrelay-border">
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Job Name</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Payload</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Priority</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Status</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Created</th>
                <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Duration</th>
                <th className="text-right text-sm text-devrelay-text-dim px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job._id || job.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2">
                  <td className="px-6 py-4">
                    <Link to={`/jobs/${job._id || job.id}`} className="text-devrelay-text font-medium hover:text-devrelay-green">
                      {job.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-devrelay-text-dim font-mono text-sm">
                    {truncateJson(job.payload, 60)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${priorityColors[job.priority < 0 ? 'low' : job.priority === 2 ? 'critical' : job.priority === 1 ? 'high' : 'normal']}`}>
                      {job.priority < 0 ? 'Low' : job.priority === 2 ? 'Critical' : job.priority === 1 ? 'High' : 'Normal'}
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
                    <div className="flex items-center justify-end gap-2">
                      {job.status === 'failed' && (
                        <button 
                          onClick={() => setRetryConfirm(job)}
                          className="p-2 hover:bg-devrelay-border rounded" 
                          title="Retry"
                        >
                          <RotateCcw className="w-4 h-4 text-devrelay-amber" />
                        </button>
                      )}
                      <button 
                        onClick={() => setDeleteConfirm(job)} 
                        className="p-2 hover:bg-devrelay-border rounded" 
                        title="Cancel"
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

      <div className="mt-6 flex justify-center">
        <Pagination
          page={page}
          totalPages={Math.ceil((stats.total || 0) / 20)}
          onChange={setPage}
        />
      </div>

      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Enqueue Job">
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Job Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none focus:border-devrelay-green"
              placeholder="send-email"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Priority</label>
            <div className="flex gap-2">
              {[
                { value: -1, label: 'Low' },
                { value: 0, label: 'Normal' }, 
                { value: 1, label: 'High' },
                { value: 2, label: 'Critical' }
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setForm({ ...form, priority: p.value })}
                  className={`flex-1 py-2 rounded text-sm ${
                    form.priority === p.value 
                      ? 'bg-devrelay-green text-devrelay-bg' 
                      : 'bg-devrelay-surface2 border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
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
              value={form.delay}
              onChange={(e) => setForm({ ...form, delay: parseInt(e.target.value) || 0 })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text focus:outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Payload (JSON)</label>
            <textarea
              value={form.payload}
              onChange={(e) => handlePayloadChange(e.target.value)}
              className={`w-full h-40 bg-devrelay-surface2 border rounded px-4 py-2 text-devrelay-text font-mono text-sm focus:outline-none ${
                payloadError ? 'border-devrelay-red' : 'border-devrelay-border focus:border-devrelay-green'
              }`}
              placeholder='{"userId": 123}'
            />
            {payloadError && (
              <p className="text-sm text-devrelay-red mt-1">{payloadError}</p>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !form.name || payloadError}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createMutation.isPending ? 'Enqueuing...' : 'Enqueue Job'}
          </button>
        </div>
      </SlideOver>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm._id || deleteConfirm.id)}
        title="Cancel Job"
        description={`Are you sure you want to cancel "${deleteConfirm?.name}"?`}
        confirmLabel="Cancel Job"
        danger
      />

      <ConfirmModal
        open={!!retryConfirm}
        onClose={() => setRetryConfirm(null)}
        onConfirm={() => retryMutation.mutate(retryConfirm._id || retryConfirm.id)}
        title="Retry Job"
        description={`Retry "${retryConfirm?.name}"? This will add it back to the queue.`}
        confirmLabel="Retry"
      />
    </div>
  );
}