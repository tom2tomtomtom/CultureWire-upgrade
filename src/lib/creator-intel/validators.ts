import { z } from 'zod';

export const AnalyzeRequestSchema = z.object({
  type: z.enum(['url', 'topic']),
  input: z.string().min(1).max(500),
  region: z.string().length(2).default('AU'),
});

export const SimilarRequestSchema = z.object({
  depth: z.enum(['quick', 'deep']).default('quick'),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type SimilarRequest = z.infer<typeof SimilarRequestSchema>;

const TIKTOK_URL_PATTERN = /tiktok\.com\/@([\w.]+)\/video\/(\d+)/;

export function parseTikTokUrl(url: string): { username: string; awemeId: string } | null {
  const match = url.match(TIKTOK_URL_PATTERN);
  if (!match) return null;
  return { username: match[1], awemeId: match[2] };
}
