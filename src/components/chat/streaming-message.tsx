'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { stripSpecBlock } from './strip-spec-block';

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  if (!content) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg bg-muted px-4 py-3">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripSpecBlock(content)}</ReactMarkdown>
          <span className="inline-block h-4 w-1.5 animate-pulse bg-foreground/60" />
        </div>
      </div>
    </div>
  );
}
