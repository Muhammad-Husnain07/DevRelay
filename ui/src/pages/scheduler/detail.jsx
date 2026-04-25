import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Trash2, Clock, History } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getScheduledJob, toggleScheduledJob, deleteScheduledJob, runScheduledJobNow, getScheduledJobHistory } from '../../api/resources/scheduler';
import { formatDateTime, formatRelative, formatJson, formatDuration } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useState } from 'react';

function HistoryTab({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-devrelay-text-dim">
        No execution history yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((run, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-devrelay-surface2 rounded-lg">
          <div className="flex items-center gap-3">
            <StatusBadge status={run.status === 'success' ? 'success' : 'error'} label={run.status} />
            <span className="text-devrelay-text text-sm">{formatDateTime(run.timestamp)}</span>
          </div>
          <div className="text-devrelay-text-dim text-sm font-mono">
            {run.duration ? formatDuration(run.duration) : '-'}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SchedulerDetail() {
  const { id } = useParams();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['scheduledJob', workspace?.slug, id],
    queryFn: () => getScheduledJob(workspace.slug, id),
    enabled: !!workspace?.slug && !!id
  });

  const { data: historyData } = useQuery({
    queryKey: ['scheduledJobHistory', workspace?.slug, id],
    queryFn: () => getScheduledJobHistory(workspace.slug, id, { limit: 20 }),
    enabled: !!workspace?.slug && !!id && historyOpen
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleScheduledJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledJob']);
    }
  });

  const runNowMutation = useMutation({
    mutationFn: () => runScheduledJobNow(workspace.slug, id),
    onSuccess: () => alert('Job triggered'),
    onError: (err) => alert(err.response?.data?.error || 'Failed to trigger')
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteScheduledJob(workspace.slug, id),
    onSuccess: () => {
      window.location.href = '/scheduler';
    }
  });

  const job = data?.data?.scheduledJob;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  if (!job) {
    return <div className="p-8 text-devrelay-text">Scheduled job not found</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">{job.name}</h1>
          <p className="text-devrelay-text-dim font-mono text-sm mt-1">{job._id || job.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={job.isActive ? 'success' : 'inactive'} label={job.isActive ? 'Active' : 'Paused'} />
          <button 
            onClick={() => toggleMutation.mutate()}
            className="flex items-center gap-2 bg-devrelay-surface border border-devrelay-border text-devrelay-text px-4 py-2 rounded hover:border-devrelay-green"
          >
            {job.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {job.isActive ? 'Pause' : 'Resume'}
          </button>
          <button 
            onClick={() => runNowMutation.mutate()}
            className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim"
          >
            <RotateCcw className="w-4 h-4" />
            Run Now
          </button>
          <button 
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-2 bg-devrelay-surface border border-devrelay-border text-devrelay-text px-4 py-2 rounded hover:border-devrelay-green"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button 
            onClick={() => setDeleteConfirm(job)}
            className="flex items-center gap-2 bg-devrelay-red/20 text-devrelay-red px-4 py-2 rounded hover:bg-devrelay-red/30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-devrelay-text mb-4">Schedule</h3>
          <div className="space-y-4">
            <div>
              <span className="text-devrelay-text-dim text-sm">Cron Expression</span>
              <p className="text-devrelay-green font-mono text-lg mt-1">{job.cronExpression}</p>
            </div>
            <div>
              <span className="text-devrelay-text-dim text-sm">Timezone</span>
              <p className="text-devrelay-text mt-1">{job.timezone || 'UTC'}</p>
            </div>
            <div>
              <span className="text-devrelay-text-dim text-sm">Next Run</span>
              <p className="text-devrelay-text mt-1">
                {job.isActive && job.nextRunAt ? formatDateTime(job.nextRunAt) : '-'}
              </p>
            </div>
            <div>
              <span className="text-devrelay-text-dim text-sm">Last Run</span>
              <p className="text-devrelay-text mt-1">
                {job.lastRunAt ? formatRelative(job.lastRunAt) : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-devrelay-text mb-4">Action</h3>
          {job.action?.type === 'http-request' && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-devrelay-text-dim">Type</span>
                <span className="text-devrelay-text">HTTP Request</span>
              </div>
              <div>
                <span className="text-devrelay-text-dim text-sm">URL</span>
                <p className="text-devrelay-text font-mono text-sm mt-1 break-all">{job.action.url}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-devrelay-text-dim">Method</span>
                <span className="text-devrelay-text">{job.action.method || 'GET'}</span>
              </div>
              {job.action.headers && Object.keys(job.action.headers).length > 0 && (
                <div>
                  <span className="text-devrelay-text-dim text-sm">Headers</span>
                  <pre className="bg-devrelay-surface2 rounded p-3 text-sm text-devrelay-text font-mono mt-1">
                    {formatJson(job.action.headers)}
                  </pre>
                </div>
              )}
              {job.action.body && (
                <div>
                  <span className="text-devrelay-text-dim text-sm">Body</span>
                  <pre className="bg-devrelay-surface2 rounded p-3 text-sm text-devrelay-text font-mono mt-1">
                    {job.action.body}
                  </pre>
                </div>
              )}
            </div>
          )}
          {job.action?.type === 'enqueue-job' && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-devrelay-text-dim">Type</span>
                <span className="text-devrelay-text">Enqueue Job</span>
              </div>
              <div>
                <span className="text-devrelay-text-dim text-sm">Job Name</span>
                <p className="text-devrelay-text font-mono mt-1">{job.action.name}</p>
              </div>
              <div>
                <span className="text-devrelay-text-dim text-sm">Payload</span>
                <pre className="bg-devrelay-surface2 rounded p-3 text-sm text-devrelay-text font-mono mt-1">
                  {formatJson(job.action.payload)}
                </pre>
              </div>
            </div>
          )}
          {job.action?.type === 'webhook-event' && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-devrelay-text-dim">Type</span>
                <span className="text-devrelay-text">Webhook Event</span>
              </div>
              <div>
                <span className="text-devrelay-text-dim text-sm">Event Type</span>
                <p className="text-devrelay-text font-mono mt-1">{job.action.eventType}</p>
              </div>
              <div>
                <span className="text-devrelay-text-dim text-sm">Payload</span>
                <pre className="bg-devrelay-surface2 rounded p-3 text-sm text-devrelay-text font-mono mt-1">
                  {formatJson(job.action.payload)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <SlideOver open={historyOpen} onClose={() => setHistoryOpen(false)} title="Execution History">
        <HistoryTab history={historyData?.data?.history} />
      </SlideOver>

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Scheduled Job"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}