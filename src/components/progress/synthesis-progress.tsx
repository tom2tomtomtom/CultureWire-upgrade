'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Loader2,
  Circle,
  MessageSquare,
  Star,
  Youtube,
  Music,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ScrapeJob } from '@/lib/types';

interface AnalysisStep {
  pass_type: string;
  source_platform: string | null;
}

interface SynthesisProgressProps {
  projectId: string;
}

const PASS_ORDER = ['per_source', 'cross_source', 'strategic_narrative', 'creative_routes'] as const;
const PASS_LABELS: Record<string, string> = {
  per_source: 'Analyzing individual sources',
  cross_source: 'Cross-source pattern analysis',
  strategic_narrative: 'Generating strategic narrative',
  creative_routes: 'Generating creative routes',
};

const PASS_WEIGHTS = { per_source: 50, cross_source: 20, strategic_narrative: 15, creative_routes: 15 };

const platformIcons: Record<string, React.ElementType> = {
  reddit: MessageSquare,
  trustpilot: Star,
  youtube: Youtube,
  tiktok: Music,
  google_trends: TrendingUp,
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function platformLabel(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getStatusMessage(
  currentPass: string | null,
  elapsedSeconds: number,
  currentPlatform: string | null
): string {
  const name = currentPlatform ? platformLabel(currentPlatform) : 'sources';

  if (currentPass === 'per_source') {
    if (elapsedSeconds < 60) return `Starting analysis of ${name}...`;
    if (elapsedSeconds < 180) return `Analyzing ${name} data — typically takes 1-3 minutes per source`;
    if (elapsedSeconds < 360) return `Still analyzing ${name} — large datasets take longer`;
    return `${name} analysis is taking a while — almost there`;
  }
  if (currentPass === 'cross_source') {
    if (elapsedSeconds < 120) return 'Finding patterns across all sources';
    return 'Cross-referencing themes — complex data takes longer';
  }
  if (currentPass === 'strategic_narrative') {
    return 'Crafting the strategic narrative';
  }
  if (currentPass === 'creative_routes') {
    return 'Generating creative routes and opportunities';
  }
  return 'Analyzing collected data across all sources';
}

export function SynthesisProgress({ projectId }: SynthesisProgressProps) {
  const [completedPasses, setCompletedPasses] = useState<AnalysisStep[]>([]);
  const [currentPass, setCurrentPass] = useState<string | null>(null);
  const [expectedPlatforms, setExpectedPlatforms] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const deriveExpectedPlatforms = useCallback((jobs: ScrapeJob[]) => {
    // Map display names to the source_platform values used in scrape_results/analysis_results
    const displayToSource: Record<string, string> = {
      reddit_scraper: 'reddit',
      youtube_search: 'youtube',
      instagram: 'instagram',
      trustpilot_reviews: 'trustpilot',
      google_trends: 'google_trends',
      tiktok: 'tiktok',
    };
    const platforms = [
      ...new Set(
        jobs
          .filter((j) => j.status === 'succeeded')
          .map((j) => {
            const key = j.actor_display_name.toLowerCase().replace(/\s+/g, '_');
            return displayToSource[key] || key;
          })
      ),
    ];
    return platforms;
  }, []);

  // Polling
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

        // Set start time from project.updated_at (synthesis start)
        if (data.project?.updated_at && !startTimeRef.current) {
          startTimeRef.current = new Date(data.project.updated_at).getTime();
        }

        // Derive expected platforms from succeeded jobs
        if (data.jobs) {
          setExpectedPlatforms(deriveExpectedPlatforms(data.jobs));
        }

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
  }, [projectId, deriveExpectedPlatforms]);

  // Elapsed timer (1s tick)
  useEffect(() => {
    // Use component mount as fallback if no server timestamp yet
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const tick = () => {
      if (startTimeRef.current) {
        setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute progress
  const completedTypes = new Set(completedPasses.map((r) => r.pass_type));
  const completedPerSource = completedPasses
    .filter((r) => r.pass_type === 'per_source')
    .map((r) => r.source_platform)
    .filter(Boolean) as string[];
  const completedPerSourceSet = new Set(completedPerSource);

  let progressPercent = 0;

  // Pass 1: per_source (0-60%), subdivided per platform
  if (completedTypes.has('per_source')) {
    progressPercent += PASS_WEIGHTS.per_source;
  } else if (expectedPlatforms.length > 0) {
    const done = completedPerSource.length;
    progressPercent += (done / expectedPlatforms.length) * PASS_WEIGHTS.per_source;
  }

  // Pass 2: cross_source (60-85%)
  if (completedTypes.has('cross_source')) {
    progressPercent += PASS_WEIGHTS.cross_source;
  }

  // Pass 3: strategic_narrative (85-100%)
  if (completedTypes.has('strategic_narrative')) {
    progressPercent += PASS_WEIGHTS.strategic_narrative;
  }

  // Current platform being processed
  const currentPlatform =
    currentPass === 'per_source'
      ? expectedPlatforms.find((p) => !completedPerSourceSet.has(p)) || null
      : null;

  const statusMessage = getStatusMessage(currentPass, elapsed, currentPlatform);

  return (
    <div className="space-y-6 py-8">
      {/* Header with title + elapsed */}
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Synthesizing Research</h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="tabular-nums">{formatElapsed(elapsed)}</span>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{statusMessage}</p>
      </div>

      {/* Progress bar */}
      <div className="mx-auto max-w-md space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} />
      </div>

      {/* Steps list */}
      <div className="mx-auto max-w-md space-y-3">
        {PASS_ORDER.map((pass) => {
          const isDone = completedTypes.has(pass);
          const isCurrent = currentPass === pass;
          const showPlatformDetails = pass === 'per_source' && (isCurrent || isDone);

          return (
            <div key={pass} className="space-y-2">
              <div className="flex items-start gap-3">
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                ) : isCurrent ? (
                  <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-500" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
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
                    {pass === 'per_source' && expectedPlatforms.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({completedPerSource.length} of {expectedPlatforms.length} sources)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Platform sub-items for per_source pass */}
              {showPlatformDetails && expectedPlatforms.length > 0 && (
                <div className="ml-8 space-y-1.5">
                  {expectedPlatforms.map((platform) => {
                    const platformDone = completedPerSourceSet.has(platform);
                    const platformCurrent = currentPlatform === platform;
                    const Icon = platformIcons[platform] || TrendingUp;

                    return (
                      <div key={platform} className="flex items-center gap-2.5">
                        {platformDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                        ) : platformCurrent ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                        )}
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted">
                          <Icon className="h-3 w-3" />
                        </div>
                        <span
                          className={cn(
                            'text-xs',
                            platformDone && 'text-green-600 dark:text-green-400',
                            platformCurrent && 'text-foreground font-medium',
                            !platformDone && !platformCurrent && 'text-muted-foreground/50'
                          )}
                        >
                          {platformLabel(platform)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
