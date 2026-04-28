import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { Plus, Trash2, Edit, Clock, Activity, Users, ChevronUp, ChevronDown, X, Copy, Search, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listGatewayRoutes, createGatewayRoute, updateGatewayRoute, deleteGatewayRoute, getGatewayLogs, getGatewayStats, createConsumer, toggleConsumer, deleteConsumer, getConsumerUsage } from '../../api/resources/gateway';
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

function RouteCard({ route, onEdit, onDelete, onMoveUp, onMoveDown, index, total }) {
  const [expanded, setExpanded] = useState(false);

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
          <p className="text-devrelay-text-dim text-sm font-mono mt-1">{truncateJson(route.upstreamUrl, 60)}</p>
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
          Rate: <span className="text-devrelay-text">{route.rateLimit?.enabled ? `${route.rateLimit.limit}/min` : 'Unlimited'}</span>
        </span>
        <span className="text-devrelay-text-dim">
          Timeout: <span className="text-devrelay-text">{route.timeout ? `${route.timeout}ms` : '-'}</span>
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
  const duration = log.duration;
  const durationColor = duration < 100 ? 'text-devrelay-green' : duration < 500 ? 'text-devrelay-amber' : 'text-devrelay-red';
  const statusCode = log.status || log.statusCode;
  const statusCategory = statusCode < 300 ? '2xx' : statusCode < 400 ? '3xx' : statusCode < 500 ? '4xx' : '5xx';

  return (
    <tr className="border-b border-devrelay-border hover:bg-devrelay-surface2">
      <td className="px-4 py-3 text-devrelay-text-dim text-sm">{log.timestamp ? formatRelative(log.timestamp) : '-'}</td>
      <td className="px-4 py-3"><MethodBadge method={log.method} /></td>
      <td className="px-4 py-3 text-devrelay-text font-mono text-sm">{log.path}</td>
      <td className={`px-4 py-3 font-mono ${statusColors[statusCategory]}`}>{statusCode || '-'}</td>
      <td className={`px-4 py-3 font-mono ${durationColor}`}>{duration ? `${duration}ms` : '-'}</td>
      <td className="px-4 py-3 text-devrelay-text-dim text-sm font-mono">{log.consumerKey || 'anonymous'}</td>
      <td className="px-4 py-3 text-devrelay-text-dim text-sm font-mono">{truncateJson(log.upstreamTime, 30)}</td>
      <td className="px-4 py-3 text-devrelay-text-dim text-sm">{log.responseSize ? `${log.responseSize}b` : '-'}</td>
    </tr>
  );
}

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {[
        { label: 'p50 Latency', value: stats.p50Latency },
        { label: 'p95 Latency', value: stats.p95Latency },
        { label: 'p99 Latency', value: stats.p99Latency },
        { label: 'Error Rate', value: stats.errorRate ? `${stats.errorRate}%` : '0%' },
        { label: 'Req/min', value: stats.requestsPerMinute || 0 }
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

  const { data: routesData, isLoading: routesLoading } = useQuery({
    queryKey: ['gatewayRoutes', workspace?.slug],
    queryFn: () => listGatewayRoutes(workspace.slug),
    enabled: !!workspace?.slug
  });

  const { data: consumersData, isLoading: consumersLoading } = useQuery({
    queryKey: ['gatewayConsumers', workspace?.slug],
    queryFn: () => listConsumers(workspace.slug),
    enabled: !!workspace?.slug
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['gatewayStats', workspace?.slug],
    queryFn: () => getGatewayStats(workspace.slug),
    enabled: !!workspace?.slug && activeTab === 'logs'
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['gatewayLogs', workspace?.slug, debouncedRoute, filterStatus, page],
    queryFn: () => getGatewayLogs(workspace.slug, { route: debouncedRoute, status: filterStatus, page, limit: 50 }),
    enabled: !!workspace?.slug
  });

  const createRouteMutation = useMutation({
    mutationFn: (data) => createGatewayRoute(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayRoutes']);
      setCreateOpen(false);
      resetRouteForm();
      toast.success('Route created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  });

  const updateRouteMutation = useMutation({
    mutationFn: (data) => updateGatewayRoute(workspace.slug, editRoute._id || editRoute.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayRoutes']);
      setEditRoute(null);
      resetRouteForm();
      toast.success('Route updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (id) => deleteGatewayRoute(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayRoutes']);
      setDeleteConfirm(null);
    }
  });

  const createConsumerMutation = useMutation({
    mutationFn: (data) => createConsumer(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayConsumers']);
      setCreateOpen(false);
      toast.success('Consumer created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  });

  const toggleConsumerMutation = useMutation({
    mutationFn: (id) => toggleConsumer(workspace.slug, id),
    onSuccess: () => queryClient.invalidateQueries(['gatewayConsumers'])
  });

  const deleteConsumerMutation = useMutation({
    mutationFn: (id) => deleteConsumer(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayConsumers']);
      setDeleteConfirm(null);
    }
  });

  const resetRouteForm = () => {
    setRouteForm({
      name: '', path: '', methods: ['GET'], upstreamUrl: '', stripPath: false, timeout: 30000,
      auth: { type: 'none' },
      rateLimit: { enabled: false, limit: 100, window: 60 }
    });
  };

  const routes = routesData?.data?.routes || [];
  const consumers = consumersData?.data?.consumers || [];
  const logs = logsData?.data?.logs || [];
  const stats = statsData?.data;

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
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-devrelay-green text-devrelay-bg font-medium px-4 py-2 rounded hover:bg-devrelay-green-dim"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'routes' ? 'Add Route' : activeTab === 'consumers' ? 'Add Consumer' : 'Add'}
        </button>
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
              onEdit={(r) => { setEditRoute(r); setRouteForm(r); setCreateOpen(true); }}
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
          ) : consumers.map(consumer => (
            <div key={consumer._id || consumer.id} className="bg-devrelay-surface border border-devrelay-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-devrelay-text font-medium">{consumer.name}</p>
                  <p className="text-devrelay-green font-mono text-sm">{consumer.key}</p>
                </div>
                <button
                  onClick={() => toggleConsumerMutation.mutate(consumer._id || consumer.id)}
                  className={`w-3 h-3 rounded-full ${consumer.isActive ? 'bg-devrelay-green' : 'bg-devrelay-border'}`}
                />
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-devrelay-text-dim mb-1">
                  <span>Monthly Quota</span>
                  <span>{consumer.monthlyUsed || 0} / {consumer.monthlyRequests || 10000}</span>
                </div>
                <div className="h-2 bg-devrelay-surface2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${(consumer.monthlyUsed || 0) / (consumer.monthlyRequests || 10000) > 0.8 ? 'bg-devrelay-red' : 'bg-devrelay-green'}`}
                    style={{ width: `${Math.min(100, ((consumer.monthlyUsed || 0) / (consumer.monthlyRequests || 10000)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-devrelay-text-dim">
                  {consumer.rateLimit?.perMinute || 60}/min, {consumer.rateLimit?.perDay || 1000}/day
                </span>
                <button onClick={() => setDeleteConfirm({ type: 'consumer', ...consumer })}>
                  <Trash2 className="w-4 h-4 text-devrelay-red" />
                </button>
              </div>
            </div>
          ))}
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
          </div>
          <div className="mt-4 flex justify-center">
            <Pagination page={page} totalPages={10} onChange={setPage} />
          </div>
        </>
      )}

      <SlideOver 
        open={createOpen} 
        onClose={() => { setCreateOpen(false); setEditRoute(null); resetRouteForm(); }} 
        title={editRoute ? 'Edit Route' : 'Add Route'}
      >
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
              <option value="none">None</option>
              <option value="jwt">JWT</option>
              <option value="api-key">API Key</option>
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
            onClick={() => editRoute ? updateRouteMutation.mutate(routeForm) : createRouteMutation.mutate(routeForm)}
            disabled={createRouteMutation.isPending || !routeForm.name || !routeForm.path || !routeForm.upstreamUrl}
            className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
          >
            {createRouteMutation.isPending ? 'Saving...' : editRoute ? 'Update Route' : 'Create Route'}
          </button>
        </div>
      </SlideOver>

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