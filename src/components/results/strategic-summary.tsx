'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface StrategicSummaryProps {
  content: string;
}

export function StrategicSummary({ content }: StrategicSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Strategic Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
