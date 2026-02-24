'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  MessageSquare,
  Star,
  Youtube,
  Music,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ScrapeJob } from '@/lib/types';

const platformIcons: Record<string, React.ElementType> = {
  reddit: MessageSquare,
  trustpilot: Star,
  youtube: Youtube,
  tiktok: Music,
  google_trends: TrendingUp,
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
  succeeded: { icon: CheckCircle2, color: 'text-green-500', label: 'Complete' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Failed' },
  timeout: { icon: XCircle, color: 'text-orange-500', label: 'Timed Out' },
};

const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

interface JobStatusCardProps {
  job: ScrapeJob;
  onMarkFailed?: (jobId: string) => void;
}

export function JobStatusCard({ job, onMarkFailed }: JobStatusCardProps) {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const status = statusConfig[job.status];
  const StatusIcon = status.icon;
  const platformKey = job.actor_display_name.toLowerCase().replace(/\s+/g, '_');
  const PlatformIcon = platformIcons[platformKey] || TrendingUp;

  // Live elapsed timer for running jobs
  useEffect(() => {
    if (job.status !== 'running' || !job.started_at) {
      // For completed jobs, show final elapsed
      if (job.started_at && job.completed_at) {
        setElapsed(
          Math.round(
            (new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000
          )
        );
      }
      return;
    }

    const startTime = new Date(job.started_at).getTime();
    const tick = () => setElapsed(Math.round((Date.now() - startTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [job.status, job.started_at, job.completed_at]);

  const isStuck = job.status === 'running' && elapsed !== null && elapsed * 1000 >= STUCK_THRESHOLD_MS;

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        isStuck && 'border-orange-400 bg-orange-50 dark:bg-orange-950/20'
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <PlatformIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-medium">{job.actor_display_name}</h4>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {job.result_count > 0 && <span>{job.result_count} results</span>}
          {elapsed !== null && <span>{formatElapsed(elapsed)}</span>}
          {job.error_message && (
            <span className="truncate text-destructive">{job.error_message}</span>
          )}
        </div>
        {isStuck && (
          <div className="mt-1 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-orange-500" />
            <span className="text-xs text-orange-600 dark:text-orange-400">
              Taking longer than expected
            </span>
            {onMarkFailed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => onMarkFailed(job.id)}
              >
                Mark Failed
              </Button>
            )}
          </div>
        )}
      </div>
      <StatusIcon
        className={cn(
          'h-5 w-5 shrink-0',
          status.color,
          job.status === 'running' && 'animate-spin'
        )}
      />
    </div>
  );
}
