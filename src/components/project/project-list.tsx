'use client';

import { useEffect } from 'react';
import { ProjectCard } from './project-card';
import { CreateProjectDialog } from './create-project-dialog';
import { useProject } from '@/hooks/use-project';
import { Skeleton } from '@/components/ui/skeleton';

export function ProjectList() {
  const { projects, isLoading, loadProjects, deleteProject } = useProject();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Research Projects</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered audience and market research
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No projects yet.</p>
          <p className="text-sm text-muted-foreground">
            Create one to start your research.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDelete={deleteProject} />
          ))}
        </div>
      )}
    </div>
  );
}
