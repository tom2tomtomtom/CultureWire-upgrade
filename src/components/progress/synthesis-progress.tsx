'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AnalysisStep {
  pass_type: string;
  source_platform: string | null;
}

interface SynthesisProgressProps {
  projectId: string;
}

const PASS_ORDER = ['per_source', 'cross_source', 'strategic_narrative'] as const;
const PASS_LABELS: Record<string, string> = {
  per_source: 'Analyzing individual sources',
  cross_source: 'Cross-source pattern analysis',
  strategic_narrative: 'Generating strategic narrative',
};

export function SynthesisProgress({ projectId }: SynthesisProgressProps) {
  const [completedPasses, setCompletedPasses] = useState<AnalysisStep[]>([]);
  const [currentPass, setCurrentPass] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${projectId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (!active) return;

        const results: AnalysisStep[] = data.analysis_results || [];
        setCompletedPasses(results);

        // Determine current pass
        const completedTypes = new Set(results.map((r: AnalysisStep) => r.pass_type));
        const next = PASS_ORDER.find((p) => !completedTypes.has(p));
        setCurrentPass(next || null);
      } catch {
        // Ignore polling errors
      }
    };

    poll();
    const interval = setInterval(poll, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [projectId]);

  const completedTypes = new Set(completedPasses.map((r) => r.pass_type));
  const completedSteps = PASS_ORDER.filter((p) => completedTypes.has(p)).length;
  const progressPercent = (completedSteps / PASS_ORDER.length) * 100;

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Synthesizing Research</h3>
        <p className="text-sm text-muted-foreground">
          Analyzing collected data across all sources
        </p>
      </div>

      <div className="mx-auto max-w-md space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} />
      </div>

      <div className="mx-auto max-w-md space-y-3">
        {PASS_ORDER.map((pass) => {
          const isDone = completedTypes.has(pass);
          const isCurrent = currentPass === pass;
          const perSourceDetails =
            pass === 'per_source'
              ? completedPasses
                  .filter((r) => r.pass_type === 'per_source')
                  .map((r) => r.source_platform)
                  .filter(Boolean)
              : [];

          return (
            <div key={pass} className="flex items-start gap-3">
              {isDone ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
              ) : isCurrent ? (
                <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-500" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
              )}
              <div>
                <p
                  className={cn(
                    'text-sm font-medium',
                    isDone && 'text-green-600 dark:text-green-400',
                    isCurrent && 'text-foreground',
                    !isDone && !isCurrent && 'text-muted-foreground/60'
                  )}
                >
                  {PASS_LABELS[pass]}
                </p>
                {pass === 'per_source' && perSourceDetails.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Completed: {perSourceDetails.join(', ')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
