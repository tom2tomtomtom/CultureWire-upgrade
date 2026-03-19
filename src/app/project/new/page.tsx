'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat/chat-interface';
import { Skeleton } from '@/components/ui/skeleton';

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState<string | null>(
    searchParams.get('projectId')
  );
  const [isCreating, setIsCreating] = useState(!projectId);

  useEffect(() => {
    if (projectId) return;

    async function createProject() {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Untitled Research' }),
        });
        if (!res.ok) throw new Error('Failed to create project');
        const data = await res.json();
        setProjectId(data.project.id);
        window.history.replaceState(null, '', `/project/new?projectId=${data.project.id}`);
      } catch {
        router.push('/');
      } finally {
        setIsCreating(false);
      }
    }

    createProject();
  }, [projectId, router]);

  if (isCreating || !projectId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[60vh]" />
      </div>
    );
  }

  return (
    <div>
      <ChatInterface
        projectId={projectId}
        onSpecGenerated={() => {
          router.push(`/project/${projectId}`);
        }}
      />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-[60vh]" />
          </div>
        }
      >
        <NewProjectContent />
      </Suspense>
    </div>
  );
}
