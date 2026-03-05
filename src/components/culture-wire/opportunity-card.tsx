'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ScoredOpportunity } from '@/lib/types';

const tierStyles = {
  GOLD: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  SILVER: 'bg-zinc-300/10 text-zinc-500 border-zinc-400/30',
  BRONZE: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
};

const rtpStyles = {
  GREEN: 'bg-green-500/10 text-green-600',
  YELLOW: 'bg-amber-500/10 text-amber-600',
  RED: 'bg-red-500/10 text-red-600',
};

interface OpportunityCardProps {
  opportunity: ScoredOpportunity;
  rank: number;
}

export function OpportunityCard({ opportunity, rank }: OpportunityCardProps) {
  const { title, description, tier, score, components, right_to_play, evidence, platform, layer } = opportunity;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
              {rank}
            </span>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={tierStyles[tier]}>{tier}</Badge>
            <Badge className={rtpStyles[right_to_play]}>{right_to_play}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono text-lg font-bold text-foreground">{score}</span>
          <Badge variant="outline" className="text-[10px]">{platform}</Badge>
          <Badge variant="outline" className="text-[10px]">{layer}</Badge>
        </div>

        <div className="space-y-1.5">
          {Object.entries(components).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-28 text-xs capitalize text-muted-foreground">
                {key.replace('_', ' ')}
              </span>
              <Progress value={value} className="h-1.5 flex-1" />
              <span className="w-8 text-right text-xs">{value}</span>
            </div>
          ))}
        </div>

        {evidence.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Evidence</p>
            <ul className="space-y-0.5">
              {evidence.map((e, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  &bull; {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
