import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Briefcase, Clock, Network, CheckCircle, XCircle, Bell, AlertTriangle, Check, X, Activity, Database, Wifi, Server } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useDeliveryEvents, useJobEvents } from '../hooks/useSocket';
import { getSummary } from '../api/resources/workspaces';
import { getLiveStats } from '../api/resources/events';
import { formatRelative } from '../utils/formatters';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend } from 'recharts';

const activityIcons = {
  'delivery:success': { icon: CheckCircle, color: 'text-devrelay-green', bg: 'bg-devrelay-green/20' },
  'delivery:failed': { icon: XCircle, color: 'text-devrelay-red', bg: 'bg-devrelay-red/20' },
  'job:completed': { icon: Check, color: 'text-devrelay-green', bg: 'bg-devrelay-green/20' },
  'job:failed': { icon: X, color: 'text-devrelay-red', bg: 'bg-devrelay-red/20' },
  'alert:fired': { icon: AlertTriangle, color: 'text-devrelay-red', bg: 'bg-devrelay-red/20' },
  'cron:fired': { icon: Clock, color: 'text-devrelay-amber', bg: 'bg-devrelay-amber/20' }
};

function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(value);
  
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

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-5 hover:border-devrelay-green/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-devrelay-text-dim font-medium">{label}</span>
        <div className={`p-2 rounded-lg ${color}/20`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-devrelay-text">
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}

function ActivityItem({ item, isNew }) {
  const Icon = activityIcons[item.type]?.icon || CheckCircle;
  const color = activityIcons[item.type]?.color || 'text-devrelay-text';
  const bg = activityIcons[item.type]?.bg || 'bg-devrelay-surface2';
  
  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${isNew ? 'bg-devrelay-green/10' : 'hover:bg-devrelay-surface2'}`}>
      <div className={`p-1.5 rounded ${bg}`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <span className="flex-1 text-sm text-devrelay-text truncate">{item.description}</span>
      <span className="text-xs text-devrelay-text-dim">{item.time}</span>
    </div>
  );
}

function SystemStatus() {
  const services = [
    { name: 'API Gateway', icon: Server, status: 'success', label: 'Operational' },
    { name: 'Database', icon: Database, status: 'success', label: 'Connected' },
    { name: 'Job Queue', icon: Activity, status: 'success', label: 'Active' },
    { name: 'WebSockets', icon: Wifi, status: 'success', label: 'Connected' }
  ];
  
  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-devrelay-text-dim mb-4 uppercase tracking-wide">System Status</h3>
      <div className="space-y-3">
        {services.map(service => (
          <div key={service.name} className="flex items-center justify-between p-3 bg-devrelay-surface2 rounded-lg">
            <div className="flex items-center gap-3">
              <service.icon className="w-4 h-4 text-devrelay-text-dim" />
              <span className="text-devrelay-text font-medium">{service.name}</span>
            </div>
            <StatusBadge status={service.status} label={service.label} />
          </div>
        ))}
      </div>
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
  
  const queueData = live?.data?.stats?.metrics ? [
    { name: 'Webhook', count: live.data.stats.metrics.webhookDelivery || 0 },
    { name: 'Email', count: live.data.stats.metrics.email || 0 },
    { name: 'Generic', count: live.data.stats.metrics.genericJob || 0 },
    { name: 'Dead Letter', count: live.data.stats.metrics.deadLetter || 0 }
  ] : [];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Spinner size="lg" />
      </div>
    );
  }
  
  const statCards = [
    { label: 'Deliveries Today', value: summary?.data?.summary?.deliveriesToday || 0, icon: TrendingUp, color: 'text-devrelay-green' },
    { label: 'Jobs Processed', value: summary?.data?.summary?.jobsProcessed || 0, icon: Briefcase, color: 'text-devrelay-blue' },
    { label: 'Cron Jobs Active', value: summary?.data?.summary?.cronJobsActive || 0, icon: Clock, color: 'text-devrelay-amber' },
    { label: 'Gateway Requests', value: summary?.data?.summary?.gatewayRequests || 0, icon: Network, color: 'text-purple-400' }
  ];
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-devrelay-text">Dashboard</h1>
        <p className="text-devrelay-text-dim mt-1">Overview for {workspace?.name}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-devrelay-surface border border-devrelay-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-devrelay-text-dim mb-4 uppercase tracking-wide">Queue Depth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={queueData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,130,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#4e6e60', fontSize: 12 }} />
              <YAxis tick={{ fill: '#4e6e60', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#080f14',
                  border: '1px solid rgba(0,212,130,0.2)',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#c8ddd5' }}
                itemStyle={{ color: '#00d482' }}
                cursor={{ fill: 'rgba(0,212,130,0.1)' }}
              />
              <Bar dataKey="count" fill="#00d482" radius={[6, 6, 0, 0]} activeBar={{ fill: '#00d482' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-devrelay-text-dim mb-4 uppercase tracking-wide">Live Activity</h3>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {activityFeed.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-devrelay-text-dim mx-auto mb-2 opacity-50" />
                <p className="text-sm text-devrelay-text-dim">No recent activity</p>
              </div>
            ) : (
              activityFeed.map((item, idx) => (
                <ActivityItem key={idx} item={item} isNew={idx === 0} />
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemStatus />
        
        {summary?.firingAlerts?.length > 0 && (
          <div className="bg-devrelay-surface border border-devrelay-red/30 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-devrelay-red mb-4 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Firing Alerts
            </h3>
            <div className="space-y-2">
              {summary.firingAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-devrelay-red/10 rounded-lg border border-devrelay-red/20">
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