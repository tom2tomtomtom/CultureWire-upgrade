'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MarkdownRenderer, splitBySections } from './markdown-renderer';

interface AnalysisSectionProps {
  title: string;
  content: string;
  defaultOpen?: boolean;
  variant?: 'collapsible' | 'cards';
}

export function AnalysisSection({
  title,
  content,
  defaultOpen = false,
  variant = 'collapsible',
}: AnalysisSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (variant === 'cards') {
    const sections = splitBySections(content);

    if (sections.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={content} />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {sections.map((section, i) => (
          <Card key={i}>
            {section.title && (
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base tracking-tight">
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {section.title}
                </CardTitle>
              </CardHeader>
            )}
            <CardContent className={section.title ? 'pt-0' : 'pt-6'}>
              <MarkdownRenderer content={section.body} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-sm font-medium">{title}</h3>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="border-t px-4 pb-4 pt-2">
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  );
}
