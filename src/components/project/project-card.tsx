'use client';

import Link from 'next/link';
import { Clock, CheckCircle2, Loader2, AlertCircle, MoreVertical, Trash2 } from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/types';

const statusConfig: Record<string, { icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { icon: Clock, variant: 'secondary' },
  planning: { icon: Clock, variant: 'outline' },
  executing: { icon: Loader2, variant: 'default' },
  synthesizing: { icon: Loader2, variant: 'default' },
  complete: { icon: CheckCircle2, variant: 'secondary' },
  failed: { icon: AlertCircle, variant: 'destructive' },
};

interface ProjectCardProps {
  project: Project;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const status = statusConfig[project.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Delete "${project.title}"? This cannot be undone.`)) {
      onDelete?.(project.id);
    }
  };

  return (
    <Link href={`/project/${project.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{project.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className="flex items-center gap-1">
                <StatusIcon className={`h-3 w-3 ${project.status === 'executing' || project.status === 'synthesizing' ? 'animate-spin' : ''}`} />
                {project.status}
              </Badge>
              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <CardDescription>
            {project.description || 'No description'}
          </CardDescription>
          <p className="text-xs text-muted-foreground">
            {new Date(project.updated_at).toLocaleDateString()}
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}
