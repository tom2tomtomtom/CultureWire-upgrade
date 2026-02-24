'use client';

import {
  MessageSquare,
  Star,
  Youtube,
  Music,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCostCents } from '@/lib/cost';
import type { PlannedActorRun } from '@/lib/types';

const platformIcons: Record<string, React.ElementType> = {
  reddit: MessageSquare,
  trustpilot: Star,
  youtube: Youtube,
  tiktok: Music,
  google_trends: TrendingUp,
};

interface ActorRunItemProps {
  run: PlannedActorRun;
}

export function ActorRunItem({ run }: ActorRunItemProps) {
  const Icon = platformIcons[run.platform] || TrendingUp;

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{run.displayName}</h4>
          <Badge variant="secondary" className="text-xs">
            ~{run.estimatedResults} results
          </Badge>
          <Badge variant="outline" className="text-xs">
            {formatCostCents(run.estimatedCostCents)}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{run.rationale}</p>
      </div>
    </div>
  );
}
