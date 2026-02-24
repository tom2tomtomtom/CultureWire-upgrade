'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ScrapeJob } from '@/lib/types';

export function useExecutionProgress(projectId: string) {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase
      .from('scrape_jobs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at')
      .then(({ data }) => {
        if (data) setJobs(data);
        setIsLoaded(true);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`jobs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scrape_jobs',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs((prev) => [...prev, payload.new as ScrapeJob]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === (payload.new as ScrapeJob).id
                  ? (payload.new as ScrapeJob)
                  : j
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const stats = useMemo(() => {
    const completedCount = jobs.filter((j) => j.status === 'succeeded').length;
    const failedCount = jobs.filter((j) => j.status === 'failed' || j.status === 'timeout').length;
    const runningCount = jobs.filter((j) => j.status === 'running').length;
    const totalCount = jobs.length;
    const isComplete = totalCount > 0 && completedCount + failedCount === totalCount;
    const progress = totalCount > 0 ? ((completedCount + failedCount) / totalCount) * 100 : 0;

    return { completedCount, failedCount, runningCount, totalCount, isComplete, progress };
  }, [jobs]);

  return { jobs, isLoaded, ...stats };
}
