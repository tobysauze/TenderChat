// Format a profiles.last_seen ISO timestamp into a short status string.
// Returns null when we should hide the indicator entirely (no value, or
// stale > 7 days — yachties are often at sea and shouldn't feel watched).
export function formatLastSeen(iso?: string | null): string | null {
  if (!iso) return null;
  const last = new Date(iso).getTime();
  if (Number.isNaN(last)) return null;

  const diffMs = Date.now() - last;
  if (diffMs < 0) return 'Online';

  const min = Math.floor(diffMs / 60_000);
  if (min < 2) return 'Online';
  if (min < 60) return `Active ${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `Active ${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day === 1) return 'Active yesterday';
  if (day < 7) return `Active ${day}d ago`;
  return null;
}

export function isOnline(iso?: string | null): boolean {
  if (!iso) return false;
  const last = new Date(iso).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last < 2 * 60_000;
}
