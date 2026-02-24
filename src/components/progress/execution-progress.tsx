'use client';

import { useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { JobStatusCard } from './job-status-card';
import { useExecutionProgress } from '@/hooks/use-execution-progress';
import { Button } from '@/components/ui/button';
import { Sparkles, XCircle, SkipForward, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ExecutionProgressProps {
  projectId: string;
  onComplete: () => void;
  onRetryFailed?: (planId: string) => void;
}

export function ExecutionProgress({ projectId, onComplete, onRetryFailed }: ExecutionProgressProps) {
  const { jobs, completedCount, failedCount, totalCount, isComplete, progress } =
    useExecutionProgress(projectId);
  const hasAutoSynthesized = useRef(false);

  const succeededCount = completedCount;
  const hasSucceeded = succeededCount > 0;
  const hasRunning = jobs.some((j) => j.status === 'running' || j.status === 'pending');
  const hasFailed = failedCount > 0;
  const planId = jobs[0]?.plan_id;

  // Auto-synthesize when all jobs complete and at least 1 succeeded
  useEffect(() => {
    if (isComplete && hasSucceeded && !hasAutoSynthesized.current) {
      hasAutoSynthesized.current = true;
      onComplete();
    }
  }, [isComplete, hasSucceeded, onComplete]);

  const handleCancel = async () => {
    try {
      const res = await fetch('/api/execute', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', projectId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Execution cancelled');
    } catch {
      toast.error('Failed to cancel execution');
    }
  };

  const handleSkipAndSynthesize = async () => {
    try {
      const res = await fetch('/api/execute', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip_and_synthesize', projectId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Skipping remaining jobs — starting synthesis');
      // Trigger synthesis after skipping
      onComplete();
    } catch {
      toast.error('Failed to skip');
    }
  };

  const handleMarkFailed = async (jobId: string) => {
    try {
      const res = await fetch('/api/execute', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_job_failed', projectId, jobId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to mark job');
    }
  };

  const handleRetryFailed = () => {
    if (planId && onRetryFailed) {
      onRetryFailed(planId);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            Collecting data... {completedCount}/{totalCount} complete
            {failedCount > 0 && ` (${failedCount} failed)`}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="space-y-2">
        {jobs.map((job) => (
          <JobStatusCard key={job.id} job={job} onMarkFailed={handleMarkFailed} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Cancel — always visible while jobs are running */}
        {hasRunning && (
          <Button variant="destructive" onClick={handleCancel}>
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Execution
          </Button>
        )}

        {/* Skip & Synthesize — visible when ≥1 succeeded and others still running */}
        {hasRunning && hasSucceeded && (
          <Button variant="outline" onClick={handleSkipAndSynthesize}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip & Synthesize ({succeededCount} sources ready)
          </Button>
        )}

        {/* Retry Failed — visible when execution complete with failures */}
        {isComplete && hasFailed && hasSucceeded && onRetryFailed && planId && (
          <Button variant="outline" onClick={handleRetryFailed}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Failed ({failedCount})
          </Button>
        )}

        {/* Manual synthesize fallback — only if complete with successes but auto-synth didn't fire */}
        {isComplete && hasSucceeded && !hasFailed && (
          <Button onClick={onComplete} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            Synthesize Results
          </Button>
        )}
      </div>
    </div>
  );
}
