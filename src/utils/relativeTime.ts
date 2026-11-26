/**
 * Utility functions for parsing Firestore/ISO timestamps and formatting
 * dynamic relative "Last Updated" dates and times.
 */

export type TimestampInput =
  | string
  | number
  | Date
  | { seconds: number; nanoseconds?: number }
  | { toDate: () => Date }
  | null
  | undefined;

/**
 * Safely converts an ISO string, epoch ms, Date, or Firestore Timestamp-like
 * object into a valid JavaScript Date (or null if empty/invalid).
 */
export function parseTimestampToDate(value: TimestampInput): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'object') {
    if ('toDate' in value && typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    }
    if ('seconds' in value && typeof value.seconds === 'number') {
      const ms = value.seconds * 1000 + Math.floor(((value.nanoseconds || 0) as number) / 1e6);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  return null;
}

/**
 * Normalizes any supported timestamp input into an ISO-8601 string (or '').
 */
export function normalizeTimestampToIso(value: TimestampInput): string {
  const date = parseTimestampToDate(value);
  return date ? date.toISOString() : '';
}

/**
 * Formats a Date as an absolute human-readable date, e.g. "25 Nov 2026".
 */
export function formatActualDate(value: TimestampInput): string | null {
  const date = parseTimestampToDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a Date as a full date & time string for tooltips, e.g. "25 Nov 2026, 04:40 PM".
 */
export function formatExactDateTime(value: TimestampInput): string | null {
  const date = parseTimestampToDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats a timestamp dynamically relative to `nowMs`:
 * - < 60 seconds: "Just now"
 * - 1-59 minutes: "1 minute ago" / "5 minutes ago"
 * - 1-23 hours: "1 hour ago" / "3 hours ago"
 * - 1-7 days: "1 day ago" / "2 days ago" / ... / "7 days ago"
 * - > 7 days: "25 Nov 2026" (actual formatted date)
 */
export function formatRelativeTime(value: TimestampInput, nowMs: number = Date.now()): string | null {
  const date = parseTimestampToDate(value);
  if (!date) return null;

  const diffSeconds = Math.floor((nowMs - date.getTime()) / 1000);

  // Guard against minor client/server clock skew (< 60s in the future still counts as "Just now")
  if (diffSeconds < 60) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  return formatActualDate(date);
}

/**
 * Produces a complete display phrase such as:
 * - "Last updated just now"
 * - "Last updated 5 minutes ago"
 * - "Last updated 2 days ago"
 * - "Last updated 25 Nov 2026"
 */
export function formatLastUpdatedPhrase(
  value: TimestampInput,
  prefix: string = 'Last updated',
  nowMs: number = Date.now()
): string | null {
  const rel = formatRelativeTime(value, nowMs);
  if (!rel) return null;
  const displayRel = rel === 'Just now' ? 'just now' : rel;
  return `${prefix} ${displayRel}`;
}
