'use client';

import { formatCostCents } from '@/lib/cost';
import type { PlannedActorRun } from '@/lib/types';

interface CostEstimateProps {
  runs: PlannedActorRun[];
}

export function CostEstimate({ runs }: CostEstimateProps) {
  const total = runs.reduce((sum, r) => sum + r.estimatedCostCents, 0);

  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-2 text-sm font-medium">Estimated Cost</h4>
      <div className="space-y-1 text-sm">
        {runs.map((run, i) => (
          <div key={i} className="flex justify-between text-muted-foreground">
            <span>{run.displayName}</span>
            <span>{formatCostCents(run.estimatedCostCents)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-1 font-medium">
          <span>Total</span>
          <span>{formatCostCents(total)}</span>
        </div>
      </div>
    </div>
  );
}
