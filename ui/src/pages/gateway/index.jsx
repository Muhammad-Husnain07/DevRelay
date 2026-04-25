import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, RotateCcw, Clock, Search, Activity, Users } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listGatewayRoutes, createGatewayRoute, deleteGatewayRoute, listConsumers, createConsumer, deleteConsumer, getGatewayLogs } from '../../api/resources/gateway';
import { formatRelative, formatJson, truncateJson } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';

const methodColors = {
  GET: 'bg-devrelay-green/20 text-devrelay-green',
  POST: 'bg-devrelay-blue/20 text-devrelay-blue',
  PUT: 'bg-devrelay-amber/20 text-devrelay-amber',
  PATCH: 'bg-devrelay-purple/20 text-devrelay-purple',
  DELETE: 'bg-devrelay-red/20 text-devrelay-red',
  OPTIONS: 'bg-devrelay-border text-devrelay-text-dim'
};

export default function Gateway() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('routes');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [routeForm, setRouteForm] = useState({
    path: '', method: 'GET', upstreamUrl: '', stripPath: false, timeout: 30000,
    rateLimit: { enabled: false, limit: 100, window: 60 },
    cache: { enabled: false, ttl: 300 }
  });
  
  const [consumerForm, setConsumerForm] = useState({
    name: '', key: '', secret: '',
    rateLimit: { limit: 100, window: 60 }
  });

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

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['gatewayLogs', workspace?.slug],
    queryFn: () => getGatewayLogs(workspace.slug, { limit: 50 }),
    enabled: !!workspace?.slug
  });

  const createRouteMutation = useMutation({
    mutationFn: (data) => createGatewayRoute(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayRoutes']);
      setCreateOpen(false);
      setRouteForm({
        path: '', method: 'GET', upstreamUrl: '', stripPath: false, timeout: 30000,
        rateLimit: { enabled: false, limit: 100, window: 60 },
        cache: { enabled: false, ttl: 300 }
      });
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to create')
  });

  const createConsumerMutation = useMutation({
    mutationFn: (data) => createConsumer(workspace.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayConsumers']);
      setCreateOpen(false);
      setConsumerForm({ name: '', key: '', secret: '', rateLimit: { limit: 100, window: 60 } });
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to create')
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (id) => deleteGatewayRoute(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayRoutes']);
      setDeleteConfirm(null);
    }
  });

  const deleteConsumerMutation = useMutation({
    mutationFn: (id) => deleteConsumer(workspace.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['gatewayConsumers']);
      setDeleteConfirm(null);
    }
  });

  const routes = routesData?.data?.routes || [];
  const consumers = consumersData?.data?.consumers || [];
  const logs = logsData?.data?.logs || [];

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
          {activeTab === 'routes' ? 'Add Route' : 'Add Consumer'}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'routes', label: 'Routes', icon: Search, count: routes.length },
          { key: 'consumers', label: 'Consumers', icon: Users, count: consumers.length },
          { key: 'logs', label: 'Logs', icon: Activity, count: logs.length }
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
        routes.length === 0 ? (
          <EmptyState title="No routes" description="Add your first API route" />
        ) : (
          <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-devrelay-border">
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Method</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Path</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Upstream</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Rate Limit</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Timeout</th>
                  <th className="text-right text-sm text-devrelay-text-dim px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(route => (
                  <tr key={route._id || route.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded font-mono ${methodColors[route.method]}`}>
                        {route.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-devrelay-text font-mono text-sm">{route.path}</td>
                    <td className="px-6 py-4 text-devrelay-text-dim text-sm font-mono">{truncateJson(route.upstreamUrl, 40)}</td>
                    <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                      {route.rateLimit?.enabled ? `${route.rateLimit.limit}/${route.rateLimit.window}s` : '-'}
                    </td>
                    <td className="px-6 py-4 text-devrelay-text-dim text-sm">{route.timeout ? `${route.timeout / 1000}s` : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setDeleteConfirm({ type: 'route', ...route })} 
                          className="p-2 hover:bg-devrelay-border rounded"
                        >
                          <Trash2 className="w-4 h-4 text-devrelay-red" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === 'consumers' && (
        consumers.length === 0 ? (
          <EmptyState title="No consumers" description="Add your first API consumer" />
        ) : (
          <div className="bg-devrelay-surface border border-devrelay-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-devrelay-border">
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Name</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">API Key</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Rate Limit</th>
                  <th className="text-left text-sm text-devrelay-text-dim px-6 py-3">Created</th>
                  <th className="text-right text-sm text-devrelay-text-dim px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {consumers.map(consumer => (
                  <tr key={consumer._id || consumer.id} className="border-b border-devrelay-border hover:bg-devrelay-surface2">
                    <td className="px-6 py-4 text-devrelay-text font-medium">{consumer.name}</td>
                    <td className="px-6 py-4 text-devrelay-text font-mono text-sm">{consumer.key}</td>
                    <td className="px-6 py-4 text-devrelay-text-dim text-sm">
                      {consumer.rateLimit?.limit || 100}/{consumer.rateLimit?.window || 60}s
                    </td>
                    <td className="px-6 py-4 text-devrelay-text-dim text-sm">{formatRelative(consumer.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setDeleteConfirm({ type: 'consumer', ...consumer })} 
                        className="p-2 hover:bg-devrelay-border rounded"
                      >
                        <Trash2 className="w-4 h-4 text-devrelay-red" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === 'logs' && (
        logs.length === 0 ? (
          <EmptyState title="No logs" description="Gateway request logs will appear here" />
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-devrelay-surface border border-devrelay-border rounded-lg">
                <span className={`px-2 py-1 text-xs rounded font-mono ${methodColors[log.method]}`}>
                  {log.method}
                </span>
                <span className="text-devrelay-text font-mono flex-1">{log.path}</span>
                <StatusBadge status={log.status < 400 ? 'success' : 'error'} label={log.status} />
                <span className="text-devrelay-text-dim text-sm font-mono">{log.duration}ms</span>
                <span className="text-devrelay-text-dim text-sm">{formatRelative(log.timestamp)}</span>
              </div>
            ))}
          </div>
        )
      )}

      <SlideOver 
        open={createOpen} 
        onClose={() => setCreateOpen(false)} 
        title={activeTab === 'routes' ? 'Add Route' : 'Add Consumer'}
      >
        <div className="space-y-6">
          {activeTab === 'routes' ? (
            <>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Method</label>
                <select
                  value={routeForm.method}
                  onChange={(e) => setRouteForm({ ...routeForm, method: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                >
                  {Object.keys(methodColors).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Path *</label>
                <input
                  type="text"
                  value={routeForm.path}
                  onChange={(e) => setRouteForm({ ...routeForm, path: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
                  placeholder="/api/v1/users"
                />
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
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Timeout (seconds)</label>
                <input
                  type="number"
                  value={routeForm.timeout / 1000}
                  onChange={(e) => setRouteForm({ ...routeForm, timeout: parseInt(e.target.value) * 1000 })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stripPath"
                  checked={routeForm.stripPath}
                  onChange={(e) => setRouteForm({ ...routeForm, stripPath: e.target.checked })}
                  className="w-4 h-4 rounded border-devrelay-border"
                />
                <label htmlFor="stripPath" className="text-sm text-devrelay-text">Strip path prefix</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rateLimitEnabled"
                  checked={routeForm.rateLimit.enabled}
                  onChange={(e) => setRouteForm({ ...routeForm, rateLimit: { ...routeForm.rateLimit, enabled: e.target.checked } })}
                  className="w-4 h-4 rounded border-devrelay-border"
                />
                <label htmlFor="rateLimitEnabled" className="text-sm text-devrelay-text">Enable rate limiting</label>
              </div>
              {routeForm.rateLimit.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-devrelay-text-dim mb-2">Limit</label>
                    <input
                      type="number"
                      value={routeForm.rateLimit.limit}
                      onChange={(e) => setRouteForm({ ...routeForm, rateLimit: { ...routeForm.rateLimit, limit: parseInt(e.target.value) } })}
                      className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-devrelay-text-dim mb-2">Window (seconds)</label>
                    <input
                      type="number"
                      value={routeForm.rateLimit.window}
                      onChange={(e) => setRouteForm({ ...routeForm, rateLimit: { ...routeForm.rateLimit, window: parseInt(e.target.value) } })}
                      className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                    />
                  </div>
                </div>
              )}
              <button
                onClick={() => createRouteMutation.mutate(routeForm)}
                disabled={createRouteMutation.isPending || !routeForm.path || !routeForm.upstreamUrl}
                className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
              >
                {createRouteMutation.isPending ? 'Creating...' : 'Create Route'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">Name *</label>
                <input
                  type="text"
                  value={consumerForm.name}
                  onChange={(e) => setConsumerForm({ ...consumerForm, name: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                  placeholder="My API Client"
                />
              </div>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">API Key *</label>
                <input
                  type="text"
                  value={consumerForm.key}
                  onChange={(e) => setConsumerForm({ ...consumerForm, key: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
                  placeholder="sk_live_..."
                />
              </div>
              <div>
                <label className="block text-sm text-devrelay-text-dim mb-2">API Secret</label>
                <input
                  type="password"
                  value={consumerForm.secret}
                  onChange={(e) => setConsumerForm({ ...consumerForm, secret: e.target.value })}
                  className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text font-mono"
                  placeholder="sk_..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-devrelay-text-dim mb-2">Rate Limit</label>
                  <input
                    type="number"
                    value={consumerForm.rateLimit.limit}
                    onChange={(e) => setConsumerForm({ ...consumerForm, rateLimit: { ...consumerForm.rateLimit, limit: parseInt(e.target.value) } })}
                    className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                  />
                </div>
                <div>
                  <label className="block text-sm text-devrelay-text-dim mb-2">Window (seconds)</label>
                  <input
                    type="number"
                    value={consumerForm.rateLimit.window}
                    onChange={(e) => setConsumerForm({ ...consumerForm, rateLimit: { ...consumerForm.rateLimit, window: parseInt(e.target.value) } })}
                    className="w-full bg-devrelay-surface2 border border-devrelay-border rounded px-4 py-2 text-devrelay-text"
                  />
                </div>
              </div>
              <button
                onClick={() => createConsumerMutation.mutate(consumerForm)}
                disabled={createConsumerMutation.isPending || !consumerForm.name || !consumerForm.key}
                className="w-full bg-devrelay-green text-devrelay-bg font-medium py-3 rounded hover:bg-devrelay-green-dim disabled:opacity-50"
              >
                {createConsumerMutation.isPending ? 'Creating...' : 'Create Consumer'}
              </button>
            </>
          )}
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