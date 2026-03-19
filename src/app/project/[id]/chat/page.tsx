'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat/chat-interface';
import { Skeleton } from '@/components/ui/skeleton';
import type { Project } from '@/lib/types';

export default function ProjectChatPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects?id=${projectId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProject(data.project);
      } catch {
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [projectId, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[60vh]" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/project/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">{project.title}</h1>
      </div>
      <ChatInterface
        projectId={projectId}
        onSpecGenerated={() => router.push(`/project/${projectId}`)}
      />
    </div>
  );
}
