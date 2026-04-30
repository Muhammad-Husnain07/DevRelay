import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { Plus, Trash2, Edit, Clock, Activity, Users, ChevronUp, ChevronDown, X, Copy, Search, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listGatewayRoutes, createGatewayRoute, updateGatewayRoute, deleteGatewayRoute, getGatewayLogs, getGatewayStats, createConsumer, toggleConsumer, deleteConsumer, listConsumers, getConsumerUsage } from '../../api/resources/gateway';
import { formatRelative, formatJson, truncateJson, formatDuration } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';
import toast from 'react-hot-toast';

const methodColors = {
  GET: 'bg-devrelay-green/20 text-devrelay-green',
  POST: 'bg-devrelay-blue/20 text-devrelay-blue',
  PUT: 'bg-devrelay-amber/20 text-devrelay-amber',
  PATCH: 'bg-devrelay-purple/20 text-devrelay-purple',
  DELETE: 'bg-devrelay-red/20 text-devrelay-red',
  OPTIONS: 'bg-devrelay-border text-devrelay-text-dim'
};

const statusColors = {
  '2xx': 'text-devrelay-green',
  '3xx': 'text-devrelay-blue',
  '4xx': 'text-devrelay-amber',
  '5xx': 'text-devrelay-red'
};

function MethodBadge({ method }) {
  return (
    <span className={`px-2 py-0.5 text-xs rounded font-mono ${methodColors[method] || 'bg-devrelay-border text-devrelay-text-dim'}`}>
      {method}
    </span>
  );
}

function RouteCard({ route, onEdit, onDelete, onMoveUp, onMoveDown, index, total, workspaceSlug }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const routeId = route._id || route.id;
  const upstreamUrl = route.upstream?.url || route.upstreamUrl || '';
  const gatewayUrl = workspaceSlug ? `/gw/${workspaceSlug}${route.path}` : '';

  const copyToClipboard = () => {
    const fullUrl = window.location.origin + gatewayUrl;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-4 hover:border-devrelay-green/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${route.isActive ? 'bg-devrelay-green' : 'bg-devrelay-border'}`} />
            <span className="text-devrelay-text font-medium">{route.name}</span>
            {route.methods?.map(m => <MethodBadge key={m} method={m} />)}
          </div>
          <p className="text-devrelay-green font-mono text-lg">{route.path}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-devrelay-text-dim text-sm font-mono bg-devrelay-surface2 px-2 py-1 rounded">{gatewayUrl}</span>
            <button 
              onClick={copyToClipboard}
              className="text-devrelay-green hover:text-devrelay-green-dim text-xs flex items-center gap-1"
            >
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
          <p className="text-devrelay-text-dim text-sm font-mono mt-2">{truncateJson(upstreamUrl, 60)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-devrelay-text-dim text-xs">#{route.priority || index + 1}</span>
          <div className="flex flex-col gap-1">
            <button onClick={onMoveUp} disabled={index === 0} className="p-1 hover:bg-devrelay-border rounded disabled:opacity-30">
              <ChevronUp className="w-3 h-3" />
            </button>
            <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 hover:bg-devrelay-border rounded disabled:opacity-30">
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-3 text-sm">
        <span className="text-devrelay-text-dim">
          Auth: <span className="text-devrelay-text">{route.auth?.type || 'none'}</span>
        </span>
        <span className="text-devrelay-text-dim">
          Rate: <span className="text-devrelay-text">{route.rateLimit?.enabled ? `${route.rateLimit.requestsPerMinute || route.rateLimit.limit || 60}/min` : 'Unlimited'}</span>
        </span>
        <span className="text-devrelay-text-dim">
          Timeout: <span className="text-devrelay-text">{route.upstream?.timeout || route.timeout ? `${route.upstream?.timeout || route.timeout}ms` : '-'}</span>
        </span>
        <button onClick={() => setExpanded(!expanded)} className="text-devrelay-text-dim hover:text-devrelay-green">
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-devrelay-border">
          <pre className="text-xs text-devrelay-text-dim font-mono overflow-x-auto">
            {formatJson(route)}
          </pre>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-devrelay-border">
        <button onClick={() => onEdit(route)} className="flex items-center gap-1 text-sm text-devrelay-text-dim hover:text-devrelay-green">
          <Edit className="w-4 h-4" /> Edit
        </button>
        <button onClick={() => onDelete(route)} className="flex items-center gap-1 text-sm text-devrelay-text-dim hover:text-devrelay-red">
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
}

function LogRow({ log }) {
  const duration = log.durationMs || log.duration;
  const durationColor = duration < 100 ? 'text-devrelay-green' : duration < 500 ? 'text-devrelay-amber' : 'text-devrelay-red';
  const statusCode = log.status || log.statusCode;
  const statusCategory = statusCode < 300 ? '2xx' : statusCode < 400 ? '3xx' : statusCode < 500 ? '4xx' : '5xx';

  return (
    <tr className="border-b border-devrelay-border hover:bg-devrelay-surface2">
      <td className="px-4 py-3 text-devrelay-text-dim text-sm">{log.createdAt ? formatRelative(log.createdAt) : '-'}</td>
      <td className="px-4 py-3"><MethodBadge method={log.method} /></td>
      <td className="px-4 py-3 text-devrelay-text font-mono text-sm">{log.path}</td>
      <td className={`px-4 py-3 font-mono ${statusColors[statusCategory]}`}>{statusCode || '-'}</td>
      <td className={`px-4 py-3 font-mono ${durationColor}`}>{duration ? `${duration}ms` : '-'}</td>
      <td className="px-4 py-3 text-devrelay-text-dim text-sm font-mono">{log.consumerId || 'anonymous'}</td>
      <td className="px-4 py-3 text-devrelay-text-dim text-sm font-mono">{truncateJson(log.upstreamUrl, 30)}</td>
      <td className="px-4 py-3 text-devrelay-text-dim text-sm">{log.responseSizeBytes ? `${log.responseSizeBytes}b` : statusCode === 304 ? '0b' : '-'}</td>
    </tr>
  );
}

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {[
        { label: 'Total Requests', value: stats.totalRequests || 0 },
        { label: 'p50 Latency', value: stats.p50 ? `${Math.round(stats.p50)}ms` : '0ms' },
        { label: 'p95 Latency', value: stats.p95 ? `${Math.round(stats.p95)}ms` : '0ms' },
        { label: 'Error Rate', value: stats.errorRate ? `${stats.errorRate}%` : '0%' },
        { label: 'Avg Latency', value: stats.avgLatency ? `${Math.round(stats.avgLatency)}ms` : '0ms' }
      ].map(item => (
        <div key={item.label} className="bg-devrelay-surface border border-devrelay-border rounded-lg p-3 text-center">
          <p className="text-devrelay-amber text-xl font-bold">{item.value}</p>
          <p className="text-devrelay-text-dim text-xs">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function Gateway() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('routes');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRoute, setEditRoute] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [showSecret, setShowSecret] = useState({});
  const [filterRoute, setFilterRoute] = useState('');
  const [filterStatus, setFilterStatus] = useState([]);
  const [page, setPage] = useState(1);

  const [routeForm, setRouteForm] = useState({
    name: '', path: '', methods: ['GET'], upstreamUrl: '', stripPath: false, timeout: 30000,
    auth: { type: 'none' },
    rateLimit: { enabled: false, limit: 100, window: 60 }
  });

  const [consumerForm, setConsumerForm] = useState({
    name: '', key: '', secret: '', isActive: true,
    rateLimit: { perSecond: 10, perMinute: 60, perDay: 1000 }, monthlyRequests: 10000
  });

  const debouncedRoute = useDebounce(filterRoute, 300);

  const { data: routesData, isLoading: routesLoading, error } = useQuery({
    queryKey: ['gatewayRoutes', workspace?.slug],
    queryFn: () => workspace?.slug ? listGatewayRoutes(workspace.slug) : Promise.resolve({ data: {} }),
    enabled: !!workspace?.slug
  });

  const { data: consumersData, isLoading: consumersLoading, error: consumersError } = useQuery({
    queryKey: ['gatewayConsumers', workspace?.slug],
    queryFn: () => workspace?.slug ? listConsumers(workspace.slug) : Promise.resolve({ data: {} }),
    enabled: !!workspace?.slug
  });

  console.log('Consumers query:', { consumersData, consumersLoading, consumersError, slug: workspace?.slug });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['gatewayStats', workspace?.slug],
    queryFn: () => workspace?.slug ? getGatewayStats(workspace.slug) : Promise.resolve({ data: {} }),
    enabled: !!workspace?.slug && activeTab === 'logs'
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['gatewayLogs', workspace?.slug, debouncedRoute, filterStatus, page],
    queryFn: () => workspace?.slug ? getGatewayLogs(workspace.slug, { 
      route: debouncedRoute, 
      status: filterStatus.length > 0 ? filterStatus.join(',') : undefined, 
      page, 
      limit: 50 
    }) : Promise.resolve({ data: {} }),
    enabled: !!workspace?.slug
  });

  const createRouteMutation = useMutation({
    mutationFn: (data) => {
      if (!workspace?.slug) throw new Error('No workspace');
      return createGatewayRoute(workspace.slug, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayRoutes']);
      setCreateOpen(false);
      resetRouteForm();
      toast.success('Route created');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Failed')
  });

  const updateRouteMutation = useMutation({
    mutationFn: (data) => {
      if (!workspace?.slug) throw new Error('No workspace');
      return updateGatewayRoute(workspace.slug, editRoute._id || editRoute.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayRoutes']);
      setEditRoute(null);
      resetRouteForm();
      toast.success('Route updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Failed')
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (id) => {
      if (!workspace?.slug) throw new Error('No workspace');
      return deleteGatewayRoute(workspace.slug, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayRoutes']);
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Failed')
  });

  const createConsumerMutation = useMutation({
    mutationFn: (data) => {
      if (!workspace?.slug) throw new Error('No workspace');
      return createConsumer(workspace.slug, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayConsumers']);
      setCreateOpen(false);
      toast.success('Consumer created');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Failed')
  });

  const toggleConsumerMutation = useMutation({
    mutationFn: (id) => {
      if (!workspace?.slug) throw new Error('No workspace');
      return toggleConsumer(workspace.slug, id);
    },
    onSuccess: () => queryClient.invalidateQueries(['gatewayConsumers']),
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Failed')
  });

  const deleteConsumerMutation = useMutation({
    mutationFn: (id) => {
      if (!workspace?.slug) throw new Error('No workspace');
      return deleteConsumer(workspace.slug, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayConsumers']);
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Failed')
  });

  const resetRouteForm = () => {
    setRouteForm({
      name: '', path: '', methods: ['GET'], upstreamUrl: '', stripPath: false, timeout: 30000,
      auth: { type: 'none' },
      rateLimit: { enabled: false, limit: 100, window: 60 }
    });
  };

  const convertRouteToForm = (route) => ({
    name: route.name || '',
    path: route.path || '',
    methods: route.methods || ['GET'],
    upstreamUrl: route.upstream?.url || route.upstreamUrl || '',
    stripPath: route.stripPath || false,
    timeout: route.upstream?.timeout || route.timeout || 30000,
    auth: { type: route.auth?.type || 'none' },
    rateLimit: {
      enabled: route.rateLimit?.enabled || false,
      limit: route.rateLimit?.requestsPerMinute || route.rateLimit?.limit || 100,
      window: route.rateLimit?.burstSize || route.rateLimit?.window || 60
    }
  });

  const convertFormToBackend = (form) => ({
    name: form.name,
    path: form.path,
    methods: form.methods,
    upstream: {
      url: form.upstreamUrl,
      timeout: form.timeout
    },
    stripPath: form.stripPath,
    auth: {
      type: form.auth?.type || 'none',
      required: form.auth?.type !== 'none'
    },
    rateLimit: {
      enabled: form.rateLimit?.enabled || false,
      requestsPerMinute: form.rateLimit?.limit || 100,
      burstSize: form.rateLimit?.window || 10
    }
  });

  const routes = routesData?.data?.routes || [];
  const consumers = consumersData?.data?.consumers || [];
  const logs = logsData?.data?.logs || [];
  const logsTotal = logsData?.data?.total || 0;
  const logsLimit = logsData?.data?.limit || 50;
  const totalPages = Math.ceil(logsTotal / logsLimit);
  const stats = statsData?.data?.stats;

  if (routesLoading || consumersLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">API Gateway</h1>
          <p className="text-devrelay-text-dim mt-1">Route management and rate limiting</p>
        </div>
        {activeTab !== 'logs' && (
        <button
          onClick={() => {
            if (activeTab === 'consumers') {
              setConsumerForm({ name: '', key: '', secret: '', isActive: true, rateLimit: { perSecond: 10, perMinute: 60, perDay: 1000 }, monthlyRequests: 10000 });
              setCreateOpen(true);
            } else {
              setCreateOpen(true);
            }
          }}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'routes' ? 'Add Route' : activeTab === 'consumers' ? 'Add Consumer' : 'Add'}
        </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'routes', label: 'Routes', icon: Activity, count: routes.length },
          { key: 'consumers', label: 'Consumers', icon: Users, count: consumers.length },
          { key: 'logs', label: 'Logs', icon: Clock, count: logs.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              activeTab === tab.key 
                ? 'bg-devrelay-green/20 text-devrelay-green border border-devrelay-green/30' 
                : 'bg-devrelay-surface2 border border-devrelay-border text-devrelay-text-dim hover:border-devrelay-green/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="text-xs px-1.5 py-0.5 bg-devrelay-bg rounded">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.length === 0 ? (
            <div className="col-span-2">
              <EmptyState title="No routes" description="Add your first API route" />
            </div>
          ) : routes.map((route, i) => (
            <RouteCard
              key={route._id || route.id}
              route={route}
              index={i}
              total={routes.length}
              workspaceSlug={workspace?.slug}
              onEdit={(r) => { setEditRoute(r); setRouteForm(convertRouteToForm(r)); setCreateOpen(true); }}
              onDelete={(r) => setDeleteConfirm({ type: 'route', ...r })}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
            />
          ))}
        </div>
      )}

      {activeTab === 'consumers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consumers.length === 0 ? (
            <EmptyState title="No consumers" description="Add your first API consumer" />
          ) : consumers.map(consumer => {
            const monthlyUsed = consumer.monthlyUsed ?? consumer.quotas?.currentMonthCount ?? 0;
            const monthlyRequests = consumer.monthlyRequests ?? consumer.quotas?.monthlyRequests ?? 10000;
            const rps = consumer.rateLimit?.perSecond ?? consumer.rateLimits?.requestsPerSecond ?? 10;
            const rpm = consumer.rateLimit?.perMinute ?? consumer.rateLimits?.requestsPerMinute ?? 60;
            const rpd = consumer.rateLimit?.perDay ?? consumer.rateLimits?.requestsPerDay ?? 1000;
            return (
            <div key={consumer._id || consumer.id} onClick={() => setSelectedConsumer(consumer)} className="bg-devrelay-surface border border-devrelay-border rounded-lg p-4 hover:border-devrelay-green/50 cursor-pointer transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-devrelay-text font-medium">{consumer.name}</p>
                  <p className="text-devrelay-green font-mono text-sm">{consumer.key}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleConsumerMutation.mutate(consumer._id || consumer.id); }}
                  className={`w-3 h-3 rounded-full ${consumer.isActive ? 'bg-devrelay-green' : 'bg-devrelay-border'}`}
                />
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-devrelay-text-dim mb-1">
                  <span>Monthly Quota</span>
                  <span>{monthlyUsed} / {monthlyRequests}</span>
                </div>
                <div className="h-2 bg-devrelay-surface2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${monthlyUsed / monthlyRequests > 0.8 ? 'bg-devrelay-red' : 'bg-devrelay-green'}`}
                    style={{ width: `${Math.min(100, (monthlyUsed / monthlyRequests) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-devrelay-text-dim">
                  {rpm}/min, {rpd}/day
                </span>
                <button onClick={() => setDeleteConfirm({ type: 'consumer', ...consumer })}>
                  <Trash2 className="w-4 h-4 text-devrelay-red" />
                </button>
              </div>
            </div>
            );})}
        </div>
      )}

      {activeTab === 'logs' && (
        <>
          <StatsBar stats={stats} />
          <div className="flex gap-4 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-devrelay-surface2 border border-devrelay-border rounded px-3">
              <Search className="w-4 h-4 text-devrelay-text-dim" />
              <input
                type="text"
                placeholder="Filter by route path..."
                value={filterRoute}
                onChange={(e) => setFilterRoute(e.target.value)}
                className="flex-1 bg-transparent text-devrelay-text py-2 outline-none"
              />
            </div>
            <div className="flex gap-2">
              {['2xx', '3xx', '4xx', '5xx'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus.includes(s) ? filterStatus.filter(x => x !== s) : [...filterStatus, s])}
                  className={`px-3 py-1 rounded text-sm ${
                    filterStatus.includes(s) ? `${statusColors[s]} bg-devrelay-surface2 border` : 'text-devrelay-text-dim border border-devrelay-border'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
<div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-devrelay-text-dim">
                  No logs found. Make requests to your API routes to see logs here.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-devrelay-border">
                      <th className="text-left text-sm text-devrelay-text-dim px-4 py-3">Time</th>
                      <th className="text-left text-sm text-devrelay-text-dim px-4 py-3">Method</th>
                      <th className="text-left text-sm text-devrelay-text-dim px-4 py-3">Path</th>
                      <th className="text-left text-sm text-devrelay-text-dim px-4 py-3">Status</th>
                      <th className="text-left text-sm text-devrelay-text-dim px-4 py-3">Duration</th>
                      <th className="text-left text-sm text-devrelay-text-dim px-4 py-3">Consumer</th>
                      <th className="text-left text-sm text-devrelay-text-dim px-4 py-3">Upstream</th>
                      <th className="text-left text-sm text-devrelay-text-dim px-4 py-3">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => <LogRow key={i} log={log} />)}
                  </tbody>
                </table>
              )}
            </div>
            {logs.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
            )}
        </>
      )}

      <SlideOver 
        open={createOpen} 
        onClose={() => { setCreateOpen(false); setEditRoute(null); resetRouteForm(); }} 
        title={activeTab === 'consumers' ? 'Add Consumer' : editRoute ? 'Edit Route' : 'Add Route'}
      >
        {activeTab === 'consumers' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
              <input
                type="text"
                value={consumerForm.name}
                onChange={(e) => setConsumerForm({ ...consumerForm, name: e.target.value })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                placeholder="Mobile App"
              />
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">API Key</label>
              <input
                type="text"
                value={consumerForm.key}
                onChange={(e) => setConsumerForm({ ...consumerForm, key: e.target.value })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
                placeholder="auto-generated if empty"
              />
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Secret</label>
              <input
                type="text"
                value={consumerForm.secret}
                onChange={(e) => setConsumerForm({ ...consumerForm, secret: e.target.value })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
                placeholder="auto-generated if empty"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-devrelay-text-dim mb-1">Per Second</label>
                <input
                  type="number"
                  value={consumerForm.rateLimit.perSecond}
                  onChange={(e) => setConsumerForm({ ...consumerForm, rateLimit: { ...consumerForm.rateLimit, perSecond: parseInt(e.target.value) } })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text"
                />
              </div>
              <div>
                <label className="block text-xs text-devrelay-text-dim mb-1">Per Minute</label>
                <input
                  type="number"
                  value={consumerForm.rateLimit.perMinute}
                  onChange={(e) => setConsumerForm({ ...consumerForm, rateLimit: { ...consumerForm.rateLimit, perMinute: parseInt(e.target.value) } })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text"
                />
              </div>
              <div>
                <label className="block text-xs text-devrelay-text-dim mb-1">Per Day</label>
                <input
                  type="number"
                  value={consumerForm.rateLimit.perDay}
                  onChange={(e) => setConsumerForm({ ...consumerForm, rateLimit: { ...consumerForm.rateLimit, perDay: parseInt(e.target.value) } })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-devrelay-text-dim mb-2">Monthly Requests</label>
              <input
                type="number"
                value={consumerForm.monthlyRequests}
                onChange={(e) => setConsumerForm({ ...consumerForm, monthlyRequests: parseInt(e.target.value) })}
                className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={consumerForm.isActive}
                onChange={(e) => setConsumerForm({ ...consumerForm, isActive: e.target.checked })}
                className="rounded border-devrelay-border"
                id="isActive"
              />
              <label htmlFor="isActive" className="text-sm text-devrelay-text">Active</label>
            </div>
            <button
              onClick={() => {
              const key = consumerForm.key || 'key-' + Math.random().toString(36).substring(2, 15);
              const secret = consumerForm.secret || 'secret-' + Math.random().toString(36).substring(2, 15);
              createConsumerMutation.mutate({
                name: consumerForm.name,
                key,
                secret,
                isActive: consumerForm.isActive,
                rateLimits: {
                  requestsPerSecond: consumerForm.rateLimit.perSecond,
                  requestsPerMinute: consumerForm.rateLimit.perMinute,
                  requestsPerDay: consumerForm.rateLimit.perDay
                },
                quotas: {
                  monthlyRequests: consumerForm.monthlyRequests,
                  currentMonthCount: 0
                }
              });
            }}
              disabled={createConsumerMutation.isPending || !consumerForm.name}
              className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
            >
              {createConsumerMutation.isPending ? 'Creating...' : 'Create Consumer'}
            </button>
          </div>
        ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
            <input
              type="text"
              value={routeForm.name}
              onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              placeholder="Get Users"
            />
          </div>
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Path *</label>
            <input
              type="text"
              value={routeForm.path}
              onChange={(e) => setRouteForm({ ...routeForm, path: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
              placeholder="/api/users"
            />
          </div>
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Methods</label>
            <div className="flex gap-2 flex-wrap">
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    const methods = routeForm.methods.includes(m)
                      ? routeForm.methods.filter(x => x !== m)
                      : [...routeForm.methods, m];
                    setRouteForm({ ...routeForm, methods });
                  }}
                  className={`px-3 py-1 rounded text-sm ${
                    routeForm.methods.includes(m) ? `${methodColors[m]} border` : 'text-devrelay-text-dim border border-devrelay-border'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Upstream URL *</label>
            <input
              type="url"
              value={routeForm.upstreamUrl}
              onChange={(e) => setRouteForm({ ...routeForm, upstreamUrl: e.target.value })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
              placeholder="https://api.example.com"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-devrelay-text">
              <input
                type="checkbox"
                checked={routeForm.stripPath}
                onChange={(e) => setRouteForm({ ...routeForm, stripPath: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              Strip Path
            </label>
            <label className="flex items-center gap-2 text-sm text-devrelay-text">
              <input
                type="checkbox"
                checked={routeForm.rateLimit.enabled}
                onChange={(e) => setRouteForm({ ...routeForm, rateLimit: { ...routeForm.rateLimit, enabled: e.target.checked } })}
                className="w-4 h-4 rounded"
              />
              Rate Limit
            </label>
          </div>
          {routeForm.rateLimit.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-devrelay-text-dim mb-1">Requests/min</label>
                <input
                  type="number"
                  value={routeForm.rateLimit.limit}
                  onChange={(e) => setRouteForm({ ...routeForm, rateLimit: { ...routeForm.rateLimit, limit: parseInt(e.target.value) } })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text"
                />
              </div>
              <div>
                <label className="block text-xs text-devrelay-text-dim mb-1">Burst</label>
                <input
                  type="number"
                  value={routeForm.rateLimit.window}
                  onChange={(e) => setRouteForm({ ...routeForm, rateLimit: { ...routeForm.rateLimit, window: parseInt(e.target.value) } })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2 text-devrelay-text"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Auth Type</label>
            <select
              value={routeForm.auth?.type || 'none'}
              onChange={(e) => setRouteForm({ ...routeForm, auth: { type: e.target.value } })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
            >
              <option value="none">None - No authentication</option>
              <option value="consumer-key">Consumer API Key - Requires X-API-Key header</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Timeout (ms)</label>
            <input
              type="number"
              value={routeForm.timeout}
              onChange={(e) => setRouteForm({ ...routeForm, timeout: parseInt(e.target.value) })}
              className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
            />
          </div>
          <button
            onClick={() => {
              const backendData = convertFormToBackend(routeForm);
              if (editRoute) {
                updateRouteMutation.mutate(backendData);
              } else {
                createRouteMutation.mutate(backendData);
              }
            }}
            disabled={createRouteMutation.isPending || updateRouteMutation.isPending || !routeForm.name || !routeForm.path || !routeForm.upstreamUrl}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createRouteMutation.isPending || updateRouteMutation.isPending ? 'Saving...' : editRoute ? 'Update Route' : 'Create Route'}
          </button>
        </div>
        )}
      </SlideOver>

      {selectedConsumer && (
        <SlideOver open={!!selectedConsumer} onClose={() => setSelectedConsumer(null)} title="Consumer Details">
          <div className="space-y-6">
            <div>
              <label className="block text-xs text-devrelay-text-dim mb-1">Name</label>
              <p className="text-devrelay-text text-lg font-medium">{selectedConsumer.name}</p>
            </div>
            <div>
              <label className="block text-xs text-devrelay-text-dim mb-1">API Key</label>
              <div className="flex items-center gap-2 bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2">
                <code className="text-devrelay-green font-mono flex-1">{selectedConsumer.key}</code>
                <button onClick={() => navigator.clipboard.writeText(selectedConsumer.key)} className="text-devrelay-text-dim hover:text-devrelay-green">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-devrelay-text-dim mb-1">Secret</label>
              <div className="flex items-center gap-2 bg-devrelay-surface2 border border-devrelay-border rounded px-3 py-2">
                <code className="text-devrelay-text font-mono flex-1">
                  {showSecret[selectedConsumer._id] ? selectedConsumer.secret : '••••••••••••••••'}
                </code>
                <button onClick={() => setShowSecret({ ...showSecret, [selectedConsumer._id]: !showSecret[selectedConsumer._id] })} className="text-devrelay-text-dim hover:text-devrelay-green">
                  {showSecret[selectedConsumer._id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => navigator.clipboard.writeText(selectedConsumer.secret || '')} className="text-devrelay-text-dim hover:text-devrelay-green">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-devrelay-surface2 border border-devrelay-border rounded p-3">
                <label className="block text-xs text-devrelay-text-dim mb-1">Per Second</label>
                <p className="text-devrelay-text font-medium">{selectedConsumer.rateLimits?.requestsPerSecond || selectedConsumer.rateLimit?.perSecond || 10}</p>
              </div>
              <div className="bg-devrelay-surface2 border border-devrelay-border rounded p-3">
                <label className="block text-xs text-devrelay-text-dim mb-1">Per Minute</label>
                <p className="text-devrelay-text font-medium">{selectedConsumer.rateLimits?.requestsPerMinute || selectedConsumer.rateLimit?.perMinute || 60}</p>
              </div>
              <div className="bg-devrelay-surface2 border border-devrelay-border rounded p-3">
                <label className="block text-xs text-devrelay-text-dim mb-1">Per Day</label>
                <p className="text-devrelay-text font-medium">{selectedConsumer.rateLimits?.requestsPerDay || selectedConsumer.rateLimit?.perDay || 1000}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs text-devrelay-text-dim mb-1">Monthly Quota</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-devrelay-surface2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-devrelay-green"
                    style={{ width: `${((selectedConsumer.quotas?.currentMonthCount || selectedConsumer.monthlyUsed || 0) / (selectedConsumer.quotas?.monthlyRequests || selectedConsumer.monthlyRequests || 10000)) * 100}%` }}
                  />
                </div>
                <span className="text-devrelay-text-dim text-sm">
                  {selectedConsumer.quotas?.currentMonthCount || selectedConsumer.monthlyUsed || 0} / {selectedConsumer.quotas?.monthlyRequests || selectedConsumer.monthlyRequests || 10000}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-devrelay-text-dim">Status:</span>
              <span className={`px-2 py-1 rounded text-sm ${selectedConsumer.isActive ? 'bg-devrelay-green/20 text-devrelay-green' : 'bg-devrelay-border text-devrelay-text-dim'}`}>
                {selectedConsumer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-3 pt-4 border-t border-devrelay-border">
              <button
                onClick={() => { toggleConsumerMutation.mutate(selectedConsumer._id || selectedConsumer.id); setSelectedConsumer(null); }}
                className="flex-1 bg-devrelay-surface2 border border-devrelay-border text-devrelay-text py-2 rounded hover:border-devrelay-green/50"
              >
                {selectedConsumer.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => { setDeleteConfirm({ type: 'consumer', ...selectedConsumer }); setSelectedConsumer(null); }}
                className="flex-1 bg-devrelay-red/20 border border-devrelay-red text-devrelay-red py-2 rounded hover:bg-devrelay-red/30"
              >
                Delete
              </button>
            </div>
          </div>
        </SlideOver>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm.type === 'route' ? deleteRouteMutation.mutate(deleteConfirm._id || deleteConfirm.id) : deleteConsumerMutation.mutate(deleteConfirm._id || deleteConfirm.id)}
        title={`Delete ${deleteConfirm?.type === 'route' ? 'Route' : 'Consumer'}`}
        description={`Are you sure you want to delete "${deleteConfirm?.name || deleteConfirm?.path}"?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}