import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Briefcase, Clock, Network, CheckCircle, XCircle, Bell, AlertTriangle, Check, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useDeliveryEvents, useJobEvents } from '../hooks/useSocket';
import { getSummary } from '../api/resources/workspaces';
import { getLiveStats } from '../api/resources/events';
import { formatRelative } from '../utils/formatters';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend } from 'recharts';

const activityIcons = {
  'delivery:success': { icon: CheckCircle, color: 'text-devrelay-green' },
  'delivery:failed': { icon: XCircle, color: 'text-devrelay-red' },
  'job:completed': { icon: Check, color: 'text-devrelay-green' },
  'job:failed': { icon: X, color: 'text-devrelay-red' },
  'alert:fired': { icon: AlertTriangle, color: 'text-devrelay-red' },
  'cron:fired': { icon: Clock, color: 'text-devrelay-amber' }
};

function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(value);
  const start = useRef(Date.now());

  useEffect(() => {
    const startValue = previous.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue + (endValue - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previous.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}

function ActivityItem({ item, isNew }) {
  const Icon = activityIcons[item.type]?.icon || CheckCircle;
  const color = activityIcons[item.type]?.color || 'text-devrelay-text';

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-devrelay-surface2 transition-colors ${isNew ? 'animate-pulse' : ''}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="flex-1 text-sm text-devrelay-text truncate">{item.description}</span>
      <span className="text-xs text-devrelay-text-dim">{item.time}</span>
    </div>
  );
}

export default function Dashboard() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [activityFeed, setActivityFeed] = useState([]);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['workspace-summary', workspace?.slug],
    queryFn: () => workspace?.slug ? getSummary(workspace.slug) : null,
    enabled: !!workspace?.slug,
    staleTime: 30000
  });

  const { data: live } = useQuery({
    queryKey: ['workspace-live', workspace?.slug],
    queryFn: () => workspace?.slug ? getLiveStats(workspace.slug) : null,
    enabled: !!workspace?.slug,
    staleTime: 10000
  });

  const handleDeliverySuccess = (data) => {
    const item = {
      type: 'delivery:success',
      description: `Delivered to ${data.endpoint?.name || 'endpoint'}`,
      time: 'just now'
    };
    setActivityFeed(prev => [item, ...prev.slice(0, 11)]);
    queryClient.invalidateQueries(['workspace-summary']);
  };

  const handleDeliveryFailed = (data) => {
    const item = {
      type: 'delivery:failed',
      description: `Failed: ${data.endpoint?.name || 'endpoint'}`,
      time: 'just now'
    };
    setActivityFeed(prev => [item, ...prev.slice(0, 11)]);
    queryClient.invalidateQueries(['workspace-summary']);
  };

  const handleJobCompleted = (data) => {
    const item = {
      type: 'job:completed',
      description: `Job ${data.name || 'job'} completed`,
      time: 'just now'
    };
    setActivityFeed(prev => [item, ...prev.slice(0, 11)]);
    queryClient.invalidateQueries(['workspace-summary']);
  };

  useDeliveryEvents(handleDeliverySuccess, handleDeliveryFailed);
  useJobEvents(handleJobCompleted, null);

  const queueData = live?.metrics ? [
    { name: 'webhookDelivery', count: live.metrics.webhookDelivery || 0 },
    { name: 'email', count: live.metrics.email || 0 },
    { name: 'genericJob', count: live.metrics.genericJob || 0 },
    { name: 'deadLetter', count: live.metrics.deadLetter || 0 }
  ] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Deliveries Today',
      value: summary?.deliveriesToday || 0,
      icon: TrendingUp,
      color: 'text-devrelay-green'
    },
    {
      label: 'Jobs Processed',
      value: summary?.jobsProcessed || 0,
      icon: Briefcase,
      color: 'text-devrelay-blue'
    },
    {
      label: 'Cron Jobs Active',
      value: summary?.cronJobsActive || 0,
      icon: Clock,
      color: 'text-devrelay-amber'
    },
    {
      label: 'Gateway Requests',
      value: summary?.gatewayRequests || 0,
      icon: Network,
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-devrelay-text">Dashboard</h1>
        <p className="text-devrelay-text-dim mt-1">Overview for {workspace?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-devrelay-text-dim">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-3xl font-bold text-devrelay-text">
              <AnimatedNumber value={stat.value} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-devrelay-text mb-4">Queue Depth</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={queueData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,130,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#4e6e60', fontSize: 12 }} />
              <YAxis tick={{ fill: '#4e6e60', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#080f14',
                  border: '1px solid rgba(0,212,130,0.2)',
                  borderRadius: '4px'
                }}
                labelStyle={{ color: '#c8ddd5' }}
              />
              <Bar dataKey="count" fill="#00d482" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-devrelay-text mb-4">Live Activity</h2>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {activityFeed.length === 0 ? (
              <p className="text-sm text-devrelay-text-dim text-center py-4">No recent activity</p>
            ) : (
              activityFeed.map((item, idx) => (
                <ActivityItem key={idx} item={item} isNew={idx === 0} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-devrelay-text mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-devrelay-text-dim">API</span>
              <StatusBadge status="success" label="Operational" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-devrelay-text-dim">Database</span>
              <StatusBadge status="success" label="Connected" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-devrelay-text-dim">Queue</span>
              <StatusBadge status="success" label="Active" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-devrelay-text-dim">WebSockets</span>
              <StatusBadge status="success" label="Connected" />
            </div>
          </div>
        </div>

        {summary?.firingAlerts?.length > 0 && (
          <div className="bg-devrelay-surface border border-devrelay-red/30 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-devrelay-red mb-4">Firing Alerts</h2>
            <div className="space-y-3">
              {summary.firingAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-devrelay-red/10 rounded">
                  <div>
                    <p className="text-sm font-medium text-devrelay-text">{alert.rule}</p>
                    <p className="text-xs text-devrelay-text-dim">{formatRelative(alert.firedAt)}</p>
                  </div>
                  <StatusBadge status="firing" label="Firing" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}