import { format, formatDistanceToNow, formatDistance } from 'date-fns';

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

export function formatRelativeUpdating(initialDate) {
  if (!initialDate) return '-';
  const d = new Date(initialDate);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDuration(ms) {
  if (!ms && ms !== 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
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

export function truncateJson(obj, maxLen = 60) {
  if (!obj) return '-';
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

export function formatJson(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') {
    try { return JSON.stringify(JSON.parse(obj), null, 2); } 
    catch { return obj; }
  }
  return JSON.stringify(obj, null, 2);
}

export function formatCountdown(date) {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diff = d - now;
  
  if (diff < 0) return 'Now';
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function validateCron(expression) {
  return fetch('/api/v1/scheduler/validate-cron', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression })
  }).then(res => res.json());
}