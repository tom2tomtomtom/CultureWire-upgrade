'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { ExecutionPlanCard } from '@/components/plan/execution-plan-card';
import { ExecutionProgress } from '@/components/progress/execution-progress';
import { SynthesisProgress } from '@/components/progress/synthesis-progress';
import { ResultsDashboard } from '@/components/results/results-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Project, ExecutionPlan } from '@/lib/types';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const isSynthesizing = useRef(false);

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?id=${projectId}`);
      if (!res.ok) throw new Error('Project not found');
      const data = await res.json();
      setProject(data.project);
      return data.project as Project;
    } catch {
      router.push('/');
      return null;
    }
  }, [projectId, router]);

  const loadPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/plan?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.plan) setPlan(data.plan);
      }
    } catch {
      // No plan yet — that's fine
    }
  }, [projectId]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const p = await loadProject();
      if (p && (p.status === 'planning' || p.status === 'draft')) {
        await loadPlan();
      }
      setIsLoading(false);
    }
    init();
  }, [loadProject, loadPlan]);

  // Realtime subscription on projects table
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as Project;
          setProject(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Polling fallback during executing/synthesizing (every 10s)
  useEffect(() => {
    if (!project) return;
    if (project.status !== 'executing' && project.status !== 'synthesizing') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.project) {
          setProject(data.project);
        }
      } catch {
        // Ignore polling errors
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [project?.status, projectId]);

  const handleSpecGenerated = async () => {
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Failed to generate plan');
      const data = await res.json();
      setPlan(data.plan);
      await loadProject();
    } catch {
      toast.error('Failed to generate research plan');
    }
  };

  const handlePlanApproved = async () => {
    if (!plan) return;
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, planId: plan.id }),
      });
      if (!res.ok) throw new Error('Failed to start execution');
      await loadProject();
    } catch {
      toast.error('Failed to start execution');
    }
  };

  const handleExecutionComplete = async () => {
    if (isSynthesizing.current) return;
    isSynthesizing.current = true;
    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Synthesis failed to start');
      // POST returns immediately — polling + realtime handles the rest
    } catch {
      toast.error('Synthesis failed to start');
      isSynthesizing.current = false;
    }
  };

  const handleRetrySynthesis = async () => {
    setIsRetrying(true);
    isSynthesizing.current = false;
    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Synthesis failed to start');
      await loadProject();
    } catch {
      toast.error('Synthesis failed to start');
      setIsRetrying(false);
    }
  };

  const handleRetryFailed = async (planId: string) => {
    try {
      const res = await fetch('/api/execute', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_failed', projectId, planId }),
      });
      if (!res.ok) throw new Error('Retry failed');
      toast.success('Retrying failed jobs...');
      await loadProject();
    } catch {
      toast.error('Failed to retry');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[60vh]" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Research Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate">{project.title}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      {/* Draft: show chat */}
      {project.status === 'draft' && (
        <ChatInterface projectId={projectId} onSpecGenerated={handleSpecGenerated} />
      )}

      {/* Planning: show plan for review */}
      {project.status === 'planning' && plan && (
        <ExecutionPlanCard
          plan={plan}
          onApprove={handlePlanApproved}
          onRevise={() => router.push(`/project/${projectId}/chat`)}
        />
      )}

      {/* Planning but no plan yet: show chat to continue */}
      {project.status === 'planning' && !plan && (
        <ChatInterface projectId={projectId} onSpecGenerated={handleSpecGenerated} />
      )}

      {/* Executing: show live progress */}
      {project.status === 'executing' && (
        <ExecutionProgress
          projectId={projectId}
          onComplete={handleExecutionComplete}
          onRetryFailed={handleRetryFailed}
        />
      )}

      {/* Synthesizing: show synthesis progress */}
      {project.status === 'synthesizing' && (
        <SynthesisProgress projectId={projectId} />
      )}

      {/* Complete: show results dashboard */}
      {project.status === 'complete' && (
        <ResultsDashboard projectId={projectId} />
      )}

      {/* Failed: show error with retry */}
      {project.status === 'failed' && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center space-y-4">
          <p className="font-medium text-destructive">Something went wrong.</p>
          <p className="text-sm text-muted-foreground">
            You can retry or start a new research project.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={handleRetrySynthesis} disabled={isRetrying}>
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Retry Synthesis'
              )}
            </Button>
            {plan && (
              <Button variant="outline" onClick={() => handleRetryFailed(plan.id)}>
                Retry Failed Jobs
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
