'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Quote } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Components } from 'react-markdown';

const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-base font-semibold tracking-tight border-t border-border/50 pt-6 first:mt-0 first:border-0 first:pt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-2 text-sm font-semibold">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <div className="rounded-lg border-l-4 border-primary/40 bg-muted/40 px-4 py-3 my-3">
      <div className="flex gap-2">
        <Quote className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="text-sm italic text-muted-foreground [&>p]:my-0">
          {children}
        </div>
      </div>
    </div>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <Separator className="my-8" />,
  ul: ({ children }) => (
    <ul className="my-2 ml-4 space-y-1.5 list-disc">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 space-y-1.5 list-decimal">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-muted-foreground">{children}</li>
  ),
  p: ({ children }) => (
    <p className="my-2.5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  ),
};

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

export interface MarkdownSection {
  title: string;
  body: string;
}

export function splitBySections(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: MarkdownSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      if (currentTitle || currentLines.length > 0) {
        const body = currentLines.join('\n').trim();
        if (body) {
          sections.push({ title: currentTitle, body });
        }
      }
      currentTitle = match[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push final section
  if (currentTitle || currentLines.length > 0) {
    const body = currentLines.join('\n').trim();
    if (body) {
      sections.push({ title: currentTitle, body });
    }
  }

  return sections;
}
