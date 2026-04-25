import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Search, Active } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listInbound } from '../../api/resources/events';
import { formatRelative, truncate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import CopyButton from '../../components/ui/CopyButton';

export default function InboundList() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inbound', workspace?.slug],
    queryFn: () => workspace?.slug ? listInbound(workspace.slug) : Promise.resolve({ data: [] }),
    enabled: !!workspace?.slug
  });

  const filtered = data?.data?.inbound?.filter(e => 
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.slug.includes(search)
  ) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  const receiveUrl = (slug) => `${window.location.origin}/receive/${slug}`;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Inbound Webhooks</h1>
          <p className="text-devrelay-text-dim mt-1">Receive webhooks from external services</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-devrelay-text-dim" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-devrelay-surface2 border border-devrelay-border rounded pl-10 pr-4 py-2 text-devrelay-text focus:outline-none focus:border-devrelay-green"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No inbound webhooks"
          description="Create an inbound webhook to receive events from external services"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((inbound) => (
            <div
              key={inbound._id || inbound.id}
              onClick={() => navigate(`/inbound/${inbound.slug}`)}
              className="bg-devrelay-surface border border-devrelay-border rounded-lg p-6 cursor-pointer hover:border-devrelay-green/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-medium text-devrelay-text">{inbound.name}</h3>
                <StatusBadge status={inbound.isActive ? 'success' : 'inactive'} label={inbound.isActive ? 'Active' : 'Inactive'} />
              </div>

              <div className="bg-devrelay-bg rounded px-3 py-2 mb-4">
                <code className="text-sm text-devrelay-green font-mono">
                  {truncate(receiveUrl(inbound.slug), 30)}
                </code>
              </div>

              <CopyButton text={receiveUrl(inbound.slug)} />

              <div className="mt-4 flex items-center justify-between text-sm text-devrelay-text-dim">
                <span>{inbound.requestCount || 0} requests</span>
                <span>{inbound.lastRequestAt ? formatRelative(inbound.lastRequestAt) : 'never'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}