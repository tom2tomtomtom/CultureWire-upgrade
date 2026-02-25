'use client';

import { useEffect, useState, useMemo } from 'react';
import type { ScrapeJob } from '@/lib/types';

export function useExecutionProgress(projectId: string) {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchJobs = async () => {
      try {
        const res = await fetch(`/api/status/${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.jobs) {
          setJobs(data.jobs);
          setIsLoaded(true);
        }
      } catch {
        // Ignore fetch errors
      }
    };

    // Initial fetch
    fetchJobs();

    // Poll every 3s
    const interval = setInterval(fetchJobs, 3000);

    return () => {
      active = false;
      clearInterval(interval);
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
