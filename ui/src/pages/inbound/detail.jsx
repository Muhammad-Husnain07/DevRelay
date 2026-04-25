import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Copy, ChevronDown, ChevronRight, Play, Check, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getInbound, getInboundRequests } from '../../api/resources/events';
import { formatDateTime, truncate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import CopyButton from '../../components/ui/CopyButton';

function RequestRow({ request, workspaceSlug }) {
  const [expanded, setExpanded] = useState(false);
  const headers = request.headers || {};
  const body = request.body;

  return (
    <div className="border border-devrelay-border rounded mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-devrelay-surface2 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-devrelay-text-dim" /> : <ChevronRight className="w-4 h-4 text-devrelay-text-dim" />}
          <span className="text-sm text-devrelay-text">{formatDateTime(request.createdAt)}</span>
          <span className="px-2 py-0.5 bg-devrelay-blue/20 text-devrelay-blue text-xs rounded">{request.method || 'POST'}</span>
          <span className="text-sm text-devrelay-text-dim">{request.size ? `${(request.size / 1024).toFixed(1)} KB` : '-'}</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status="success" label="Received" />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-devrelay-border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-devrelay-text mb-2">Headers</h4>
              <div className="bg-devrelay-bg rounded p-3 max-h-48 overflow-y-auto">
                {Object.entries(headers).map(([key, value]) => (
                  <div key={key} className="text-xs font-mono text-devrelay-text-dim py-1">
                    <span className="text-devrelay-green">{key}</span>: {value}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-devrelay-text mb-2">Body</h4>
              <div className="bg-devrelay-bg rounded p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs font-mono text-devrelay-text whitespace-pre-wrap">
                  {typeof body === 'object' ? JSON.stringify(body, null, 2) : body || '(empty)'}
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-devrelay-green/20 text-devrelay-green text-sm rounded hover:bg-devrelay-green/30">
              <Play className="w-3 h-3" />
              Replay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InboundDetail() {
  const { slug } = useParams();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);

  const { data: inbound, isLoading: loadingInbound } = useQuery({
    queryKey: ['inbound-detail', workspace?.slug, slug],
    queryFn: () => getInbound(workspace.slug, slug),
    enabled: !!workspace?.slug && !!slug
  });

  const { data: requests, isLoading: loadingRequests, refetch } = useQuery({
    queryKey: ['inbound-requests', workspace?.slug, slug],
    queryFn: () => getInboundRequests(workspace.slug, slug, { limit: 20 }),
    enabled: !!workspace?.slug && !!slug,
    refetchInterval: 10000
  });

  if (loadingInbound) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  const receiveUrl = `${window.location.origin}/receive/${slug}`;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">{inbound?.data?.name || 'Inbound'}</h1>
          <p className="text-devrelay-text-dim mt-1">Inspector and request history</p>
        </div>
        <StatusBadge status={inbound?.data?.isActive ? 'success' : 'inactive'} label={inbound?.data?.isActive ? 'Active' : 'Inactive'} />
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-devrelay-text-dim mb-2">Webhook URL</h2>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-devrelay-bg px-4 py-3 rounded text-devrelay-green font-mono">{receiveUrl}</code>
          <CopyButton text={receiveUrl} />
        </div>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-devrelay-text-dim mb-2">Signature Header</h3>
            <p className="text-devrelay-text font-mono">{inbound?.data?.signatureHeader || 'X-DevRelay-Signature'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-devrelay-text-dim mb-2">Signature Algorithm</h3>
            <p className="text-devrelay-text">{inbound?.data?.signatureAlgorithm || 'HMAC-SHA256'}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-devrelay-text">Last 20 Requests</h2>
          <button onClick={() => refetch()} className="text-sm text-devrelay-green hover:underline">Refresh</button>
        </div>

        {loadingRequests ? (
          <Spinner />
        ) : (
          <div>
            {requests?.data?.requests?.length === 0 ? (
              <p className="text-devrelay-text-dim text-center py-8">No requests yet</p>
            ) : (
              requests?.data?.requests?.map((req) => (
                <RequestRow key={req._id || req.id} request={req} workspaceSlug={workspace?.slug} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}