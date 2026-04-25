import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Trash2, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getJob, retryJob, cancelJob } from '../../api/resources/jobs';
import { formatDateTime, formatDuration, formatJson, formatRelative } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';

const statusIcons = {
  waiting: <Clock className="w-5 h-5 text-devrelay-blue" />,
  active: <Loader className="w-5 h-5 text-devrelay-amber animate-spin" />,
  completed: <CheckCircle className="w-5 h-5 text-devrelay-green" />,
  failed: <XCircle className="w-5 h-5 text-devrelay-red" />,
  delayed: <Pause className="w-5 h-5 text-devrelay-purple" />
};

export default function JobDetail() {
  const { id } = useParams();
  const { workspace } = useWorkspace();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['job', workspace?.slug, id],
    queryFn: () => getJob(workspace.slug, id),
    enabled: !!workspace?.slug && !!id,
    refetchInterval: 3000
  });

  const job = data?.data?.job;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  if (!job) {
    return <div className="p-8 text-devrelay-text">Job not found</div>;
  }

  const handleRetry = async () => {
    if (!confirm('Retry this job?')) return;
    await retryJob(workspace.slug, id);
    refetch();
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this job?')) return;
    await cancelJob(workspace.slug, id);
    refetch();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-devrelay-surface2 rounded-lg">
            {statusIcons[job.status] || <Clock className="w-5 h-5 text-devrelay-text-dim" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-devrelay-text">{job.name}</h1>
            <p className="text-devrelay-text-dim font-mono text-sm mt-1">{job._id || job.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} label={job.status} />
          {job.status === 'failed' && (
            <button onClick={handleRetry} className="flex items-center gap-2 bg-devrelay-amber text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-amber-dim">
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          )}
          {(job.status === 'waiting' || job.status === 'active' || job.status === 'delayed') && (
            <button onClick={handleCancel} className="flex items-center gap-2 bg-devrelay-red/20 text-devrelay-red font-medium px-4 py-2 rounded hover:bg-devrelay-red/30">
              <Trash2 className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-devrelay-text mb-4">Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-devrelay-text-dim">Name</span>
              <span className="text-devrelay-text font-medium">{job.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-devrelay-text-dim">Priority</span>
              <span className="text-devrelay-text">
                {job.priority < 0 ? 'Low' : job.priority === 2 ? 'Critical' : job.priority === 1 ? 'High' : 'Normal'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-devrelay-text-dim">Attempts</span>
              <span className="text-devrelay-text">{job.attemptsMade || 0} / {job.attempts || 3}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-devrelay-text-dim">Created</span>
              <span className="text-devrelay-text">{formatDateTime(job.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-devrelay-text-dim">Processed</span>
              <span className="text-devrelay-text">{job.processedAt ? formatRelative(job.processedAt) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-devrelay-text-dim">Finished</span>
              <span className="text-devrelay-text">{job.finishedAt ? formatRelative(job.finishedAt) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-devrelay-text-dim">Duration</span>
              <span className="text-devrelay-text font-mono">{job.duration ? formatDuration(job.duration) : '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-devrelay-text mb-4">Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-devrelay-text-dim">Progress</span>
                <span className="text-devrelay-text">{job.progress?.current || 0} / {job.progress?.total || 0}</span>
              </div>
              <div className="h-2 bg-devrelay-surface2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-devrelay-green transition-all duration-300"
                  style={{ width: `${job.progress?.total ? (job.progress.current / job.progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            {job.failReason && (
              <div>
                <span className="text-devrelay-text-dim text-sm">Fail Reason</span>
                <p className="text-devrelay-red text-sm mt-1 font-mono">{job.failReason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-devrelay-text mb-4">Payload</h3>
          <pre className="bg-devrelay-surface2 rounded p-4 text-sm text-devrelay-text font-mono overflow-x-auto">
            {formatJson(job.data || job.payload)}
          </pre>
        </div>

        {job.returnvalue && (
          <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-devrelay-text mb-4">Return Value</h3>
            <pre className="bg-devrelay-surface2 rounded p-4 text-sm text-devrelay-text font-mono overflow-x-auto">
              {formatJson(job.returnvalue)}
            </pre>
          </div>
        )}

        {job.stacktrace?.length > 0 && (
          <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-devrelay-text mb-4">Stack Trace</h3>
            <pre className="bg-devrelay-surface2 rounded p-4 text-sm text-devrelay-red font-mono overflow-x-auto">
              {job.stacktrace.join('\n')}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}