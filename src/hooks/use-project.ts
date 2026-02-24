'use client';

import { useState, useCallback } from 'react';
import type { Project } from '@/lib/types';

export function useProject() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(data.project);
        return data.project as Project;
      }
    } finally {
      setIsLoading(false);
    }
    return null;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // Silently fail — could add toast here
    }
  }, []);

  const createProject = useCallback(async (title: string, description?: string) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    const data = await res.json();
    return data.project as Project;
  }, []);

  return {
    projects,
    currentProject,
    isLoading,
    loadProjects,
    loadProject,
    createProject,
    deleteProject,
    setCurrentProject,
  };
}
