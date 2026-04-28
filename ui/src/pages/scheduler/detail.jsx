import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Trash2, Clock, History, ArrowLeft, Activity, Calendar, Settings } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getScheduledJob, toggleScheduledJob, deleteScheduledJob, runScheduledJobNow, getScheduledJobHistory } from '../../api/resources/scheduler';
import { formatDateTime, formatRelative, formatJson, formatDuration } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useState } from 'react';

function ActionCard({ action }) {
  if (!action) return null;

  const getActionIcon = () => {
    if (action.type === 'http-request') return '🌐';
    if (action.type === 'enqueue-job') return '📋';
    if (action.type === 'webhook-event') return '📡';
    return '⚙️';
  };

  const getActionLabel = () => {
    if (action.type === 'http-request') return 'HTTP Request';
    if (action.type === 'enqueue-job') return 'Enqueue Job';
    if (action.type === 'webhook-event') return 'Webhook Event';
    return action.type;
  };

  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{getActionIcon()}</span>
        <div>
          <h3 className="text-lg font-semibold text-devrelay-text">{getActionLabel()}</h3>
          <p className="text-xs text-devrelay-text-dim">{action.type}</p>
        </div>
      </div>

      {action.type === 'http-request' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-devrelay-border">
            <span className="text-devrelay-text-dim text-sm">Method</span>
            <span className="bg-devrelay-green/20 text-devrelay-green px-2 py-1 rounded text-sm font-mono">
              {action.method || 'GET'}
            </span>
          </div>
          <div>
            <span className="text-devrelay-text-dim text-xs uppercase tracking-wide">URL</span>
            <p className="text-devrelay-text font-mono text-sm mt-1 break-all">{action.url || '-'}</p>
          </div>
          {action.headers && Object.keys(action.headers).length > 0 && (
            <div>
              <span className="text-devrelay-text-dim text-xs uppercase tracking-wide">Headers</span>
              <pre className="bg-devrelay-surface2 rounded p-3 text-xs text-devrelay-text font-mono mt-1 overflow-x-auto">
                {formatJson(action.headers)}
              </pre>
            </div>
          )}
          {action.body && (
            <div>
              <span className="text-devrelay-text-dim text-xs uppercase tracking-wide">Body</span>
              <pre className="bg-devrelay-surface2 rounded p-3 text-xs text-devrelay-text font-mono mt-1 overflow-x-auto">
                {action.body}
              </pre>
            </div>
          )}
        </div>
      )}

      {action.type === 'enqueue-job' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-devrelay-border">
            <span className="text-devrelay-text-dim text-sm">Handler</span>
            <span className="bg-devrelay-blue/20 text-devrelay-blue px-3 py-1 rounded text-sm font-mono">
              {action.handler || 'log-message'}
            </span>
          </div>
          {action.config && Object.keys(action.config).length > 0 && (
            <div>
              <span className="text-devrelay-text-dim text-xs uppercase tracking-wide">Configuration</span>
              <pre className="bg-devrelay-surface2 rounded p-3 text-xs text-devrelay-text font-mono mt-1 overflow-x-auto">
                {formatJson(action.config)}
              </pre>
            </div>
          )}
        </div>
      )}

      {action.type === 'webhook-event' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-devrelay-border">
            <span className="text-devrelay-text-dim text-sm">Event Type</span>
            <span className="bg-devrelay-purple/20 text-devrelay-purple px-3 py-1 rounded text-sm font-mono">
              {action.eventType || '-'}
            </span>
          </div>
          {action.payload && Object.keys(action.payload).length > 0 && (
            <div>
              <span className="text-devrelay-text-dim text-xs uppercase tracking-wide">Payload</span>
              <pre className="bg-devrelay-surface2 rounded p-3 text-xs text-devrelay-text font-mono mt-1 overflow-x-auto">
                {formatJson(action.payload)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatsCard({ job }) {
  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-devrelay-text-dim uppercase tracking-wide mb-4">Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-devrelay-surface2 rounded-lg">
          <p className="text-3xl font-bold text-devrelay-green">{job.runCount || 0}</p>
          <p className="text-xs text-devrelay-text-dim mt-1">Total Runs</p>
        </div>
        <div className="text-center p-4 bg-devrelay-surface2 rounded-lg">
          <p className="text-3xl font-bold text-devrelay-text">{job.consecutiveFailures || 0}</p>
          <p className="text-xs text-devrelay-text-dim mt-1">Consecutive Failures</p>
        </div>
        <div className="text-center p-4 bg-devrelay-surface2 rounded-lg">
          <p className="text-2xl font-bold text-devrelay-text">
            {job.lastRunStatus ? (
              <span className={job.lastRunStatus === 'success' ? 'text-devrelay-green' : 'text-devrelay-red'}>
                {job.lastRunStatus}
              </span>
            ) : '-'}
          </p>
          <p className="text-xs text-devrelay-text-dim mt-1">Last Status</p>
        </div>
        <div className="text-center p-4 bg-devrelay-surface2 rounded-lg">
          <p className="text-2xl font-bold text-devrelay-text">{job.maxConsecutiveFailures || 5}</p>
          <p className="text-xs text-devrelay-text-dim mt-1">Max Failures</p>
        </div>
      </div>
    </div>
  );
}

function HistoryList({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-devrelay-text-dim">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No execution history yet</p>
        <p className="text-sm mt-1">Run the job to see execution results</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((run, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-devrelay-surface2 rounded-lg hover:bg-devrelay-border/30 transition-colors">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${run.status === 'success' ? 'bg-devrelay-green' : run.status === 'failed' ? 'bg-devrelay-red' : 'bg-devrelay-yellow'}`} />
            <div>
              <p className="text-devrelay-text text-sm font-medium capitalize">{run.status || 'unknown'}</p>
              <p className="text-devrelay-text-dim text-xs">{formatDateTime(run.triggeredAt || run.timestamp)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-devrelay-text-dim text-sm font-mono">
              {run.duration ? formatDuration(run.duration) : '-'}
            </p>
            {run.error && (
              <p className="text-devrelay-red text-xs mt-1 max-w-xs truncate">{run.error}</p>
            )}
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
    enabled: !!workspace?.slug && !!id,
    staleTime: 0
  });

  const rawData = data?.data || data;
  const job = rawData?.scheduledJob || data?.scheduledJob;

  const { data: historyData } = useQuery({
    queryKey: ['scheduledJobHistory', workspace?.slug, id],
    queryFn: () => getScheduledJobHistory(workspace.slug, id, { limit: 20 }),
    enabled: !!workspace?.slug && !!id && historyOpen
  });

  const rawHistoryData = historyData?.data || historyData;
  const history = rawHistoryData?.runs || rawHistoryData || [];

  const toggleMutation = useMutation({
    mutationFn: () => toggleScheduledJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledJob']);
      toast.success(job?.isActive ? 'Job paused' : 'Job resumed');
    }
  });

  const runNowMutation = useMutation({
    mutationFn: () => runScheduledJobNow(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledJobHistory']);
      toast.success('Job triggered successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to trigger')
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteScheduledJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduler']);
      toast.success('Scheduled job deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete')
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  if (!job) {
    return <div className="p-8 text-devrelay-text">Scheduled job not found</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link to="/scheduler" className="inline-flex items-center gap-2 text-devrelay-text-dim hover:text-devrelay-green mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Scheduler
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-devrelay-text">{job.name}</h1>
            <StatusBadge 
              status={job.isActive ? 'success' : 'inactive'} 
              label={job.isActive ? 'Active' : 'Paused'} 
            />
          </div>
          <p className="text-devrelay-text-dim font-mono text-sm mt-2">ID: {job._id || job.id}</p>
          {job.description && (
            <p className="text-devrelay-text-dim mt-2">{job.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => toggleMutation.mutate()}
            className={`flex items-center gap-2 border px-4 py-2 rounded transition-colors ${
              job.isActive 
                ? 'bg-devrelay-surface border-devrelay-border text-devrelay-text hover:border-devrelay-yellow' 
                : 'bg-devrelay-green text-devrelay-bg hover:bg-devrelay-green-dim'
            }`}
          >
            {job.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {job.isActive ? 'Pause' : 'Resume'}
          </button>
          <button 
            onClick={() => runNowMutation.mutate()}
            disabled={runNowMutation.isPending}
            className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${runNowMutation.isPending ? 'animate-spin' : ''}`} />
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
        <div className="space-y-6">
          <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-devrelay-green" />
              <h3 className="text-lg font-semibold text-devrelay-text">Schedule</h3>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-devrelay-text-dim text-xs uppercase tracking-wide">Cron Expression</span>
                <p className="text-devrelay-green font-mono text-xl mt-1">{job.cronExpression}</p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-devrelay-border">
                <span className="text-devrelay-text-dim text-sm">Timezone</span>
                <span className="text-devrelay-text">{job.timezone || 'UTC'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-devrelay-border">
                <span className="text-devrelay-text-dim text-sm">Timeout</span>
                <span className="text-devrelay-text">{job.timeout ? `${job.timeout/1000}s` : '30s'}</span>
              </div>
            </div>
          </div>

          <StatsCard job={job} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <ActionCard action={job.action} />

          {history.length > 0 && (
            <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-devrelay-blue" />
                  <h3 className="text-lg font-semibold text-devrelay-text">Recent Executions</h3>
                </div>
                <button 
                  onClick={() => setHistoryOpen(true)}
                  className="text-devrelay-green text-sm hover:underline"
                >
                  View All
                </button>
              </div>
              <HistoryList history={history.slice(0, 5)} />
            </div>
          )}
        </div>
      </div>

      <SlideOver open={historyOpen} onClose={() => setHistoryOpen(false)} title="Execution History">
        <HistoryList history={history} />
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