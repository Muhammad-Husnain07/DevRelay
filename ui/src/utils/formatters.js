import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelative(date) {
  if (!date) return '-';
  const d = new Date(date);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDuration(ms) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatBytes(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncate(str, length = 50) {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + '...';
}