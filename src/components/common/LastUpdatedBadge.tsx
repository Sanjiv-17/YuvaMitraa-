import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  TimestampInput,
  formatExactDateTime,
  formatLastUpdatedPhrase,
} from '../../utils/relativeTime';

interface LastUpdatedBadgeProps {
  /** Optional subject prefix such as "Resume" or "Profile" */
  label?: string;
  /** ISO string or Firestore timestamp value */
  timestamp?: TimestampInput;
  /** Phrase prefix before relative time (default: "Last updated") */
  prefix?: string;
  /** Fallback text when no timestamp is recorded yet */
  emptyText?: string;
  /** Refresh interval in milliseconds (default: 30000ms = 30s) */
  refreshIntervalMs?: number;
  className?: string;
}

export const LastUpdatedBadge: React.FC<LastUpdatedBadgeProps> = ({
  label,
  timestamp,
  prefix = 'Last updated',
  emptyText = 'Not updated yet',
  refreshIntervalMs = 30000,
  className = '',
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    if (!timestamp) return;

    const tick = () => setNowMs(Date.now());
    const intervalId = setInterval(tick, refreshIntervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [timestamp, refreshIntervalMs]);

  const phrase = formatLastUpdatedPhrase(timestamp, prefix, nowMs);
  const exactTooltip = formatExactDateTime(timestamp);

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 ${className}`}
      title={exactTooltip ? `${label ? `${label} — ` : ''}${exactTooltip}` : undefined}
    >
      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
      <span>
        {label && (
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {label}:{' '}
          </span>
        )}
        <span className={phrase ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 italic'}>
          {phrase || emptyText}
        </span>
      </span>
    </div>
  );
};
