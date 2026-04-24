import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Webhook, ArrowDownCircle, Briefcase, Bell, AlertTriangle } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { getWorkspaceStats } from '../api/resources/workspaces';
import { getWebhookStats } from '../api/resources/webhooks';
import { getJobStats } from '../api/resources/jobs';
import Spinner from '../components/ui/Spinner';

export default function Dashboard() {
  const { workspace } = useWorkspace();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['workspace-stats', workspace?.slug],
    queryFn: () => getWorkspaceStats(workspace.slug),
    enabled: !!workspace?.slug
  });

  const { data: webhooks } = useQuery({
    queryKey: ['webhook-stats', workspace?.slug],
    queryFn: () => getWebhookStats(workspace.slug, 'all'),
    enabled: !!workspace?.slug
  });

  const { data: jobs } = useQuery({
    queryKey: ['job-stats', workspace?.slug],
    queryFn: () => getJobStats(workspace.slug),
    enabled: !!workspace?.slug
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Webhooks',
      value: webhooks?.endpoints?.length || 0,
      icon: Webhook,
      color: 'text-devrelay-green'
    },
    {
      label: 'Total Events',
      value: stats?.totalEvents || 0,
      icon: ArrowDownCircle,
      color: 'text-devrelay-blue'
    },
    {
      label: 'Jobs Processed',
      value: jobs?.stats?.completed || 0,
      icon: Briefcase,
      color: 'text-devrelay-amber'
    },
    {
      label: 'Active Alerts',
      value: stats?.activeAlerts || 0,
      icon: Bell,
      color: 'text-devrelay-red'
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-devrelay-text">Dashboard</h1>
        <p className="text-devrelay-text-dim mt-1">
          Overview for {workspace?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-devrelay-text-dim">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-3xl font-bold text-devrelay-text">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-devrelay-text mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-devrelay-text-dim">
            No recent activity
          </div>
        </div>

        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-devrelay-text mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-devrelay-text-dim">API</span>
              <span className="text-devrelay-green flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-devrelay-green"></span>
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-devrelay-text-dim">Database</span>
              <span className="text-devrelay-green flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-devrelay-green"></span>
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-devrelay-text-dim">Queue</span>
              <span className="text-devrelay-green flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-devrelay-green"></span>
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}