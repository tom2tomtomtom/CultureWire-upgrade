'use client';

import {
  FileText,
  Lightbulb,
  Swords,
  Users,
  Target,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Merge,
  Split,
  ShieldCheck,
  Zap,
  Database,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MarkdownRenderer, splitBySections } from './markdown-renderer';
import type { LucideIcon } from 'lucide-react';

const ICON_KEYWORDS: [string[], LucideIcon][] = [
  [['summary', 'executive', 'verdict'], FileText],
  [['insight', 'finding'], Lightbulb],
  [['competitive', 'position', 'landscape'], Swords],
  [['audience', 'thinks', 'signal'], Users],
  [['recommend', 'action'], Target],
  [['white space', 'opportunity', 'gap'], Sparkles],
  [['watch', 'risk', 'factor'], AlertTriangle],
  [['next', 'step'], ArrowRight],
  [['theme', 'trend'], TrendingUp],
  [['sentiment'], BarChart3],
  [['agree', 'converge'], Merge],
  [['clash', 'contradict'], Split],
  [['confidence', 'reliable'], ShieldCheck],
  [['outlier', 'surprise'], Zap],
  [['data', 'quality'], Database],
];

function getIconForTitle(title: string): LucideIcon {
  const lower = title.toLowerCase();
  for (const [keywords, Icon] of ICON_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return Icon;
    }
  }
  return ChevronRight;
}

interface StrategicSummaryProps {
  content: string;
}

export function StrategicSummary({ content }: StrategicSummaryProps) {
  const sections = splitBySections(content);

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <MarkdownRenderer content={content} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const Icon = getIconForTitle(section.title || 'summary');
        const isExecutive = i === 0;

        return (
          <Card
            key={i}
            className={isExecutive ? 'border-primary/20 bg-primary/5' : ''}
          >
            {section.title && (
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base tracking-tight">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {section.title}
                </CardTitle>
              </CardHeader>
            )}
            <CardContent className={section.title ? 'pt-0' : 'pt-6'}>
              <MarkdownRenderer content={section.body} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
