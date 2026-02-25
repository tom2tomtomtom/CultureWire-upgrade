'use client';

import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ActorRunItem } from './actor-run-item';
import { CostEstimate } from './cost-estimate';
import type { ExecutionPlan } from '@/lib/types';
import { toast } from 'sonner';

interface ExecutionPlanCardProps {
  plan: ExecutionPlan;
  onApprove: () => Promise<void> | void;
  onRevise: () => void;
}

export function ExecutionPlanCard({ plan, onApprove, onRevise }: ExecutionPlanCardProps) {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch('/api/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, action: 'approve' }),
      });

      if (!res.ok) throw new Error('Failed to approve plan');

      toast.success('Plan approved! Starting execution...');
      await onApprove();
    } catch {
      toast.error('Failed to approve plan');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Research Plan</CardTitle>
        <CardDescription>
          {plan.plan_data.length} data sources will be scraped in parallel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {plan.plan_data.map((run, i) => (
            <ActorRunItem key={i} run={run} />
          ))}
        </div>
        <CostEstimate runs={plan.plan_data} />
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={handleApprove} disabled={isApproving}>
          <Play className="mr-2 h-4 w-4" />
          {isApproving ? 'Approving...' : 'Approve & Execute'}
        </Button>
        <Button variant="outline" onClick={onRevise}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Revise
        </Button>
      </CardFooter>
    </Card>
  );
}
