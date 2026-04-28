import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Trash2, History, ArrowLeft, Calendar, Activity, Settings, Zap } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getScheduledJob, toggleScheduledJob, deleteScheduledJob, runScheduledJobNow, getScheduledJobHistory } from '../../api/resources/scheduler';
import { formatDateTime, formatRelative, formatJson, formatDuration } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useState } from 'react';

function InfoCard({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`bg-devrelay-surface border border-devrelay-border rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-devrelay-green" />}
        <h3 className="text-sm font-semibold text-devrelay-text-dim uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatBox({ label, value, color = 'text-devrelay-text', subLabel }) {
  return (
    <div className="text-center p-3 bg-devrelay-surface2 rounded-lg">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-devrelay-text-dim mt-1">{label}</p>
      {subLabel && <p className="text-xs text-devrelay-text-dim">{subLabel}</p>}
    </div>
  );
}

function ActionTypeDisplay({ action }) {
  if (!action) return null;

  const getTypeInfo = () => {
    switch (action.type) {
      case 'http-request':
        return { icon: '🌐', label: 'HTTP Request', color: 'bg-devrelay-green/20 text-devrelay-green' };
      case 'enqueue-job':
        return { icon: '📋', label: 'Enqueue Job', color: 'bg-devrelay-blue/20 text-devrelay-blue' };
      case 'webhook-event':
        return { icon: '📡', label: 'Webhook Event', color: 'bg-devrelay-purple/20 text-devrelay-purple' };
      default:
        return { icon: '⚙️', label: action.type || 'Unknown', color: 'bg-devrelay-text-dim/20 text-devrelay-text-dim' };
    }
  };

  const typeInfo = getTypeInfo();
  const handler = action.handler || action.config?.handler || 'log-message';
  const config = action.config || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-devrelay-text-dim text-sm">Action Type</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeInfo.color}`}>
          {typeInfo.icon} {typeInfo.label}
        </span>
      </div>

      {action.type === 'http-request' && (
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-devrelay-border">
            <span className="text-devrelay-text-dim text-sm">Method</span>
            <span className="text-devrelay-green font-mono">{action.method || 'GET'}</span>
          </div>
          <div>
            <span className="text-devrelay-text-dim text-xs uppercase">URL</span>
            <p className="text-devrelay-text font-mono text-sm mt-1 break-all">{action.url || '-'}</p>
          </div>
          {action.body && (
            <div>
              <span className="text-devrelay-text-dim text-xs uppercase">Body</span>
              <pre className="bg-devrelay-surface2 rounded p-3 text-xs text-devrelay-text font-mono mt-1 overflow-x-auto max-h-32">
                {action.body}
              </pre>
            </div>
          )}
        </div>
      )}

      {action.type === 'enqueue-job' && (
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-devrelay-border">
            <span className="text-devrelay-text-dim text-sm">Handler</span>
            <span className="text-devrelay-blue font-mono">{handler}</span>
          </div>
          {config && Object.keys(config).length > 0 && (
            <div>
              <span className="text-devrelay-text-dim text-xs uppercase">Configuration</span>
              <pre className="bg-devrelay-surface2 rounded p-3 text-xs text-devrelay-text font-mono mt-1 overflow-x-auto max-h-40">
                {formatJson(config)}
              </pre>
            </div>
          )}
        </div>
      )}

      {action.type === 'webhook-event' && (
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-devrelay-border">
            <span className="text-devrelay-text-dim text-sm">Event Type</span>
            <span className="text-devrelay-purple font-mono">{action.eventType || '-'}</span>
          </div>
          {action.payload && Object.keys(action.payload).length > 0 && (
            <div>
              <span className="text-devrelay-text-dim text-xs uppercase">Payload</span>
              <pre className="bg-devrelay-surface2 rounded p-3 text-xs text-devrelay-text font-mono mt-1 overflow-x-auto max-h-32">
                {formatJson(action.payload)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExecutionHistory({ history, onViewAll }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-12 h-12 mx-auto text-devrelay-text-dim opacity-50 mb-3" />
        <p className="text-devrelay-text-dim">No execution history yet</p>
        <p className="text-sm text-devrelay-text-dim">Run the job to see results</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.slice(0, 5).map((run, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-devrelay-surface2 rounded-lg hover:bg-devrelay-border/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${
              run.status === 'success' ? 'bg-devrelay-green' : 
              run.status === 'failed' ? 'bg-devrelay-red' : 'bg-devrelay-yellow'
            }`} />
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
      {history.length > 5 && (
        <button onClick={onViewAll} className="w-full text-center text-devrelay-green text-sm py-2 hover:underline">
          View all {history.length} executions →
        </button>
      )}
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

  const { data: historyData } = useQuery({
    queryKey: ['scheduledJobHistory', workspace?.slug, id],
    queryFn: () => getScheduledJobHistory(workspace.slug, id, { limit: 20 }),
    enabled: !!workspace?.slug && !!id
  });

  const rawHistory = historyData?.data?.history || historyData?.data?.runs || [];
  const history = Array.isArray(rawHistory) ? rawHistory : [];

  const toggleMutation = useMutation({
    mutationFn: () => toggleScheduledJob(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledJob']);
    }
  });

  const runNowMutation = useMutation({
    mutationFn: () => runScheduledJobNow(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledJobHistory']);
      alert('Job triggered successfully!');
    },
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
    <div className="p-6 max-w-6xl mx-auto">
      <Link to="/scheduler" className="inline-flex items-center gap-2 text-devrelay-text-dim hover:text-devrelay-green mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Scheduler
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-devrelay-text">{job.name}</h1>
            <StatusBadge status={job.isActive ? 'success' : 'inactive'} label={job.isActive ? 'Active' : 'Paused'} />
          </div>
          <p className="text-devrelay-text-dim font-mono text-sm">ID: {job._id || job.id}</p>
          {job.description && <p className="text-devrelay-text-dim mt-2">{job.description}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
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
            <Zap className={`w-4 h-4 ${runNowMutation.isPending ? 'animate-pulse' : ''}`} />
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
          <InfoCard icon={Calendar} title="Schedule">
            <div className="space-y-3">
              <div>
                <span className="text-devrelay-text-dim text-xs uppercase">Cron Expression</span>
                <p className="text-devrelay-green font-mono text-xl mt-1">{job.cronExpression}</p>
              </div>
              <div className="flex justify-between py-2 border-b border-devrelay-border">
                <span className="text-devrelay-text-dim text-sm">Timezone</span>
                <span className="text-devrelay-text">{job.timezone || 'UTC'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-devrelay-border">
                <span className="text-devrelay-text-dim text-sm">Timeout</span>
                <span className="text-devrelay-text">{job.timeout ? `${job.timeout/1000}s` : '30s'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-devrelay-text-dim text-sm">Last Run</span>
                <span className="text-devrelay-text">{job.lastRunAt ? formatRelative(job.lastRunAt) : 'Never'}</span>
              </div>
            </div>
          </InfoCard>

          <InfoCard icon={Activity} title="Statistics">
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Total Runs" value={job.runCount || 0} color="text-devrelay-green" />
              <StatBox label="Failures" value={job.consecutiveFailures || 0} color={job.consecutiveFailures > 0 ? 'text-devrelay-red' : 'text-devrelay-text'} />
              <StatBox 
                label="Last Status" 
                value={job.lastRunStatus ? job.lastRunStatus.charAt(0).toUpperCase() + job.lastRunStatus.slice(1) : '-'} 
                color={job.lastRunStatus === 'success' ? 'text-devrelay-green' : job.lastRunStatus === 'failed' ? 'text-devrelay-red' : 'text-devrelay-text'} 
              />
              <StatBox label="Max Failures" value={job.maxConsecutiveFailures || 5} subLabel="auto-pause" />
            </div>
          </InfoCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <InfoCard icon={Settings} title="Action Configuration">
            <ActionTypeDisplay action={job.action} />
          </InfoCard>

          <InfoCard icon={Activity} title="Recent Executions">
            <ExecutionHistory history={history} onViewAll={() => setHistoryOpen(true)} />
          </InfoCard>
        </div>
      </div>

      <SlideOver open={historyOpen} onClose={() => setHistoryOpen(false)} title="Execution History">
        <ExecutionHistory history={history} />
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