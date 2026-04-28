import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Zap, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight, RefreshCw, ArrowRight, Globe, Play, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { listEvents, dispatchEvent } from '../../api/resources/events';
import { formatRelative, formatDateTime } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import SlideOver from '../../components/ui/SlideOver';
import toast from 'react-hot-toast';

const EVENT_PRESETS = [
  { label: 'Test Event', type: 'test.event', payload: { message: 'Hello from DevRelay!' } },
  { label: 'User Signup', type: 'user.signup', payload: { userId: '123', email: 'user@example.com' } },
  { label: 'Payment', type: 'payment.success', payload: { amount: 99.99, currency: 'USD', orderId: 'ORD-001' } },
  { label: 'Custom', type: '', payload: {} },
];

function EventRow({ event, onClick }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-devrelay-border rounded mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-devrelay-surface2 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-devrelay-text-dim" /> : <ChevronRight className="w-4 h-4 text-devrelay-text-dim" />}
          <span className="text-sm text-devrelay-text">{formatDateTime(event.createdAt)}</span>
          <span className="px-2 py-0.5 bg-devrelay-purple/20 text-devrelay-purple text-xs rounded font-mono">{event.type}</span>
          <span className="text-sm text-devrelay-text-dim">{event.deliveryCount || 0} deliveries</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge 
            status={event.deliveryCount > 0 ? 'success' : 'warning'} 
            label={event.deliveryCount > 0 ? 'Dispatched' : 'Pending'} 
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-devrelay-border p-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-devrelay-text mb-2">Payload</h4>
            <div className="bg-devrelay-bg rounded p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs font-mono text-devrelay-text whitespace-pre-wrap">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </div>

          {event.source && (
            <div className="text-sm text-devrelay-text-dim">
              Source: <span className="font-mono">{event.source}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DispatchEventForm({ form, setForm, onSubmit, isPending, onClose }) {
  const handlePreset = (preset) => {
    if (preset.type) {
      setForm({
        ...form,
        type: preset.type,
        payload: JSON.stringify(preset.payload, null, 2)
      });
    }
  };

  const handlePayloadChange = (value) => {
    setForm({ ...form, payload: value });
  };

  return (
    <div className="space-y-6">
      <div className="bg-devrelay-surface2 rounded-xl p-5 border border-devrelay-border">
        <h3 className="text-sm font-semibold text-devrelay-text mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-devrelay-purple" />
          Event Details
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Event Type *</label>
            <input
              type="text"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-purple"
              placeholder="e.g., user.signup, payment.success"
            />
            <p className="text-xs text-devrelay-text-dim mt-1">A dot-separated event name</p>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className="px-3 py-1.5 text-xs bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text-dim hover:border-devrelay-purple/50 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-devrelay-text-dim mb-2">Payload (JSON)</label>
            <textarea
              value={form.payload}
              onChange={(e) => handlePayloadChange(e.target.value)}
              className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg px-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-purple font-mono text-sm h-40"
              placeholder='{ "key": "value" }'
            />
            <p className="text-xs text-devrelay-text-dim mt-1">The data to send to your webhook endpoints</p>
          </div>
        </div>
      </div>

      <div className="bg-devrelay-amber/10 border border-devrelay-amber/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-devrelay-amber mt-0.5" />
          <div>
            <p className="text-sm text-devrelay-text">This event will be delivered to all webhook endpoints that match:</p>
            <ul className="text-xs text-devrelay-text-dim mt-2 space-y-1">
              <li>• The exact event type (e.g., <code className="font-mono">user.signup</code>)</li>
              <li>• Or endpoints subscribed to <code className="font-mono">*</code> (all events)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 px-4 rounded-lg border border-devrelay-border text-devrelay-text hover:bg-devrelay-surface2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending || !form.type}
          className="flex-1 py-3 px-4 rounded-lg bg-devrelay-purple text-white font-medium hover:bg-devrelay-purple-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Dispatching...' : 'Dispatch Event'}
        </button>
      </div>
    </div>
  );
}

export default function EventsList() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const [form, setForm] = useState({
    type: '',
    payload: '{\n  \n}'
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['events', workspace?.slug],
    queryFn: () => workspace?.slug ? listEvents(workspace.slug) : Promise.resolve({ data: [] }),
    enabled: !!workspace?.slug
  });

  const dispatchMutation = useMutation({
    mutationFn: (data) => {
      let payload;
      try {
        payload = JSON.parse(data.payload);
      } catch {
        payload = {};
      }
      return dispatchEvent(workspace.slug, { type: data.type, payload });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['events']);
      setDispatchOpen(false);
      setForm({ type: '', payload: '{\n  \n}' });
      toast.success(`Event dispatched! ${res.data.deliveriesQueued} deliveries queued`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to dispatch event')
  });

  const filtered = data?.data?.events?.filter(e => 
    !search || e.type.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleDispatch = () => {
    dispatchMutation.mutate(form);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-devrelay-text">Events</h1>
          <p className="text-devrelay-text-dim mt-1">Dispatch events to trigger webhook deliveries</p>
        </div>
        <button
          onClick={() => setDispatchOpen(true)}
          className="flex items-center gap-2 bg-devrelay-purple text-white font-medium px-4 py-2.5 rounded-lg hover:bg-devrelay-purple-dim transition-colors"
        >
          <Zap className="w-5 h-5" />
          Dispatch Event
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-devrelay-text-dim" />
          <input
            type="text"
            placeholder="Search events by type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-devrelay-surface border border-devrelay-border rounded-lg pl-10 pr-4 py-2.5 text-devrelay-text focus:outline-none focus:border-devrelay-purple"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="p-2.5 bg-devrelay-surface border border-devrelay-border rounded-lg text-devrelay-text-dim hover:text-devrelay-purple transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-devrelay-surface border border-devrelay-border rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-devrelay-text mb-4">How Webhooks Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-devrelay-bg rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-devrelay-purple/20 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-devrelay-purple" />
              </div>
              <h3 className="font-medium text-devrelay-text">1. Create Endpoint</h3>
            </div>
            <p className="text-sm text-devrelay-text-dim">Go to Webhooks and create an endpoint URL that should receive events</p>
          </div>
          <div className="bg-devrelay-bg rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-devrelay-green/20 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-devrelay-green" />
              </div>
              <h3 className="font-medium text-devrelay-text">2. Subscribe to Events</h3>
            </div>
            <p className="text-sm text-devrelay-text-dim">Configure which events your endpoint should receive (e.g., user.*, payment.success)</p>
          </div>
          <div className="bg-devrelay-bg rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-devrelay-blue/20 rounded-lg flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-devrelay-blue" />
              </div>
              <h3 className="font-medium text-devrelay-text">3. Dispatch Events</h3>
            </div>
            <p className="text-sm text-devrelay-text-dim">Use this page to dispatch events and see them delivered to your endpoints</p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          title="No events yet" 
          description="Dispatch your first event to test webhook deliveries"
          action={<button onClick={() => setDispatchOpen(true)} className="mt-4 px-4 py-2 bg-devrelay-purple text-white rounded-lg hover:bg-devrelay-purple-dim">Dispatch Event</button>}
        />
      ) : (
        <div>
          {filtered.map((event) => (
            <EventRow key={event._id || event.id} event={event} />
          ))}
        </div>
      )}

      <SlideOver open={dispatchOpen} onClose={() => setDispatchOpen(false)} title="Dispatch Event">
        <DispatchEventForm
          form={form}
          setForm={setForm}
          onSubmit={handleDispatch}
          isPending={dispatchMutation.isPending}
          onClose={() => setDispatchOpen(false)}
        />
      </SlideOver>
    </div>
  );
}
