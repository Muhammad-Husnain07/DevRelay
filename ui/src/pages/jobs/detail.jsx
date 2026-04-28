import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Clock, CheckCircle, XCircle, Loader, RotateCcw, Trash2, Copy, Play, Radio } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSocketEvent } from '../../hooks/useSocket';
import { getJob, retryJob, cancelJob } from '../../api/resources/jobs';
import { formatDateTime, formatDuration, formatJson, formatRelative } from '../../utils/formatters';
import { useCountUp } from '../../hooks/useCountUp';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';

const priorityColors = {
  critical: 'bg-devrelay-red/20 text-devrelay-red border border-devrelay-red/30',
  high: 'bg-devrelay-amber/20 text-devrelay-amber border border-devrelay-amber/30',
  normal: 'bg-devrelay-blue/20 text-devrelay-blue border border-devrelay-blue/30',
  low: 'bg-devrelay-border text-devrelay-text-dim border border-transparent'
};

const statusSteps = [
  { key: 'waiting', label: 'Queued', icon: Clock, color: 'text-devrelay-blue' },
  { key: 'active', label: 'Started', icon: Loader, color: 'text-devrelay-amber' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-devrelay-green' },
  { key: 'failed', label: 'Failed', icon: XCircle, color: 'text-devrelay-red' }
];

function getStepIndex(status) {
  if (status === 'waiting' || status === 'delayed') return 0;
  if (status === 'active') return 1;
  if (status === 'completed') return 2;
  if (status === 'failed') return 2;
  return 0;
}

function ProgressTimeline({ job }) {
  const stepIndex = getStepIndex(job.status);
  const isActive = job.status === 'active';

  return (
    <div className="flex items-center gap-2">
      {statusSteps.slice(0, 3).map((step, i) => {
        const Icon = step.icon;
        const isCurrentStep = i === stepIndex;
        const isPast = i < stepIndex;
        const statusClass = step.key === 'completed' && job.status === 'failed' ? 'text-devrelay-red' : step.color;
        
        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-2 ${isPast || isCurrentStep ? statusClass : 'text-devrelay-text-dim'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                isCurrentStep && isActive 
                  ? 'border-devrelay-amber bg-devrelay-amber/20 animate-pulse' 
                  : isPast || (isCurrentStep && !isActive)
                    ? `border-current bg-current/20` 
                    : 'border-current/30'
              }`}>
                {isCurrentStep && isActive ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
            {i < 2 && (
              <div className={`w-8 h-0.5 mx-2 ${
                isPast ? 'bg-devrelay-green' : 'bg-devrelay-border'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function JsonViewer({ data, title, expandable = true }) {
  const [expanded, setExpanded] = useState(!expandable);
  const [copied, setCopied] = useState(false);
  
  const jsonStr = typeof data === 'string' ? data : formatJson(data);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-devrelay-border">
        <h4 className="text-sm font-medium text-devrelay-text">{title}</h4>
        <div className="flex items-center gap-2">
          {expandable && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-devrelay-text-dim hover:text-devrelay-green"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button 
            onClick={handleCopy}
            className="text-xs text-devrelay-text-dim hover:text-devrelay-green flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className={`p-4 text-sm font-mono text-devrelay-text overflow-x-auto whitespace-pre-wrap ${
        !expandable && !expanded ? 'max-h-32' : ''
      }`}>
        {jsonStr}
      </pre>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const { workspace } = useWorkspace();
  const [jobState, setJobState] = useState(null);

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['job', workspace?.slug, id],
    queryFn: () => getJob(workspace.slug, id),
    enabled: !!workspace?.slug && !!id,
    staleTime: 0
  });

  if (error) {
    return <div className="p-8 text-devrelay-red">Error: {error.message}</div>;
  }
  
const rawData = data?.data || data;
  const baseJob = rawData?.job;
  const job = jobState || baseJob;

  const retryMutation = useMutation({
    mutationFn: () => retryJob(workspace.slug, id),
    onSuccess: () => refetch()
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelJob(workspace.slug, id),
    onSuccess: () => refetch()
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  if (!job) {
    return <div className="p-8 text-devrelay-text">Job not found</div>;
  }

  return (
    <div className="p-8">
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link to="/jobs" className="text-devrelay-text-dim hover:text-devrelay-green">Jobs</Link>
        <span className="text-devrelay-text-dim">/</span>
        <span className="text-devrelay-text">{job.name}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <StatusBadge status={job.status} label={job.status} />
          <span className={`px-3 py-1 text-sm rounded border ${priorityColors[job.priority < 0 ? 'low' : job.priority === 2 ? 'critical' : job.priority === 1 ? 'high' : 'normal']}`}>
            {job.priority < 0 ? 'Low' : job.priority === 2 ? 'Critical' : job.priority === 1 ? 'High' : 'Normal'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {job.status === 'failed' && (
            <button 
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="flex items-center gap-2 bg-devrelay-amber text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-amber-dim disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          )}
          {(job.status === 'waiting' || job.status === 'active' || job.status === 'delayed') && (
            <button 
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-2 bg-devrelay-red/20 text-devrelay-red font-medium px-4 py-2 rounded hover:bg-devrelay-red/30 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 mb-6">
        <ProgressTimeline job={job} />
        <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-devrelay-text-dim">Created</p>
            <p className="text-devrelay-text">{formatDateTime(job.createdAt)}</p>
          </div>
          <div>
            <p className="text-devrelay-text-dim">Processed</p>
            <p className="text-devrelay-text">{job.processedAt ? formatRelative(job.processedAt) : '-'}</p>
          </div>
          <div>
            <p className="text-devrelay-text-dim">Finished</p>
            <p className="text-devrelay-text">{job.finishedAt ? formatRelative(job.finishedAt) : '-'}</p>
          </div>
          <div>
            <p className="text-devrelay-text-dim">Duration</p>
            <p className="text-devrelay-text font-mono">{job.duration ? formatDuration(job.duration) : '—'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JsonViewer 
          data={job.data || job.payload} 
          title="Payload" 
        />
        
        {job.status === 'completed' && job.returnvalue && (
          <JsonViewer 
            data={job.returnvalue} 
            title="Result" 
          />
        )}

        {job.status === 'failed' && (
          <div className="lg:col-span-2">
            <div className="bg-devrelay-red/10 border border-devrelay-red/30 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-devrelay-red mb-3">Error</h4>
              <p className="text-devrelay-red font-mono mb-4">{job.failReason}</p>
              {job.stacktrace?.length > 0 && (
                <details className="group">
                  <summary className="text-sm text-devrelay-text-dim cursor-pointer hover:text-devrelay-green mb-2">
                    Stack Trace
                  </summary>
                  <pre className="bg-devrelay-surface rounded p-4 text-sm font-mono text-devrelay-red overflow-x-auto">
                    {job.stacktrace.join('\n')}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {job.progress && (
          <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
            <h4 className="text-sm font-medium text-devrelay-text mb-4">Progress</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-devrelay-surface2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-devrelay-green transition-all duration-500"
                    style={{ width: `${job.progress.total ? (job.progress.current / job.progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className="text-devrelay-text font-mono">
                {job.progress.current || 0} / {job.progress.total || 0}
              </span>
            </div>
          </div>
        )}

        {job.attemptsMade > 1 && (
          <div className="lg:col-span-2 bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
            <h4 className="text-sm font-medium text-devrelay-text mb-4">Attempt History</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-devrelay-border text-devrelay-text-dim">
                  <th className="text-left py-2">Attempt</th>
                  <th className="text-left py-2">Started</th>
                  <th className="text-left py-2">Duration</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: job.attemptsMade }).map((_, i) => (
                  <tr key={i} className="border-b border-devrelay-border">
                    <td className="py-2 text-devrelay-text">#{i + 1}</td>
                    <td className="py-2 text-devrelay-text-dim">{formatRelative(job.attemptTimes?.[i])}</td>
                    <td className="py-2 text-devrelay-text-dim font-mono">{formatDuration(job.attemptDurations?.[i])}</td>
                    <td className="py-2">
                      {i === job.attemptsMade - 1 && job.status === 'failed' ? (
                        <StatusBadge status="error" label="Failed" />
                      ) : i === job.attemptsMade - 1 && job.status === 'completed' ? (
                        <StatusBadge status="success" label="Completed" />
                      ) : (
                        <span className="text-devrelay-text-dim">—</span>
                      )}
                    </td>
                    <td className="py-2 text-devrelay-red text-xs">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}