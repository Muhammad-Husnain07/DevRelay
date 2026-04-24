const statusColors = {
  success: 'bg-devrelay-green/20 text-devrelay-green',
  completed: 'bg-devrelay-green/20 text-devrelay-green',
  healthy: 'bg-devrelay-green/20 text-devrelay-green',
  failed: 'bg-devrelay-red/20 text-devrelay-red',
  error: 'bg-devrelay-red/20 text-devrelay-red',
  retrying: 'bg-devrelay-amber/20 text-devrelay-amber',
  pending: 'bg-devrelay-amber/20 text-devrelay-amber',
  waiting: 'bg-devrelay-amber/20 text-devrelay-amber',
  active: 'bg-devrelay-blue/20 text-devrelay-blue',
  inactive: 'bg-devrelay-border text-devrelay-text-dim',
  disabled: 'bg-devrelay-border text-devrelay-text-dim',
  partial: 'bg-devrelay-amber/20 text-devrelay-amber',
  failing: 'bg-devrelay-red/20 text-devrelay-red'
};

export default function StatusBadge({ status, label }) {
  const colorClass = statusColors[status?.toLowerCase()] || 'bg-devrelay-border text-devrelay-text-dim';
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {label || status}
    </span>
  );
}